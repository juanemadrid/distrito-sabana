import { Router } from 'express';
import { canAccessChurch, requireAuth, requireDistrictAdmin } from '../auth';
import { db, toPlain, toPlainList } from '../db';

export const pastorsRouter = Router();

function safeJson(raw: unknown, fallback: unknown) {
  if (typeof raw !== 'string') return raw ?? fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function hydratePastor(row: Record<string, unknown>) {
  return {
    ...row,
    national_roles: safeJson(row.national_roles_json, []),
    district_roles: safeJson(row.district_roles_json, []),
    spouse_national_roles: safeJson(row.spouse_national_roles_json, []),
    spouse_district_roles: safeJson(row.spouse_district_roles_json, []),
    children: safeJson(row.children_json, []),
  };
}

pastorsRouter.get('/', requireAuth, (req, res) => {
  const isDistrict = req.user!.role === 'ADMIN_DISTRITO';
  const rows = isDistrict
    ? toPlainList(
        db
          .prepare(
            `SELECT p.*, c.name AS church_name, c.municipality AS church_municipality
             FROM pastors p
             LEFT JOIN churches c ON c.id = p.church_id
             ORDER BY p.full_name ASC`
          )
          .all()
      )
    : toPlainList(
        db
          .prepare(
            `SELECT p.*, c.name AS church_name, c.municipality AS church_municipality
             FROM pastors p
             LEFT JOIN churches c ON c.id = p.church_id
             WHERE p.church_id = ?
             ORDER BY p.full_name ASC`
          )
          .all(req.user!.church_id)
      );

  res.json({ pastors: rows.map(hydratePastor) });
});

pastorsRouter.get('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = db
    .prepare(
      `SELECT p.*, c.name AS church_name, c.municipality AS church_municipality
       FROM pastors p
       LEFT JOIN churches c ON c.id = p.church_id
       WHERE p.id = ?`
    )
    .get(id);
  if (!row) {
    res.status(404).json({ error: 'Pastor no encontrado.' });
    return;
  }
  const plain = toPlain(row);
  if (!canAccessChurch(req.user!, plain.church_id as number | null)) {
    res.status(403).json({ error: 'No tienes permiso para ver esta ficha pastoral.' });
    return;
  }
  res.json({ pastor: hydratePastor(plain) });
});

function extractPastorValues(b: Record<string, unknown>, forceChurchId?: number | null) {
  const churchId =
    forceChurchId !== undefined
      ? forceChurchId
      : b.church_id
      ? Number(b.church_id)
      : null;

  return [
    churchId,
    String(b.full_name || '').trim(),
    String(b.birth_date || ''),
    String(b.birth_place || ''),
    String(b.id_number || ''),
    String(b.phone || ''),
    String(b.email || ''),
    String(b.ministerial_dignity || 'PASTOR'),
    String(b.ministry_start_month || ''),
    String(b.ministry_start_year || ''),
    String(b.ministry_time_text || ''),
    String(b.past_churches || ''),
    JSON.stringify(b.national_roles || []),
    JSON.stringify(b.district_roles || []),
    b.has_contract ? 1 : 0,
    String(b.contract_type || 'NINGUNO'),
    b.pays_social_security ? 1 : 0,
    String(b.contract_entity || ''),
    Number(b.monthly_remuneration || 0),
    b.has_real_estate ? 1 : 0,
    String(b.real_estate_details || ''),
    String(b.academic_level || 'BACHILLER'),
    String(b.formal_theology_studies || ''),
    String(b.informal_theology_studies || ''),

    String(b.spouse_name || ''),
    String(b.spouse_birth_date || ''),
    String(b.spouse_birth_place || ''),
    String(b.spouse_id_number || ''),
    String(b.spouse_phone || ''),
    String(b.spouse_email || ''),
    String(b.spouse_dignity || 'NINGUNA'),
    b.spouse_receives_aid ? 1 : 0,
    Number(b.spouse_monthly_aid || 0),
    JSON.stringify(b.spouse_national_roles || []),
    JSON.stringify(b.spouse_district_roles || []),
    String(b.spouse_academic_level || ''),
    String(b.spouse_formal_theology || ''),
    String(b.spouse_informal_theology || ''),
    JSON.stringify(b.children || []),
    b.has_family_disability ? 1 : 0,
    String(b.disability_member || 'NINGUNO'),
    String(b.disability_details || ''),

    b.data_auth_accepted ? 1 : 0,
    String(b.data_auth_date || new Date().toISOString().slice(0, 10)),
    String(b.signature_name || b.full_name || ''),
    String(b.status || 'ACTIVO'),
  ];
}

pastorsRouter.post('/', requireAuth, (req, res) => {
  const b = req.body || {};
  if (!b.full_name || !String(b.full_name).trim()) {
    res.status(400).json({ error: 'El nombre completo del pastor es obligatorio.' });
    return;
  }
  const forcedChurch = req.user!.role === 'ADMIN_DISTRITO' ? undefined : req.user!.church_id;
  const vals = extractPastorValues(b, forcedChurch);

  const r = db
    .prepare(
      `INSERT INTO pastors (
        district_id, church_id, full_name, birth_date, birth_place, id_number, phone, email,
        ministerial_dignity, ministry_start_month, ministry_start_year, ministry_time_text, past_churches,
        national_roles_json, district_roles_json, has_contract, contract_type, pays_social_security,
        contract_entity, monthly_remuneration, has_real_estate, real_estate_details, academic_level,
        formal_theology_studies, informal_theology_studies,
        spouse_name, spouse_birth_date, spouse_birth_place, spouse_id_number, spouse_phone, spouse_email,
        spouse_dignity, spouse_receives_aid, spouse_monthly_aid, spouse_national_roles_json, spouse_district_roles_json,
        spouse_academic_level, spouse_formal_theology, spouse_informal_theology,
        children_json, has_family_disability, disability_member, disability_details,
        data_auth_accepted, data_auth_date, signature_name, status
      ) VALUES (1, ${vals.map(() => '?').join(', ')})`
    )
    .run(...vals);

  const created = db
    .prepare(
      `SELECT p.*, c.name AS church_name FROM pastors p LEFT JOIN churches c ON c.id = p.church_id WHERE p.id = ?`
    )
    .get(Number(r.lastInsertRowid));
  res.status(201).json({ pastor: hydratePastor(toPlain(created)) });
});

pastorsRouter.put('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, church_id FROM pastors WHERE id = ?').get(id) as
    | { id: number; church_id: number | null }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Pastor no encontrado.' });
    return;
  }
  if (!canAccessChurch(req.user!, existing.church_id)) {
    res.status(403).json({ error: 'No tienes permiso para editar esta ficha.' });
    return;
  }

  const b = req.body || {};
  const forcedChurch = req.user!.role === 'ADMIN_DISTRITO' ? undefined : existing.church_id;
  const vals = extractPastorValues(b, forcedChurch);

  db.prepare(
    `UPDATE pastors SET
      church_id = ?, full_name = ?, birth_date = ?, birth_place = ?, id_number = ?, phone = ?, email = ?,
      ministerial_dignity = ?, ministry_start_month = ?, ministry_start_year = ?, ministry_time_text = ?, past_churches = ?,
      national_roles_json = ?, district_roles_json = ?, has_contract = ?, contract_type = ?, pays_social_security = ?,
      contract_entity = ?, monthly_remuneration = ?, has_real_estate = ?, real_estate_details = ?, academic_level = ?,
      formal_theology_studies = ?, informal_theology_studies = ?,
      spouse_name = ?, spouse_birth_date = ?, spouse_birth_place = ?, spouse_id_number = ?, spouse_phone = ?, spouse_email = ?,
      spouse_dignity = ?, spouse_receives_aid = ?, spouse_monthly_aid = ?, spouse_national_roles_json = ?, spouse_district_roles_json = ?,
      spouse_academic_level = ?, spouse_formal_theology = ?, spouse_informal_theology = ?,
      children_json = ?, has_family_disability = ?, disability_member = ?, disability_details = ?,
      data_auth_accepted = ?, data_auth_date = ?, signature_name = ?, status = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(...vals, id);

  const updated = db
    .prepare(
      `SELECT p.*, c.name AS church_name FROM pastors p LEFT JOIN churches c ON c.id = p.church_id WHERE p.id = ?`
    )
    .get(id);
  res.json({ pastor: hydratePastor(toPlain(updated)) });
});

pastorsRouter.delete('/:id', requireAuth, requireDistrictAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM pastors WHERE id = ?').run(id);
  res.json({ ok: true });
});
