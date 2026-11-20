import { Router } from 'express';
import type { SQLInputValue } from 'node:sqlite';
import { canAccessChurch, requireAuth, resolveChurchScope } from '../auth';
import { db, toPlain, toPlainList } from '../db';

export const financeRouter = Router();

financeRouter.get('/transactions', requireAuth, (req, res) => {
  const churchId = resolveChurchScope(req, req.query.church_id);
  const type = String(req.query.type || '');
  const category = String(req.query.category || '');
  const month = String(req.query.month || ''); // YYYY-MM
  const startDate = String(req.query.start_date || '');
  const endDate = String(req.query.end_date || '');
  const scopeFilter = String(req.query.scope || '');

  const clauses: string[] = [];
  const params: SQLInputValue[] = [];

  if (churchId) {
    clauses.push('ft.church_id = ?');
    params.push(churchId);
  } else if (scopeFilter === 'DISTRITAL') {
    clauses.push(`ft.scope = 'DISTRITAL'`);
  }
  if (type && type !== 'ALL') {
    clauses.push('ft.type = ?');
    params.push(type);
  }
  if (category && category !== 'ALL') {
    clauses.push('ft.category = ?');
    params.push(category);
  }
  if (month && month !== 'ALL') {
    clauses.push('substr(ft.tx_date, 1, 7) = ?');
    params.push(month);
  }
  if (startDate) {
    clauses.push('ft.tx_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    clauses.push('ft.tx_date <= ?');
    params.push(endDate);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const transactions = toPlainList<{ type: string; amount: number; category: string }>(
    db
      .prepare(
        `SELECT ft.*, c.name AS church_name, a.name AS activity_name, u.full_name AS recorded_by_name
         FROM financial_transactions ft
         LEFT JOIN churches c ON c.id = ft.church_id
         LEFT JOIN activities a ON a.id = ft.activity_id
         LEFT JOIN users u ON u.id = ft.recorded_by
         ${where}
         ORDER BY ft.tx_date DESC, ft.id DESC
         LIMIT 500`
      )
      .all(...params)
  );

  let totalIncome = 0;
  let totalExpense = 0;
  let totalTithes = 0;
  let totalOfferings = 0;
  let totalActivities = 0;

  for (const t of transactions) {
    if (t.type === 'INGRESO') {
      totalIncome += Number(t.amount);
      if (t.category === 'DIEZMO') totalTithes += Number(t.amount);
      if (t.category.startsWith('OFRENDA')) totalOfferings += Number(t.amount);
      if (t.category === 'ACTIVIDAD') totalActivities += Number(t.amount);
    } else {
      totalExpense += Number(t.amount);
    }
  }

  res.json({
    transactions,
    summary: {
      total_income: totalIncome,
      total_expense: totalExpense,
      balance: totalIncome - totalExpense,
      total_tithes: totalTithes,
      total_offerings: totalOfferings,
      total_activities: totalActivities,
      count: transactions.length,
    },
  });
});

financeRouter.post('/transactions', requireAuth, (req, res) => {
  const b = req.body || {};
  const amount = Number(b.amount || 0);
  if (amount <= 0) {
    res.status(400).json({ error: 'El monto debe ser mayor a $0.' });
    return;
  }
  if (!['INGRESO', 'EGRESO'].includes(String(b.type))) {
    res.status(400).json({ error: 'El tipo debe ser INGRESO o EGRESO.' });
    return;
  }
  if (!b.category) {
    res.status(400).json({ error: 'Selecciona una categoría financiera.' });
    return;
  }

  let scope = String(b.scope || 'LOCAL');
  let churchId: number | null = b.church_id ? Number(b.church_id) : null;
  if (req.user!.role !== 'ADMIN_DISTRITO') {
    scope = 'LOCAL';
    churchId = req.user!.church_id;
  } else if (scope === 'LOCAL' && !churchId) {
    res.status(400).json({ error: 'Selecciona la iglesia para este movimiento local.' });
    return;
  } else if (scope === 'DISTRITAL') {
    churchId = null;
  }

  let memberId: number | null = b.member_id ? Number(b.member_id) : null;
  let personName = String(b.person_name || '').trim();
  if (memberId && !personName) {
    const m = db.prepare('SELECT full_name FROM members WHERE id = ?').get(memberId) as
      | { full_name: string }
      | undefined;
    if (m) personName = m.full_name;
  }

  const txDate = String(b.tx_date || new Date().toISOString().slice(0, 10));
  const receipt =
    String(b.receipt_number || '').trim() ||
    `${b.type === 'INGRESO' ? 'ING' : 'EGR'}-${txDate.replace(/-/g, '')}-${Date.now().toString().slice(-3)}`;

  const r = db
    .prepare(
      `INSERT INTO financial_transactions (
        district_id, church_id, scope, type, category, amount, tx_date, description,
        member_id, person_name, activity_id, payment_method, receipt_number, recorded_by
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      churchId,
      scope,
      String(b.type),
      String(b.category),
      amount,
      txDate,
      String(b.description || ''),
      memberId,
      personName,
      b.activity_id ? Number(b.activity_id) : null,
      String(b.payment_method || 'EFECTIVO'),
      receipt,
      req.user!.id
    );

  res.status(201).json({ id: Number(r.lastInsertRowid), receipt_number: receipt });
});

financeRouter.delete('/transactions/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, scope, church_id FROM financial_transactions WHERE id = ?').get(id) as
    | { id: number; scope: string; church_id: number | null }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Movimiento no encontrado.' });
    return;
  }
  if (existing.scope === 'DISTRITAL' && req.user!.role !== 'ADMIN_DISTRITO') {
    res.status(403).json({ error: 'Solo el Distrito puede eliminar movimientos distritales.' });
    return;
  }
  if (existing.scope !== 'DISTRITAL' && !canAccessChurch(req.user!, existing.church_id)) {
    res.status(403).json({ error: 'No tienes permiso para eliminar este movimiento.' });
    return;
  }
  db.prepare('DELETE FROM financial_transactions WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Cuentas por pagar / Préstamos (Sección 2 de Ficha Iglesia)
financeRouter.get('/loans', requireAuth, (req, res) => {
  const churchId = resolveChurchScope(req, req.query.church_id);
  const loans = toPlainList(
    churchId
      ? db
          .prepare(
            `SELECT l.*, c.name AS church_name FROM debts_loans l
             JOIN churches c ON c.id = l.church_id
             WHERE l.church_id = ?
             ORDER BY l.status ASC, l.created_at DESC`
          )
          .all(churchId)
      : db
          .prepare(
            `SELECT l.*, c.name AS church_name FROM debts_loans l
             JOIN churches c ON c.id = l.church_id
             ORDER BY l.status ASC, l.created_at DESC`
          )
          .all()
  );
  res.json({ loans });
});

financeRouter.post('/loans', requireAuth, (req, res) => {
  const b = req.body || {};
  const churchId = req.user!.role === 'ADMIN_DISTRITO' ? Number(b.church_id) : Number(req.user!.church_id);
  if (!churchId || !b.creditor || Number(b.initial_amount || 0) <= 0) {
    res.status(400).json({ error: 'Iglesia, acreedor y valor inicial del préstamo son obligatorios.' });
    return;
  }
  const initial = Number(b.initial_amount);
  const remaining = b.remaining_amount !== undefined && b.remaining_amount !== '' ? Number(b.remaining_amount) : initial;

  const r = db
    .prepare(
      `INSERT INTO debts_loans (church_id, creditor, initial_amount, remaining_amount, start_date, term_description, seniority_text, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      churchId,
      String(b.creditor).trim(),
      initial,
      remaining,
      String(b.start_date || ''),
      String(b.term_description || ''),
      String(b.seniority_text || ''),
      remaining <= 0 ? 'PAGADO' : 'ACTIVO',
      String(b.notes || '')
    );

  // Marcar automáticamente en la ficha de la iglesia que tiene cuentas por pagar
  db.prepare('UPDATE churches SET has_accounts_payable = 1 WHERE id = ?').run(churchId);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

financeRouter.post('/loans/:id/pay', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const loan = db.prepare('SELECT * FROM debts_loans WHERE id = ?').get(id) as
    | { id: number; church_id: number; creditor: string; remaining_amount: number }
    | undefined;
  if (!loan) {
    res.status(404).json({ error: 'Préstamo no encontrado.' });
    return;
  }
  if (!canAccessChurch(req.user!, loan.church_id)) {
    res.status(403).json({ error: 'No tienes permiso sobre este préstamo.' });
    return;
  }

  const amount = Number(req.body?.amount || 0);
  if (amount <= 0) {
    res.status(400).json({ error: 'Ingresa un monto válido para abonar al préstamo.' });
    return;
  }
  const newRemaining = Math.max(0, loan.remaining_amount - amount);
  const newStatus = newRemaining <= 0 ? 'PAGADO' : 'ACTIVO';

  db.prepare(`UPDATE debts_loans SET remaining_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?`).run(
    newRemaining,
    newStatus,
    id
  );

  if (req.body?.record_in_finance !== false) {
    const txDate = String(req.body?.payment_date || new Date().toISOString().slice(0, 10));
    db.prepare(
      `INSERT INTO financial_transactions (
        district_id, church_id, scope, type, category, amount, tx_date, description,
        person_name, payment_method, receipt_number, recorded_by
      ) VALUES (1, ?, 'LOCAL', 'EGRESO', 'PAGO_PRESTAMO', ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      loan.church_id,
      amount,
      txDate,
      `Abono a préstamo / cuenta por pagar: ${loan.creditor}`,
      loan.creditor,
      String(req.body?.payment_method || 'TRANSFERENCIA'),
      `PREST-${id}-${Date.now().toString().slice(-3)}`,
      req.user!.id
    );
  }

  res.json({ ok: true, remaining_amount: newRemaining, status: newStatus });
});

financeRouter.delete('/loans/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const loan = db.prepare('SELECT id, church_id FROM debts_loans WHERE id = ?').get(id) as
    | { id: number; church_id: number }
    | undefined;
  if (!loan) {
    res.status(404).json({ error: 'Préstamo no encontrado.' });
    return;
  }
  if (!canAccessChurch(req.user!, loan.church_id)) {
    res.status(403).json({ error: 'No tienes permiso para eliminar este préstamo.' });
    return;
  }
  db.prepare('DELETE FROM debts_loans WHERE id = ?').run(id);
  res.json({ ok: true });
});
