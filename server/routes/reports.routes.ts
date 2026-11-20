import { Router } from 'express';
import type { SQLInputValue } from 'node:sqlite';
import { requireAuth, resolveChurchScope } from '../auth';
import { getEffectiveCensusForChurch, sumCensus } from '../census';
import { db, toPlain, toPlainList } from '../db';

export const reportsRouter = Router();

// 1. Reporte Financiero Consolidado o por Iglesia
reportsRouter.get('/financial', requireAuth, (req, res) => {
  const churchId = resolveChurchScope(req, req.query.church_id);
  const startDate = String(req.query.start_date || '2026-01-01');
  const endDate = String(req.query.end_date || '2026-12-31');

  const district = toPlain(db.prepare('SELECT * FROM districts LIMIT 1').get());
  const church = churchId ? toPlain(db.prepare('SELECT * FROM churches WHERE id = ?').get(churchId)) : null;

  const whereChurch = churchId ? 'AND ft.church_id = ?' : '';
  const params = churchId ? [startDate, endDate, churchId] : [startDate, endDate];

  const transactions = toPlainList<{ type: string; category: string; amount: number; church_name: string | null }>(
    db
      .prepare(
        `SELECT ft.*, c.name AS church_name, a.name AS activity_name
         FROM financial_transactions ft
         LEFT JOIN churches c ON c.id = ft.church_id
         LEFT JOIN activities a ON a.id = ft.activity_id
         WHERE ft.tx_date >= ? AND ft.tx_date <= ? ${whereChurch}
         ORDER BY ft.tx_date ASC, ft.id ASC`
      )
      .all(...params)
  );

  const byCategoryMap = new Map<string, { type: string; category: string; total: number; count: number }>();
  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of transactions) {
    if (t.type === 'INGRESO') totalIncome += Number(t.amount);
    else totalExpense += Number(t.amount);

    const key = `${t.type}:${t.category}`;
    const prev = byCategoryMap.get(key) || { type: t.type, category: t.category, total: 0, count: 0 };
    prev.total += Number(t.amount);
    prev.count += 1;
    byCategoryMap.set(key, prev);
  }

  // Si es consolidado distrital, desglose por iglesia
  const byChurch = !churchId
    ? toPlainList(
        db
          .prepare(
            `SELECT COALESCE(c.name, 'Tesorería Distrital (Distrito Sabana)') AS church_name,
                    COALESCE(SUM(CASE WHEN ft.type='INGRESO' THEN ft.amount ELSE 0 END), 0) AS ingresos,
                    COALESCE(SUM(CASE WHEN ft.type='EGRESO' THEN ft.amount ELSE 0 END), 0) AS egresos,
                    COALESCE(SUM(CASE WHEN ft.type='INGRESO' THEN ft.amount ELSE -ft.amount END), 0) AS saldo
             FROM financial_transactions ft
             LEFT JOIN churches c ON c.id = ft.church_id
             WHERE ft.tx_date >= ? AND ft.tx_date <= ?
             GROUP BY COALESCE(c.name, 'Tesorería Distrital (Distrito Sabana)')
             ORDER BY ingresos DESC`
          )
          .all(startDate, endDate)
      )
    : [];

  res.json({
    district,
    church,
    period: { start_date: startDate, end_date: endDate },
    summary: {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_balance: totalIncome - totalExpense,
      transactions_count: transactions.length,
    },
    by_category: Array.from(byCategoryMap.values()).sort((a, b) => b.total - a.total),
    by_church: byChurch,
    transactions,
  });
});

// 2. Reporte Censo Poblacional (Tabla 1 y Tabla 2 – Junta Nacional IGLEICO)
reportsRouter.get('/census', requireAuth, (req, res) => {
  const churchId = resolveChurchScope(req, req.query.church_id);
  const district = toPlain(db.prepare('SELECT * FROM districts LIMIT 1').get());

  const churches = toPlainList<{
    id: number;
    name: string;
    municipality: string;
    zone_name: string;
    categorization: string;
    use_auto_census: number;
    manual_census_json: string;
  }>(
    churchId
      ? db.prepare('SELECT * FROM churches WHERE id = ?').all(churchId)
      : db.prepare('SELECT * FROM churches WHERE is_active = 1 ORDER BY name ASC').all()
  );

  const rows = churches.map((c) => ({
    church_id: c.id,
    church_name: c.name,
    municipality: c.municipality,
    zone_name: c.zone_name,
    categorization: c.categorization,
    census: getEffectiveCensusForChurch(c),
  }));

  const consolidated = sumCensus(rows.map((r) => r.census));
  res.json({ district, rows, consolidated });
});

// 3. Reporte de Actividades y Cartera Pendiente ("Quién debe cuánto")
reportsRouter.get('/activities', requireAuth, (req, res) => {
  const churchId = resolveChurchScope(req, req.query.church_id);
  const onlyDebtors = req.query.only_debtors === 'true';
  const district = toPlain(db.prepare('SELECT * FROM districts LIMIT 1').get());

  const whereParts: string[] = [];
  const params: SQLInputValue[] = [];

  if (churchId) {
    whereParts.push('(ap.church_id = ? OR a.church_id = ?)');
    params.push(churchId, churchId);
  }
  if (onlyDebtors) {
    whereParts.push('ap.assigned_amount > ap.paid_amount');
  }
  const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  const rows = toPlainList<{ assigned_amount: number; paid_amount: number; pending_amount: number }>(
    db
      .prepare(
        `SELECT a.id AS activity_id, a.name AS activity_name, a.event_date, a.scope, a.organism, a.status AS activity_status,
                COALESCE(c.name, 'Distrito Sabana') AS church_name,
                ap.person_name, ap.person_phone, ap.is_member, ap.item_detail, ap.quantity,
                ap.assigned_amount, ap.paid_amount,
                CASE WHEN ap.assigned_amount > ap.paid_amount THEN ap.assigned_amount - ap.paid_amount ELSE 0 END AS pending_amount,
                ap.attendance_status, ap.notes
         FROM activity_participants ap
         JOIN activities a ON a.id = ap.activity_id
         LEFT JOIN churches c ON c.id = COALESCE(ap.church_id, a.church_id)
         ${where}
         ORDER BY pending_amount DESC, a.event_date DESC, ap.person_name ASC`
      )
      .all(...params)
  );

  const totals = rows.reduce(
    (acc, r) => {
      acc.assigned += Number(r.assigned_amount || 0);
      acc.paid += Number(r.paid_amount || 0);
      acc.pending += Number(r.pending_amount || 0);
      return acc;
    },
    { assigned: 0, paid: 0, pending: 0 }
  );

  res.json({ district, rows, totals });
});
