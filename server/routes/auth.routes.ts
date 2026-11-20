import { Router } from 'express';
import { hashPassword, requireAuth, requireDistrictAdmin, signToken, verifyPassword } from '../auth';
import { db, toPlain, toPlainList } from '../db';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ error: 'Ingresa tu usuario y contraseña.' });
    return;
  }

  const row = db
    .prepare(
      `SELECT u.*, c.name AS church_name
       FROM users u
       LEFT JOIN churches c ON c.id = u.church_id
       WHERE lower(u.username) = lower(?) OR lower(u.email) = lower(?)`
    )
    .get(String(username).trim(), String(username).trim());

  if (!row) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    return;
  }

  const user = toPlain<{
    id: number;
    username: string;
    email: string;
    password_hash: string;
    full_name: string;
    role: string;
    church_id: number | null;
    church_name: string | null;
    is_active: number;
  }>(row);

  if (!user.is_active) {
    res.status(403).json({ error: 'Tu usuario se encuentra desactivado.' });
    return;
  }

  if (!verifyPassword(String(password), user.password_hash)) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      church_id: user.church_id,
      church_name: user.church_name,
    },
  });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || String(newPassword).length < 6) {
    res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    return;
  }
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as {
    password_hash: string;
  };
  if (!row || !verifyPassword(String(currentPassword), row.password_hash)) {
    res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    return;
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    hashPassword(String(newPassword)),
    req.user!.id
  );
  res.json({ ok: true });
});

// Gestión de usuarios (Solo Directiva del Distrito)
authRouter.get('/users', requireAuth, requireDistrictAdmin, (_req, res) => {
  const users = toPlainList(
    db
      .prepare(
        `SELECT u.id, u.username, u.email, u.full_name, u.role, u.church_id, u.is_active, u.created_at,
                c.name AS church_name
         FROM users u
         LEFT JOIN churches c ON c.id = u.church_id
         ORDER BY u.role ASC, u.full_name ASC`
      )
      .all()
  );
  res.json({ users });
});

authRouter.post('/users', requireAuth, requireDistrictAdmin, (req, res) => {
  const { username, email, password, full_name, role, church_id } = req.body || {};
  if (!username || !password || !full_name || !role) {
    res.status(400).json({ error: 'Usuario, contraseña, nombre completo y rol son obligatorios.' });
    return;
  }
  if (role !== 'ADMIN_DISTRITO' && !church_id) {
    res.status(400).json({ error: 'Los roles locales deben estar asignados a una iglesia.' });
    return;
  }
  try {
    const r = db
      .prepare(
        `INSERT INTO users (username, email, password_hash, full_name, role, church_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`
      )
      .run(
        String(username).trim().toLowerCase(),
        String(email || '').trim(),
        hashPassword(String(password)),
        String(full_name).trim(),
        String(role),
        role === 'ADMIN_DISTRITO' ? null : Number(church_id)
      );
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'Ese nombre de usuario ya existe.' });
      return;
    }
    res.status(500).json({ error: 'No se pudo crear el usuario.' });
  }
});

authRouter.put('/users/:id', requireAuth, requireDistrictAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { full_name, email, role, church_id, is_active, password } = req.body || {};
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }

  db.prepare(
    `UPDATE users
     SET full_name = ?, email = ?, role = ?, church_id = ?, is_active = ?
     WHERE id = ?`
  ).run(
    String(full_name || '').trim(),
    String(email || '').trim(),
    String(role),
    role === 'ADMIN_DISTRITO' ? null : Number(church_id),
    is_active ? 1 : 0,
    id
  );

  if (password && String(password).length >= 6) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(password)), id);
  }
  res.json({ ok: true });
});

authRouter.delete('/users/:id', requireAuth, requireDistrictAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user!.id) {
    res.status(400).json({ error: 'No puedes eliminar tu propio usuario activo.' });
    return;
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});
