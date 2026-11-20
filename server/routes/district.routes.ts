import { Router } from 'express';
import { requireAuth, requireDistrictAdmin, resolveChurchScope } from '../auth';
import { getEffectiveCensusForChurch, sumCensus } from '../census';
import { db, toPlain, toPlainList } from '../db';

export const districtRouter = Router();

districtRouter.get('/district', requireAuth, (_req, res) => {
  const district = toPlain(db.prepare('SELECT * FROM districts LIMIT 1').get());
  const zones = toPlainList(db.prepare('SELECT * FROM zones ORDER BY name ASC').all());
  res.json({ district, zones });
});

districtRouter.put('/district', requireAuth, requireDistrictAdmin, (req, res) => {
  const d = req.body || {};
  db.prepare(
    `UPDATE districts SET
      name = ?, organization = ?, personeria = ?, region = ?,
      minister_name = ?, substitute_minister_name = ?, secretary_name = ?, treasurer_name = ?,
      email = ?, phone = ?, address = ?, notes = ?, updated_at = datetime('now')
     WHERE id = 1`
  ).run(
    d.name || 'Distrito Sabana',
    d.organization || 'Iglesia Evangélica Interamericana de Colombia (IGLEICO)',
    d.personeria || '',
    d.region || '',
    d.minister_name || '',
    d.substitute_minister_name || '',
    d.secretary_name || '',
    d.treasurer_name || '',
    d.email || '',
    d.phone || '',
    d.address || '',
    d.notes || ''
  );
  res.json({ ok: true });
});

districtRouter.post('/zones', requireAuth, requireDistrictAdmin, (req, res) => {
  const { name, coordinator_name, description } = req.body || {};
  if (!name) {
    res.status(400).json({ error: 'El nombre de la zona es obligatorio.' });
    return;
  }
  const r = db
    .prepare('INSERT INTO zones (district_id, name, coordinator_name, description) VALUES (1, ?, ?, ?)')
    .run(String(name).trim(), String(coordinator_name || '').trim(), String(description || '').trim());
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

districtRouter.put('/zones/:id', requireAuth, requireDistrictAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name, coordinator_name, description } = req.body || {};
  db.prepare('UPDATE zones SET name = ?, coordinator_name = ?, description = ? WHERE id = ?').run(
    String(name || '').trim(),
    String(coordinator_name || '').trim(),
    String(description || '').trim(),
    id
  );
  res.json({ ok: true });
});

districtRouter.delete('/zones/:id', requireAuth, requireDistrictAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM zones WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Dashboard Consolidado (Distrito o Iglesia según rol / filtro)
districtRouter.get('/dashboard', requireAuth, (req, res) => {
  const churchId = resolveChurchScope(req, req.query.church_id);
  const district = toPlain(db.prepare('SELECT * FROM districts LIMIT 1').get());

  // Iglesias dentro del alcance
  const churches = toPlainList<{
    id: number;
    name: string;
    municipality: string;
    categorization: string;
    zone_name: string;
    use_auto_census: number;
    manual_census_json: string;
  }>(
    churchId
      ? db.prepare('SELECT * FROM churches WHERE id = ?').all(churchId)
      : db.prepare('SELECT * FROM churches WHERE is_active = 1 ORDER BY name ASC').all()
  );

  // Censo consolidado
  const censusByChurch = churches.map((c) => ({
    church_id: c.id,
    census: getEffectiveCensusForChurch(c),
  }));
  const totalCensus = sumCensus(censusByChurch.map((x) => x.census));

  // Pastores
  const pastorsCount = churchId
    ? (db.prepare(`SELECT COUNT(*) AS cnt FROM pastors WHERE church_id = ? AND status = 'ACTIVO'`).get(churchId) as { cnt: number }).cnt
    : (db.prepare(`SELECT COUNT(*) AS cnt FROM pastors WHERE status = 'ACTIVO'`).get() as { cnt: number }).cnt;

  // Finanzas: mes actual y acumulado histórico
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const finScopeSql = churchId ? 'church_id = ?' : '1=1';
  const finParams = churchId ? [churchId] : [];

  const monthTotals = toPlainList<{ type: string; total: number }>(
    db
      .prepare(
        `SELECT type, COALESCE(SUM(amount), 0) AS total
         FROM financial_transactions
         WHERE ${finScopeSql} AND substr(tx_date, 1, 7) = ?
         GROUP BY type`
      )
      .all(...finParams, currentMonth)
  );
  const monthIncome = monthTotals.find((t) => t.type === 'INGRESO')?.total || 0;
  const monthExpense = monthTotals.find((t) => t.type === 'EGRESO')?.total || 0;

  const allTimeTotals = toPlainList<{ type: string; total: number }>(
    db
      .prepare(
        `SELECT type, COALESCE(SUM(amount), 0) AS total
         FROM financial_transactions
         WHERE ${finScopeSql}
         GROUP BY type`
      )
      .all(...finParams)
  );
  const totalIncome = allTimeTotals.find((t) => t.type === 'INGRESO')?.total || 0;
  const totalExpense = allTimeTotals.find((t) => t.type === 'EGRESO')?.total || 0;

  // Serie mensual últimos 6 meses
  const monthlySeries = toPlainList<{ month: string; ingresos: number; egresos: number }>(
    db
      .prepare(
        `SELECT substr(tx_date, 1, 7) AS month,
                COALESCE(SUM(CASE WHEN type = 'INGRESO' THEN amount ELSE 0 END), 0) AS ingresos,
                COALESCE(SUM(CASE WHEN type = 'EGRESO' THEN amount ELSE 0 END), 0) AS egresos
         FROM financial_transactions
         WHERE ${finScopeSql}
         GROUP BY substr(tx_date, 1, 7)
         ORDER BY month DESC
         LIMIT 6`
      )
      .all(...finParams)
  ).reverse();

  // Ingresos por categoría (últimos 6 meses / total)
  const incomeByCategory = toPlainList<{ category: string; total: number }>(
    db
      .prepare(
        `SELECT category, COALESCE(SUM(amount), 0) AS total
         FROM financial_transactions
         WHERE ${finScopeSql} AND type = 'INGRESO' AND substr(tx_date, 1, 7) = ?
         GROUP BY category
         ORDER BY total DESC`
      )
      .all(...finParams, currentMonth)
  );

  // Actividades y cartera pendiente ("cuánto deben")
  const actWhere = churchId
    ? `(a.church_id = ? OR a.scope = 'DISTRITAL')`
    : '1=1';
  const actParams = churchId ? [churchId] : [];

  const partDebtWhere = churchId
    ? `WHERE a.status = 'ACTIVA' AND (ap.church_id = ? OR a.church_id = ?)`
    : `WHERE a.status = 'ACTIVA'`;
  const partDebtParams = churchId ? [churchId, churchId] : [];

  const activityStats = toPlain<{
    assigned_total: number;
    paid_total: number;
    pending_total: number;
    debtors_count: number;
  }>(
    db
      .prepare(
        `SELECT
          COALESCE(SUM(ap.assigned_amount), 0) AS assigned_total,
          COALESCE(SUM(ap.paid_amount), 0) AS paid_total,
          COALESCE(SUM(CASE WHEN ap.assigned_amount > ap.paid_amount THEN ap.assigned_amount - ap.paid_amount ELSE 0 END), 0) AS pending_total,
          COALESCE(SUM(CASE WHEN ap.assigned_amount > ap.paid_amount THEN 1 ELSE 0 END), 0) AS debtors_count
         FROM activity_participants ap
         JOIN activities a ON a.id = ap.activity_id
         ${partDebtWhere}`
      )
      .get(...partDebtParams)
  );

  const activeActivities = toPlainList(
    db
      .prepare(
        `SELECT a.id, a.name, a.scope, a.activity_type, a.organism, a.event_date, a.goal_amount, a.status,
                c.name AS church_name,
                COUNT(ap.id) AS participants_count,
                COALESCE(SUM(ap.assigned_amount), 0) AS total_assigned,
                COALESCE(SUM(ap.paid_amount), 0) AS total_paid,
                COALESCE(SUM(CASE WHEN ap.assigned_amount > ap.paid_amount THEN ap.assigned_amount - ap.paid_amount ELSE 0 END), 0) AS total_pending
         FROM activities a
         LEFT JOIN churches c ON c.id = a.church_id
         LEFT JOIN activity_participants ap ON ap.activity_id = a.id
         WHERE a.status = 'ACTIVA' AND ${actWhere}
         GROUP BY a.id
         ORDER BY a.event_date ASC
         LIMIT 6`
      )
      .all(...actParams)
  );

  // Top deudores activos (para seguimiento rápido)
  const topDebtors = toPlainList(
    db
      .prepare(
        `SELECT ap.id, ap.person_name, ap.person_phone, ap.item_detail, ap.assigned_amount, ap.paid_amount,
                (ap.assigned_amount - ap.paid_amount) AS pending_amount,
                a.id AS activity_id, a.name AS activity_name, c.name AS church_name
         FROM activity_participants ap
         JOIN activities a ON a.id = ap.activity_id
         LEFT JOIN churches c ON c.id = COALESCE(ap.church_id, a.church_id)
         ${partDebtWhere} AND ap.assigned_amount > ap.paid_amount
         ORDER BY pending_amount DESC
         LIMIT 8`
      )
      .all(...partDebtParams)
  );

  // Resumen por iglesia (muy útil para la Directiva del Distrito Sabana)
  const churchesSummary = churches.map((c) => {
    const cen = censusByChurch.find((x) => x.church_id === c.id)!.census;
    const pastor = toPlain<{ full_name: string; ministerial_dignity: string } | undefined>(
      db
        .prepare(`SELECT full_name, ministerial_dignity FROM pastors WHERE church_id = ? AND status = 'ACTIVO' LIMIT 1`)
        .get(c.id)
    );
    const fin = toPlain<{ ingresos: number; egresos: number }>(
      db
        .prepare(
          `SELECT
            COALESCE(SUM(CASE WHEN type='INGRESO' THEN amount ELSE 0 END), 0) AS ingresos,
            COALESCE(SUM(CASE WHEN type='EGRESO' THEN amount ELSE 0 END), 0) AS egresos
           FROM financial_transactions
           WHERE church_id = ? AND substr(tx_date, 1, 7) = ?`
        )
        .get(c.id, currentMonth)
    );
    const actPending = toPlain<{ pending: number }>(
      db
        .prepare(
          `SELECT COALESCE(SUM(CASE WHEN ap.assigned_amount > ap.paid_amount THEN ap.assigned_amount - ap.paid_amount ELSE 0 END), 0) AS pending
           FROM activity_participants ap
           JOIN activities a ON a.id = ap.activity_id
           WHERE a.status = 'ACTIVA' AND COALESCE(ap.church_id, a.church_id) = ?`
        )
        .get(c.id)
    );
    return {
      id: c.id,
      name: c.name,
      municipality: c.municipality,
      zone_name: c.zone_name,
      categorization: c.categorization,
      pastor_name: pastor ? `${pastor.ministerial_dignity === 'REVERENDO' ? 'Rvdo.' : pastor.ministerial_dignity === 'PASTOR' ? 'Pr.' : 'Líd.'} ${pastor.full_name}` : 'Sin asignar',
      members_total: cen.grand_total,
      baptized: cen.total_baptized,
      month_income: fin?.ingresos || 0,
      month_expense: fin?.egresos || 0,
      activity_pending: actPending?.pending || 0,
    };
  });

  // Cuentas por pagar totales
  const debtsRow = toPlain<{ total_debt: number }>(
    db
      .prepare(
        `SELECT COALESCE(SUM(remaining_amount), 0) AS total_debt
         FROM debts_loans
         WHERE status = 'ACTIVO' AND ${churchId ? 'church_id = ?' : '1=1'}`
      )
      .get(...(churchId ? [churchId] : []))
  );

  res.json({
    district,
    current_month: currentMonth,
    kpis: {
      churches_total: churches.length,
      constituidas: churches.filter((c) => c.categorization === 'CONSTITUIDA').length,
      en_formacion: churches.filter((c) => c.categorization === 'EN_FORMACION').length,
      campos_predicacion: churches.filter((c) => c.categorization === 'CAMPO_PREDICACION').length,
      pastors_total: pastorsCount,
      members_total: totalCensus.grand_total,
      baptized_total: totalCensus.total_baptized,
      not_baptized_total: totalCensus.total_not_baptized,
      children_total: totalCensus.total_children,
      month_income: monthIncome,
      month_expense: monthExpense,
      month_balance: monthIncome - monthExpense,
      accumulated_balance: totalIncome - totalExpense,
      activity_assigned: activityStats?.assigned_total || 0,
      activity_paid: activityStats?.paid_total || 0,
      activity_pending: activityStats?.pending_total || 0,
      debtors_count: activityStats?.debtors_count || 0,
      loans_remaining: debtsRow?.total_debt || 0,
    },
    census: totalCensus,
    monthly_series: monthlySeries,
    income_by_category: incomeByCategory,
    active_activities: activeActivities,
    top_debtors: topDebtors,
    churches_summary: churchesSummary,
  });
});
