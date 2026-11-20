import { Router } from 'express';
import type { SQLInputValue } from 'node:sqlite';
import { canAccessChurch, requireAuth, resolveChurchScope } from '../auth';
import { db, toPlain, toPlainList } from '../db';

export const activitiesRouter = Router();

activitiesRouter.get('/', requireAuth, (req, res) => {
  const churchId = resolveChurchScope(req, req.query.church_id);
  const status = String(req.query.status || '');
  const scope = String(req.query.scope || '');

  const clauses: string[] = [];
  const params: SQLInputValue[] = [];

  if (churchId) {
    clauses.push(`(a.church_id = ? OR a.scope = 'DISTRITAL')`);
    params.push(churchId);
  }
  if (status && status !== 'ALL') {
    clauses.push('a.status = ?');
    params.push(status);
  }
  if (scope && scope !== 'ALL') {
    clauses.push('a.scope = ?');
    params.push(scope);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const activities = toPlainList(
    db
      .prepare(
        `SELECT a.*, c.name AS church_name,
                COUNT(ap.id) AS participants_count,
                COALESCE(SUM(ap.quantity), 0) AS total_quantity,
                COALESCE(SUM(ap.assigned_amount), 0) AS total_assigned,
                COALESCE(SUM(ap.paid_amount), 0) AS total_paid,
                COALESCE(SUM(CASE WHEN ap.assigned_amount > ap.paid_amount THEN ap.assigned_amount - ap.paid_amount ELSE 0 END), 0) AS total_pending,
                COALESCE(SUM(CASE WHEN ap.assigned_amount > ap.paid_amount THEN 1 ELSE 0 END), 0) AS debtors_count,
                COALESCE(SUM(CASE WHEN ap.attendance_status IN ('CONFIRMADO', 'ASISTIO') THEN 1 ELSE 0 END), 0) AS confirmed_count
         FROM activities a
         LEFT JOIN churches c ON c.id = a.church_id
         LEFT JOIN activity_participants ap ON ap.activity_id = a.id
           ${req.user!.role !== 'ADMIN_DISTRITO' ? 'AND (a.scope = \'LOCAL\' OR ap.church_id = ?)' : ''}
         ${where}
         GROUP BY a.id
         ORDER BY CASE WHEN a.status = 'ACTIVA' THEN 0 ELSE 1 END, a.event_date DESC`
      )
      .all(...(req.user!.role !== 'ADMIN_DISTRITO' ? [req.user!.church_id, ...params] : params))
  );

  res.json({ activities });
});

activitiesRouter.get('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = db
    .prepare(
      `SELECT a.*, c.name AS church_name
       FROM activities a
       LEFT JOIN churches c ON c.id = a.church_id
       WHERE a.id = ?`
    )
    .get(id);
  if (!row) {
    res.status(404).json({ error: 'Actividad no encontrada.' });
    return;
  }
  const activity = toPlain<{ id: number; scope: string; church_id: number | null }>(row);
  if (activity.scope !== 'DISTRITAL' && !canAccessChurch(req.user!, activity.church_id)) {
    res.status(403).json({ error: 'No tienes permiso para ver esta actividad.' });
    return;
  }

  // Si es actividad distrital y el usuario es local, solo ve participantes de su iglesia (para privacidad entre iglesias)
  const isLocalOnDistrict = activity.scope === 'DISTRITAL' && req.user!.role !== 'ADMIN_DISTRITO';
  const participants = toPlainList<{ id: number; assigned_amount: number; paid_amount: number }>(
    db
      .prepare(
        `SELECT ap.*, c.name AS church_name, m.organism AS member_organism,
                CASE WHEN ap.assigned_amount > ap.paid_amount THEN ap.assigned_amount - ap.paid_amount ELSE 0 END AS pending_amount
         FROM activity_participants ap
         LEFT JOIN churches c ON c.id = ap.church_id
         LEFT JOIN members m ON m.id = ap.member_id
         WHERE ap.activity_id = ? ${isLocalOnDistrict ? 'AND ap.church_id = ?' : ''}
         ORDER BY pending_amount DESC, ap.person_name ASC`
      )
      .all(...(isLocalOnDistrict ? [id, req.user!.church_id] : [id]))
  );

  const payments = toPlainList(
    db
      .prepare(
        `SELECT p.*, ap.person_name
         FROM activity_payments p
         JOIN activity_participants ap ON ap.id = p.participant_id
         WHERE p.activity_id = ? ${isLocalOnDistrict ? 'AND ap.church_id = ?' : ''}
         ORDER BY p.payment_date DESC, p.id DESC`
      )
      .all(...(isLocalOnDistrict ? [id, req.user!.church_id] : [id]))
  );

  const summary = {
    participants_count: participants.length,
    total_assigned: participants.reduce((acc, p) => acc + Number(p.assigned_amount || 0), 0),
    total_paid: participants.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0),
    total_pending: participants.reduce(
      (acc, p) => acc + Math.max(0, Number(p.assigned_amount || 0) - Number(p.paid_amount || 0)),
      0
    ),
    debtors_count: participants.filter((p) => Number(p.assigned_amount || 0) > Number(p.paid_amount || 0)).length,
  };

  res.json({ activity, participants, payments, summary });
});

activitiesRouter.post('/', requireAuth, (req, res) => {
  const b = req.body || {};
  if (!b.name || !String(b.name).trim()) {
    res.status(400).json({ error: 'El nombre de la actividad es obligatorio.' });
    return;
  }

  let scope = String(b.scope || 'LOCAL');
  let churchId: number | null = b.church_id ? Number(b.church_id) : null;

  if (req.user!.role !== 'ADMIN_DISTRITO') {
    scope = 'LOCAL';
    churchId = req.user!.church_id;
  } else if (scope === 'LOCAL' && !churchId) {
    res.status(400).json({ error: 'Para una actividad local debes seleccionar la iglesia.' });
    return;
  } else if (scope === 'DISTRITAL') {
    churchId = null;
  }

  const r = db
    .prepare(
      `INSERT INTO activities (
        district_id, church_id, scope, name, activity_type, organism, event_date, location,
        responsible_name, unit_label, unit_price, goal_amount, description, status, created_by
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      churchId,
      scope,
      String(b.name).trim(),
      String(b.activity_type || 'VENTA_RECAUDO'),
      String(b.organism || 'GENERAL'),
      String(b.event_date || new Date().toISOString().slice(0, 10)),
      String(b.location || ''),
      String(b.responsible_name || req.user!.full_name),
      String(b.unit_label || 'Unidad'),
      Number(b.unit_price || 0),
      Number(b.goal_amount || 0),
      String(b.description || ''),
      String(b.status || 'ACTIVA'),
      req.user!.id
    );

  const created = db.prepare('SELECT * FROM activities WHERE id = ?').get(Number(r.lastInsertRowid));
  res.status(201).json({ activity: toPlain(created) });
});

activitiesRouter.put('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(id) as
    | { id: number; scope: string; church_id: number | null }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Actividad no encontrada.' });
    return;
  }
  if (existing.scope === 'DISTRITAL' && req.user!.role !== 'ADMIN_DISTRITO') {
    res.status(403).json({ error: 'Solo la directiva del Distrito puede editar una actividad distrital.' });
    return;
  }
  if (existing.scope !== 'DISTRITAL' && !canAccessChurch(req.user!, existing.church_id)) {
    res.status(403).json({ error: 'No tienes permiso para editar esta actividad.' });
    return;
  }

  const b = req.body || {};
  db.prepare(
    `UPDATE activities SET
      name = ?, activity_type = ?, organism = ?, event_date = ?, location = ?,
      responsible_name = ?, unit_label = ?, unit_price = ?, goal_amount = ?,
      description = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    String(b.name || '').trim(),
    String(b.activity_type || 'VENTA_RECAUDO'),
    String(b.organism || 'GENERAL'),
    String(b.event_date || ''),
    String(b.location || ''),
    String(b.responsible_name || ''),
    String(b.unit_label || 'Unidad'),
    Number(b.unit_price || 0),
    Number(b.goal_amount || 0),
    String(b.description || ''),
    String(b.status || 'ACTIVA'),
    id
  );
  res.json({ ok: true });
});

activitiesRouter.delete('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, scope, church_id FROM activities WHERE id = ?').get(id) as
    | { id: number; scope: string; church_id: number | null }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Actividad no encontrada.' });
    return;
  }
  if (existing.scope === 'DISTRITAL' && req.user!.role !== 'ADMIN_DISTRITO') {
    res.status(403).json({ error: 'Solo el Distrito puede eliminar una actividad distrital.' });
    return;
  }
  if (existing.scope !== 'DISTRITAL' && !canAccessChurch(req.user!, existing.church_id)) {
    res.status(403).json({ error: 'No tienes permiso para eliminar esta actividad.' });
    return;
  }
  db.prepare('DELETE FROM activities WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Agregar participante / compromiso ("Quién se llevó la actividad / Quién debe ir")
activitiesRouter.post('/:id/participants', requireAuth, (req, res) => {
  const activityId = Number(req.params.id);
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId) as
    | { id: number; name: string; scope: string; church_id: number | null; unit_price: number }
    | undefined;
  if (!activity) {
    res.status(404).json({ error: 'Actividad no encontrada.' });
    return;
  }
  if (activity.scope !== 'DISTRITAL' && !canAccessChurch(req.user!, activity.church_id)) {
    res.status(403).json({ error: 'No tienes permiso sobre esta actividad.' });
    return;
  }

  const b = req.body || {};
  let memberId: number | null = b.member_id ? Number(b.member_id) : null;
  let personName = String(b.person_name || '').trim();
  let personPhone = String(b.person_phone || '').trim();
  let churchId: number | null =
    req.user!.role === 'ADMIN_DISTRITO'
      ? (b.church_id ? Number(b.church_id) : activity.church_id)
      : req.user!.church_id;

  if (memberId) {
    const m = db.prepare('SELECT id, full_name, phone, church_id FROM members WHERE id = ?').get(memberId) as
      | { id: number; full_name: string; phone: string; church_id: number }
      | undefined;
    if (m) {
      personName = m.full_name;
      personPhone = personPhone || m.phone;
      churchId = m.church_id;
    }
  }

  if (!personName) {
    res.status(400).json({ error: 'Debes seleccionar un miembro o escribir el nombre de la persona.' });
    return;
  }

  const quantity = Math.max(0, Number(b.quantity ?? 1));
  const unitPrice = Math.max(0, Number(b.unit_price ?? activity.unit_price ?? 0));
  const assignedAmount =
    b.assigned_amount !== undefined && b.assigned_amount !== ''
      ? Math.max(0, Number(b.assigned_amount))
      : quantity * unitPrice;
  const initialPayment = Math.max(0, Number(b.initial_payment || 0));
  const recordInFinance = b.record_in_finance !== false;
  const paymentMethod = String(b.payment_method || 'EFECTIVO');
  const paymentDate = String(b.payment_date || new Date().toISOString().slice(0, 10));

  const pRes = db
    .prepare(
      `INSERT INTO activity_participants (
        activity_id, church_id, member_id, person_name, person_phone, is_member,
        item_detail, quantity, unit_price, assigned_amount, paid_amount, attendance_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      activityId,
      churchId,
      memberId,
      personName,
      personPhone,
      memberId ? 1 : 0,
      String(b.item_detail || ''),
      quantity,
      unitPrice,
      assignedAmount,
      initialPayment,
      String(b.attendance_status || 'CONFIRMADO'),
      String(b.notes || '')
    );

  const participantId = Number(pRes.lastInsertRowid);

  if (initialPayment > 0) {
    let financeTxId: number | null = null;
    if (recordInFinance) {
      const txScope = activity.scope === 'DISTRITAL' && req.user!.role === 'ADMIN_DISTRITO' ? 'DISTRITAL' : 'LOCAL';
      const txChurchId = txScope === 'DISTRITAL' ? null : churchId;
      const txRes = db
        .prepare(
          `INSERT INTO financial_transactions (
            district_id, church_id, scope, type, category, amount, tx_date, description,
            member_id, person_name, activity_id, payment_method, receipt_number, recorded_by
          ) VALUES (1, ?, ?, 'INGRESO', 'ACTIVIDAD', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          txChurchId,
          txScope,
          initialPayment,
          paymentDate,
          `Abono inicial actividad: ${activity.name} – ${personName}${b.item_detail ? ` (${b.item_detail})` : ''}`,
          memberId,
          personName,
          activityId,
          paymentMethod,
          `ACT-${activityId}-${participantId}`,
          req.user!.id
        );
      financeTxId = Number(txRes.lastInsertRowid);
    }

    db.prepare(
      `INSERT INTO activity_payments (
        participant_id, activity_id, amount, payment_date, payment_method, notes, finance_tx_id, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      participantId,
      activityId,
      initialPayment,
      paymentDate,
      paymentMethod,
      'Abono inicial al registrar participación',
      financeTxId,
      req.user!.id
    );
  }

  res.status(201).json({ id: participantId });
});

// Actualizar datos o asistencia de un participante
activitiesRouter.put('/:id/participants/:pid', requireAuth, (req, res) => {
  const activityId = Number(req.params.id);
  const pid = Number(req.params.pid);
  const part = db
    .prepare('SELECT * FROM activity_participants WHERE id = ? AND activity_id = ?')
    .get(pid, activityId) as { id: number; church_id: number | null } | undefined;
  if (!part) {
    res.status(404).json({ error: 'Participante no encontrado.' });
    return;
  }
  if (req.user!.role !== 'ADMIN_DISTRITO' && !canAccessChurch(req.user!, part.church_id)) {
    res.status(403).json({ error: 'No tienes permiso para modificar este registro.' });
    return;
  }
  const b = req.body || {};
  db.prepare(
    `UPDATE activity_participants SET
      item_detail = ?, quantity = ?, unit_price = ?, assigned_amount = ?,
      attendance_status = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    String(b.item_detail ?? ''),
    Number(b.quantity ?? 1),
    Number(b.unit_price ?? 0),
    Number(b.assigned_amount ?? 0),
    String(b.attendance_status || 'CONFIRMADO'),
    String(b.notes ?? ''),
    pid
  );
  res.json({ ok: true });
});

activitiesRouter.delete('/:id/participants/:pid', requireAuth, (req, res) => {
  const activityId = Number(req.params.id);
  const pid = Number(req.params.pid);
  const part = db
    .prepare('SELECT * FROM activity_participants WHERE id = ? AND activity_id = ?')
    .get(pid, activityId) as { id: number; church_id: number | null } | undefined;
  if (!part) {
    res.status(404).json({ error: 'Participante no encontrado.' });
    return;
  }
  if (req.user!.role !== 'ADMIN_DISTRITO' && !canAccessChurch(req.user!, part.church_id)) {
    res.status(403).json({ error: 'No tienes permiso para eliminar este participante.' });
    return;
  }
  db.prepare('DELETE FROM activity_participants WHERE id = ?').run(pid);
  res.json({ ok: true });
});

// Registrar abono / pago de deuda de un participante
activitiesRouter.post('/:id/participants/:pid/payments', requireAuth, (req, res) => {
  const activityId = Number(req.params.id);
  const pid = Number(req.params.pid);
  const b = req.body || {};
  const amount = Number(b.amount || 0);
  if (amount <= 0) {
    res.status(400).json({ error: 'El valor del abono debe ser mayor a $0.' });
    return;
  }

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId) as
    | { id: number; name: string; scope: string; church_id: number | null }
    | undefined;
  const part = db
    .prepare('SELECT * FROM activity_participants WHERE id = ? AND activity_id = ?')
    .get(pid, activityId) as
    | { id: number; church_id: number | null; member_id: number | null; person_name: string; item_detail: string; paid_amount: number }
    | undefined;

  if (!activity || !part) {
    res.status(404).json({ error: 'Registro no encontrado.' });
    return;
  }
  if (req.user!.role !== 'ADMIN_DISTRITO' && !canAccessChurch(req.user!, part.church_id ?? activity.church_id)) {
    res.status(403).json({ error: 'No tienes permiso para registrar abonos en esta actividad.' });
    return;
  }

  const paymentDate = String(b.payment_date || new Date().toISOString().slice(0, 10));
  const paymentMethod = String(b.payment_method || 'EFECTIVO');
  const notes = String(b.notes || '');
  const recordInFinance = b.record_in_finance !== false;

  let financeTxId: number | null = null;
  if (recordInFinance) {
    const txScope = activity.scope === 'DISTRITAL' && req.user!.role === 'ADMIN_DISTRITO' ? 'DISTRITAL' : 'LOCAL';
    const txChurchId = txScope === 'DISTRITAL' ? null : (part.church_id ?? activity.church_id ?? req.user!.church_id);
    const txRes = db
      .prepare(
        `INSERT INTO financial_transactions (
          district_id, church_id, scope, type, category, amount, tx_date, description,
          member_id, person_name, activity_id, payment_method, receipt_number, recorded_by
        ) VALUES (1, ?, ?, 'INGRESO', 'ACTIVIDAD', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        txChurchId,
        txScope,
        amount,
        paymentDate,
        `Abono actividad: ${activity.name} – ${part.person_name}${notes ? ` (${notes})` : ''}`,
        part.member_id,
        part.person_name,
        activityId,
        paymentMethod,
        `ABN-${activityId}-${Date.now().toString().slice(-4)}`,
        req.user!.id
      );
    financeTxId = Number(txRes.lastInsertRowid);
  }

  db.prepare(
    `INSERT INTO activity_payments (
      participant_id, activity_id, amount, payment_date, payment_method, notes, finance_tx_id, recorded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(pid, activityId, amount, paymentDate, paymentMethod, notes, financeTxId, req.user!.id);

  db.prepare(
    `UPDATE activity_participants SET paid_amount = paid_amount + ?, updated_at = datetime('now') WHERE id = ?`
  ).run(amount, pid);

  res.status(201).json({ ok: true, finance_tx_id: financeTxId });
});
