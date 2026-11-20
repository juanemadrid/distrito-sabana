import { Router } from 'express';
import { canAccessChurch, requireAuth, requireDistrictAdmin } from '../auth';
import { computeAutoCensusForChurch, getEffectiveCensusForChurch } from '../census';
import { db, toPlain, toPlainList } from '../db';

export const churchesRouter = Router();

function safeJsonParse(raw: unknown, fallback: unknown) {
  if (typeof raw !== 'string') return raw ?? fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function hydrateChurch(row: Record<string, unknown>) {
  const id = Number(row.id);
  const autoCensus = computeAutoCensusForChurch(id);
  const effectiveCensus = getEffectiveCensusForChurch({
    id,
    use_auto_census: Number(row.use_auto_census ?? 1),
    manual_census_json: String(row.manual_census_json || '{}'),
  });

  // Promedio real de ingresos mensuales (últimos 6 meses con datos)
  const avgRow = toPlain<{ avg_income: number }>(
    db
      .prepare(
        `SELECT COALESCE(AVG(monthly_total), 0) AS avg_income
         FROM (
           SELECT substr(tx_date, 1, 7) AS ym, SUM(amount) AS monthly_total
           FROM financial_transactions
           WHERE church_id = ? AND type = 'INGRESO'
           GROUP BY ym
         )`
      )
      .get(id)
  );

  const pastor = toPlain<{ id: number; full_name: string; ministerial_dignity: string; phone: string } | undefined>(
    db
      .prepare(`SELECT id, full_name, ministerial_dignity, phone FROM pastors WHERE church_id = ? AND status = 'ACTIVO' LIMIT 1`)
      .get(id)
  );

  const loans = toPlainList(
    db.prepare(`SELECT * FROM debts_loans WHERE church_id = ? ORDER BY status ASC, created_at DESC`).all(id)
  );

  return {
    ...row,
    other_properties: safeJsonParse(row.other_properties_json, {}),
    vehicles: safeJsonParse(row.vehicles_json, {}),
    hired_staff: safeJsonParse(row.hired_staff_json, []),
    professionals: safeJsonParse(row.professionals_json, []),
    skills: safeJsonParse(row.skills_json, {}),
    institutions: safeJsonParse(row.institutions_json, {}),
    social: safeJsonParse(row.social_json, {}),
    equipment: safeJsonParse(row.equipment_json, {}),
    manual_census: safeJsonParse(row.manual_census_json, {}),
    auto_census: autoCensus,
    census: effectiveCensus,
    live_avg_monthly_income: Math.round(avgRow?.avg_income || 0),
    pastor: pastor || null,
    loans,
  };
}

churchesRouter.get('/', requireAuth, (req, res) => {
  const rows =
    req.user!.role === 'ADMIN_DISTRITO'
      ? toPlainList(db.prepare('SELECT * FROM churches ORDER BY name ASC').all())
      : toPlainList(db.prepare('SELECT * FROM churches WHERE id = ?').all(req.user!.church_id));

  res.json({ churches: rows.map(hydrateChurch) });
});

churchesRouter.get('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!canAccessChurch(req.user!, id)) {
    res.status(403).json({ error: 'No tienes permiso para ver esta iglesia.' });
    return;
  }
  const row = db.prepare('SELECT * FROM churches WHERE id = ?').get(id);
  if (!row) {
    res.status(404).json({ error: 'Iglesia no encontrada.' });
    return;
  }
  res.json({ church: hydrateChurch(toPlain(row)) });
});

function extractChurchPayload(b: Record<string, unknown>) {
  const zoneId = b.zone_id ? Number(b.zone_id) : null;
  let zoneName = String(b.zone_name || '');
  if (zoneId && !zoneName) {
    const z = db.prepare('SELECT name FROM zones WHERE id = ?').get(zoneId) as { name: string } | undefined;
    if (z) zoneName = z.name;
  }
  return [
    zoneId,
    zoneName,
    String(b.name || '').trim(),
    String(b.address || ''),
    String(b.stratum || ''),
    String(b.neighborhood || ''),
    String(b.municipality || ''),
    String(b.department || 'Sucre'),
    String(b.phone || ''),
    String(b.email || ''),
    String(b.categorization || 'CONSTITUIDA'),
    String(b.foundation_month || ''),
    String(b.foundation_year || ''),
    b.is_active === false || b.is_active === 0 ? 0 : 1,

    String(b.premises_type || 'PROPIO'),
    String(b.premises_other || ''),
    String(b.property_owner_type || ''),
    String(b.property_owner_name || ''),
    Number(b.rent_amount || 0),
    String(b.rent_start_date || ''),
    String(b.rent_end_date || ''),
    b.has_pastoral_house ? 1 : 0,
    Number(b.pastoral_house_rent || 0),
    String(b.ownership_doc_type || 'NINGUNO'),
    b.pays_property_tax ? 1 : 0,
    String(b.property_tax_up_to_date || 'NO_APLICA'),
    JSON.stringify(b.other_properties || {}),
    b.has_leased_property ? 1 : 0,
    Number(b.leased_property_income || 0),
    JSON.stringify(b.vehicles || {}),

    Number(b.avg_monthly_income || 0),
    b.has_bank_account ? 1 : 0,
    String(b.bank_nit || ''),
    String(b.bank_name || ''),
    String(b.bank_account_type || ''),
    b.has_accounts_payable ? 1 : 0,
    b.has_hired_staff ? 1 : 0,
    JSON.stringify(b.hired_staff || []),

    b.has_copastor ? 1 : 0,
    String(b.copastor_name || ''),
    String(b.copastor_phone || ''),
    String(b.copastor_email || ''),
    Number(b.copastor_remuneration || 0),
    b.copastor_no_pay ? 1 : 0,
    b.has_local_council ? 1 : 0,
    Number(b.local_council_count || 0),
    String(b.treasurer_name || ''),
    String(b.treasurer_phone || ''),
    String(b.treasurer_email || ''),
    String(b.treasurer_academic || ''),
    String(b.secretary_name || ''),
    String(b.secretary_phone || ''),
    String(b.secretary_email || ''),
    String(b.secretary_academic || ''),
    b.has_ucei ? 1 : 0,
    b.has_ujei ? 1 : 0,
    b.has_udei ? 1 : 0,
    b.has_unei ? 1 : 0,
    b.ministry_missions ? 1 : 0,
    b.ministry_discipleship ? 1 : 0,
    b.ministry_intercession ? 1 : 0,
    b.ministry_evangelism ? 1 : 0,
    b.ministry_worship ? 1 : 0,
    String(b.ministry_other || ''),
    String(b.discipleship_program || ''),
    b.has_preaching_fields ? 1 : 0,
    Number(b.preaching_fields_count || 0),
    b.has_ordained_ministers ? 1 : 0,
    Number(b.ordained_ministers_count || 0),
    b.has_retired_pastors ? 1 : 0,
    Number(b.retired_pastors_count || 0),
    b.has_professionals ? 1 : 0,
    JSON.stringify(b.professionals || []),
    JSON.stringify(b.skills || {}),
    Number(b.sunday_school_teachers || 0),
    b.has_age_divided_classes ? 1 : 0,
    String(b.age_divided_classes_info || ''),

    JSON.stringify(b.institutions || {}),
    JSON.stringify(b.social || {}),
    JSON.stringify(b.equipment || {}),
    b.has_theology_teachers ? 1 : 0,
    b.use_auto_census === false || b.use_auto_census === 0 ? 0 : 1,
    JSON.stringify(b.manual_census || {}),
  ];
}

churchesRouter.post('/', requireAuth, requireDistrictAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.name || !String(b.name).trim()) {
    res.status(400).json({ error: 'El nombre de la iglesia es obligatorio.' });
    return;
  }
  const vals = extractChurchPayload(b);
  const r = db
    .prepare(
      `INSERT INTO churches (
        district_id, zone_id, zone_name, name, address, stratum, neighborhood, municipality, department,
        phone, email, categorization, foundation_month, foundation_year, is_active,
        premises_type, premises_other, property_owner_type, property_owner_name, rent_amount, rent_start_date, rent_end_date,
        has_pastoral_house, pastoral_house_rent, ownership_doc_type, pays_property_tax, property_tax_up_to_date,
        other_properties_json, has_leased_property, leased_property_income, vehicles_json,
        avg_monthly_income, has_bank_account, bank_nit, bank_name, bank_account_type, has_accounts_payable, has_hired_staff, hired_staff_json,
        has_copastor, copastor_name, copastor_phone, copastor_email, copastor_remuneration, copastor_no_pay,
        has_local_council, local_council_count, treasurer_name, treasurer_phone, treasurer_email, treasurer_academic,
        secretary_name, secretary_phone, secretary_email, secretary_academic,
        has_ucei, has_ujei, has_udei, has_unei,
        ministry_missions, ministry_discipleship, ministry_intercession, ministry_evangelism, ministry_worship, ministry_other,
        discipleship_program, has_preaching_fields, preaching_fields_count, has_ordained_ministers, ordained_ministers_count,
        has_retired_pastors, retired_pastors_count, has_professionals, professionals_json, skills_json,
        sunday_school_teachers, has_age_divided_classes, age_divided_classes_info,
        institutions_json, social_json, equipment_json, has_theology_teachers, use_auto_census, manual_census_json
      ) VALUES (1, ${vals.map(() => '?').join(', ')})`
    )
    .run(...vals);

  const created = db.prepare('SELECT * FROM churches WHERE id = ?').get(Number(r.lastInsertRowid));
  res.status(201).json({ church: hydrateChurch(toPlain(created)) });
});

churchesRouter.put('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!canAccessChurch(req.user!, id)) {
    res.status(403).json({ error: 'No tienes permiso para editar esta iglesia.' });
    return;
  }
  const existing = db.prepare('SELECT id FROM churches WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Iglesia no encontrada.' });
    return;
  }
  const b = req.body || {};
  if (!b.name || !String(b.name).trim()) {
    res.status(400).json({ error: 'El nombre de la iglesia es obligatorio.' });
    return;
  }
  const vals = extractChurchPayload(b);
  db.prepare(
    `UPDATE churches SET
      zone_id = ?, zone_name = ?, name = ?, address = ?, stratum = ?, neighborhood = ?, municipality = ?, department = ?,
      phone = ?, email = ?, categorization = ?, foundation_month = ?, foundation_year = ?, is_active = ?,
      premises_type = ?, premises_other = ?, property_owner_type = ?, property_owner_name = ?, rent_amount = ?, rent_start_date = ?, rent_end_date = ?,
      has_pastoral_house = ?, pastoral_house_rent = ?, ownership_doc_type = ?, pays_property_tax = ?, property_tax_up_to_date = ?,
      other_properties_json = ?, has_leased_property = ?, leased_property_income = ?, vehicles_json = ?,
      avg_monthly_income = ?, has_bank_account = ?, bank_nit = ?, bank_name = ?, bank_account_type = ?, has_accounts_payable = ?, has_hired_staff = ?, hired_staff_json = ?,
      has_copastor = ?, copastor_name = ?, copastor_phone = ?, copastor_email = ?, copastor_remuneration = ?, copastor_no_pay = ?,
      has_local_council = ?, local_council_count = ?, treasurer_name = ?, treasurer_phone = ?, treasurer_email = ?, treasurer_academic = ?,
      secretary_name = ?, secretary_phone = ?, secretary_email = ?, secretary_academic = ?,
      has_ucei = ?, has_ujei = ?, has_udei = ?, has_unei = ?,
      ministry_missions = ?, ministry_discipleship = ?, ministry_intercession = ?, ministry_evangelism = ?, ministry_worship = ?, ministry_other = ?,
      discipleship_program = ?, has_preaching_fields = ?, preaching_fields_count = ?, has_ordained_ministers = ?, ordained_ministers_count = ?,
      has_retired_pastors = ?, retired_pastors_count = ?, has_professionals = ?, professionals_json = ?, skills_json = ?,
      sunday_school_teachers = ?, has_age_divided_classes = ?, age_divided_classes_info = ?,
      institutions_json = ?, social_json = ?, equipment_json = ?, has_theology_teachers = ?, use_auto_census = ?, manual_census_json = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(...vals, id);

  const updated = db.prepare('SELECT * FROM churches WHERE id = ?').get(id);
  res.json({ church: hydrateChurch(toPlain(updated)) });
});

churchesRouter.delete('/:id', requireAuth, requireDistrictAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM churches WHERE id = ?').run(id);
  res.json({ ok: true });
});
