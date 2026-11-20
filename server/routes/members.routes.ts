import { Router } from 'express';
import type { SQLInputValue } from 'node:sqlite';
import { canAccessChurch, requireAuth, resolveChurchScope } from '../auth';
import { db, toPlain, toPlainList } from '../db';

export const membersRouter = Router();

membersRouter.get('/', requireAuth, (req, res) => {
  const churchId = resolveChurchScope(req, req.query.church_id);
  const search = String(req.query.q || '').trim().toLowerCase();
  const organism = String(req.query.organism || '').trim();
  const baptism = String(req.query.baptism || '').trim();

  const clauses: string[] = [];
  const params: SQLInputValue[] = [];

  if (churchId) {
    clauses.push('m.church_id = ?');
    params.push(churchId);
  }
  if (organism && organism !== 'ALL') {
    clauses.push('m.organism = ?');
    params.push(organism);
  }
  if (baptism && baptism !== 'ALL') {
    clauses.push('m.baptism_status = ?');
    params.push(baptism);
  }
  if (search) {
    clauses.push('(lower(m.full_name) LIKE ? OR lower(m.id_number) LIKE ? OR lower(m.phone) LIKE ? OR lower(m.profession) LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const members = toPlainList(
    db
      .prepare(
        `SELECT m.*, c.name AS church_name,
                COALESCE((
                  SELECT SUM(CASE WHEN ap.assigned_amount > ap.paid_amount THEN ap.assigned_amount - ap.paid_amount ELSE 0 END)
                  FROM activity_participants ap
                  JOIN activities a ON a.id = ap.activity_id
                  WHERE ap.member_id = m.id AND a.status = 'ACTIVA'
                ), 0) AS pending_activity_debt
         FROM members m
         JOIN churches c ON c.id = m.church_id
         ${where}
         ORDER BY m.full_name ASC`
      )
      .all(...params)
  );

  res.json({ members });
});

membersRouter.get('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = db
    .prepare(`SELECT m.*, c.name AS church_name FROM members m JOIN churches c ON c.id = m.church_id WHERE m.id = ?`)
    .get(id);
  if (!row) {
    res.status(404).json({ error: 'Miembro no encontrado.' });
    return;
  }
  const member = toPlain<{ id: number; church_id: number }>(row);
  if (!canAccessChurch(req.user!, member.church_id)) {
    res.status(403).json({ error: 'No tienes permiso para ver este miembro.' });
    return;
  }

  const activities = toPlainList(
    db
      .prepare(
        `SELECT ap.*, a.name AS activity_name, a.event_date, a.status AS activity_status,
                (ap.assigned_amount - ap.paid_amount) AS pending_amount
         FROM activity_participants ap
         JOIN activities a ON a.id = ap.activity_id
         WHERE ap.member_id = ?
         ORDER BY a.event_date DESC`
      )
      .all(id)
  );

  const tithes = toPlainList(
    db
      .prepare(
        `SELECT id, amount, tx_date, category, description, payment_method, receipt_number
         FROM financial_transactions
         WHERE member_id = ? AND type = 'INGRESO'
         ORDER BY tx_date DESC
         LIMIT 30`
      )
      .all(id)
  );

  res.json({ member, activities, tithes });
});

membersRouter.post('/', requireAuth, (req, res) => {
  const b = req.body || {};
  const churchId =
    req.user!.role === 'ADMIN_DISTRITO'
      ? Number(b.church_id)
      : Number(req.user!.church_id);

  if (!churchId) {
    res.status(400).json({ error: 'Debes seleccionar la iglesia a la que pertenece el miembro.' });
    return;
  }
  if (!b.full_name || !String(b.full_name).trim()) {
    res.status(400).json({ error: 'El nombre completo es obligatorio.' });
    return;
  }

  const r = db
    .prepare(
      `INSERT INTO members (
        church_id, full_name, id_number, phone, email, birth_date, gender, address,
        baptism_status, baptism_date, organism, church_role, profession, comm_skills, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      churchId,
      String(b.full_name).trim(),
      String(b.id_number || '').trim(),
      String(b.phone || '').trim(),
      String(b.email || '').trim(),
      String(b.birth_date || ''),
      String(b.gender || 'M'),
      String(b.address || ''),
      String(b.baptism_status || 'BAUTIZADO'),
      String(b.baptism_date || ''),
      String(b.organism || 'NINGUNO'),
      String(b.church_role || 'Miembro'),
      String(b.profession || ''),
      String(b.comm_skills || ''),
      String(b.status || 'ACTIVO'),
      String(b.notes || '')
    );

  const created = db
    .prepare(`SELECT m.*, c.name AS church_name FROM members m JOIN churches c ON c.id = m.church_id WHERE m.id = ?`)
    .get(Number(r.lastInsertRowid));
  res.status(201).json({ member: toPlain(created) });
});

membersRouter.put('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, church_id FROM members WHERE id = ?').get(id) as
    | { id: number; church_id: number }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Miembro no encontrado.' });
    return;
  }
  if (!canAccessChurch(req.user!, existing.church_id)) {
    res.status(403).json({ error: 'No tienes permiso para editar este miembro.' });
    return;
  }

  const b = req.body || {};
  const churchId =
    req.user!.role === 'ADMIN_DISTRITO' && b.church_id
      ? Number(b.church_id)
      : existing.church_id;

  db.prepare(
    `UPDATE members SET
      church_id = ?, full_name = ?, id_number = ?, phone = ?, email = ?, birth_date = ?, gender = ?, address = ?,
      baptism_status = ?, baptism_date = ?, organism = ?, church_role = ?, profession = ?, comm_skills = ?,
      status = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    churchId,
    String(b.full_name || '').trim(),
    String(b.id_number || '').trim(),
    String(b.phone || '').trim(),
    String(b.email || '').trim(),
    String(b.birth_date || ''),
    String(b.gender || 'M'),
    String(b.address || ''),
    String(b.baptism_status || 'BAUTIZADO'),
    String(b.baptism_date || ''),
    String(b.organism || 'NINGUNO'),
    String(b.church_role || 'Miembro'),
    String(b.profession || ''),
    String(b.comm_skills || ''),
    String(b.status || 'ACTIVO'),
    String(b.notes || ''),
    id
  );

  const updated = db
    .prepare(`SELECT m.*, c.name AS church_name FROM members m JOIN churches c ON c.id = m.church_id WHERE m.id = ?`)
    .get(id);
  res.json({ member: toPlain(updated) });
});

membersRouter.delete('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, church_id FROM members WHERE id = ?').get(id) as
    | { id: number; church_id: number }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Miembro no encontrado.' });
    return;
  }
  if (!canAccessChurch(req.user!, existing.church_id)) {
    res.status(403).json({ error: 'No tienes permiso para eliminar este miembro.' });
    return;
  }
  db.prepare('DELETE FROM members WHERE id = ?').run(id);
  res.json({ ok: true });
});
