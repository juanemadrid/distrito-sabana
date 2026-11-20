import { hashPassword } from './auth';
import { db, initSchema } from './db';

export function seedIfEmpty(): void {
  initSchema();

  const existing = db.prepare('SELECT COUNT(*) AS cnt FROM districts').get() as { cnt: number };
  if (existing && existing.cnt > 0) return;

  console.log('Inicializando datos base de IGLEICO – Distrito Sabana...');

  // 1. Distrito Sabana (datos reales de liderazgo IGLEICO)
  const distRes = db
    .prepare(
      `INSERT INTO districts (name, organization, personeria, region, minister_name, substitute_minister_name, secretary_name, treasurer_name, email, phone, address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      'Distrito Sabana',
      'Iglesia Evangélica Interamericana de Colombia (IGLEICO)',
      'Personería Jurídica Especial 1134 del 2 de junio de 1998 – Ministerio del Interior',
      'Región Sabana / Costa Caribe Colombiana (Sucre y Córdoba)',
      'Rvdo. Jonás Pinto',
      'Carmen Bayesta',
      'Liceth Martínez',
      'Onelia Contreras',
      'distritosabana@igleico.com.co',
      '310 555 2480',
      'Sincelejo, Sucre – Colombia',
      'Circunscripción administrativa y ministerial de IGLEICO en la región Sabana.'
    );
  const districtId = Number(distRes.lastInsertRowid);

  // 2. Zonas del Distrito Sabana
  const insertZone = db.prepare(
    `INSERT INTO zones (district_id, name, coordinator_name, description) VALUES (?, ?, ?, ?)`
  );
  const z1 = Number(
    insertZone.run(districtId, 'Zona Centro – Sincelejo', 'Pr. Carlos Mendoza', 'Iglesias urbanas y periurbanas de Sincelejo y Corozal.').lastInsertRowid
  );
  const z2 = Number(
    insertZone.run(districtId, 'Zona Sabana Sur – Sampués / Chinú', 'Pr. Luis Alberto Díaz', 'Congregaciones de Sampués, Chinú y veredas aledañas.').lastInsertRowid
  );
  const z3 = Number(
    insertZone.run(districtId, 'Zona Montes de María – Ovejas / Los Palmitos', 'Pra. Martha Lucía Pérez', 'Iglesias y campos de predicación en Montes de María.').lastInsertRowid
  );

  // 3. Iglesias del Distrito Sabana
  const insertChurch = db.prepare(`
    INSERT INTO churches (
      district_id, zone_id, zone_name, name, address, stratum, neighborhood, municipality, department,
      phone, email, categorization, foundation_month, foundation_year,
      premises_type, property_owner_type, property_owner_name, rent_amount, has_pastoral_house, pastoral_house_rent,
      ownership_doc_type, pays_property_tax, property_tax_up_to_date, other_properties_json, has_leased_property, leased_property_income, vehicles_json,
      avg_monthly_income, has_bank_account, bank_nit, bank_name, bank_account_type, has_accounts_payable, has_hired_staff, hired_staff_json,
      has_copastor, copastor_name, copastor_phone, copastor_email, copastor_remuneration, copastor_no_pay,
      has_local_council, local_council_count, treasurer_name, treasurer_phone, treasurer_email, treasurer_academic,
      secretary_name, secretary_phone, secretary_email, secretary_academic,
      has_ucei, has_ujei, has_udei, has_unei,
      ministry_missions, ministry_discipleship, ministry_intercession, ministry_evangelism, ministry_worship, ministry_other,
      discipleship_program, has_preaching_fields, preaching_fields_count, has_ordained_ministers, ordained_ministers_count,
      has_retired_pastors, retired_pastors_count, has_professionals, professionals_json, skills_json,
      sunday_school_teachers, has_age_divided_classes, age_divided_classes_info,
      institutions_json, social_json, equipment_json, has_theology_teachers, use_auto_census
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const c1 = Number(
    insertChurch.run(
      districtId, z1, 'Zona Centro – Sincelejo',
      'Iglesia Evangélica Interamericana El Redentor',
      'Calle 25 # 18-42', '2', 'Barrio La Floresta', 'Sincelejo', 'Sucre',
      '301 442 8890', 'elredentor.sabana@igleico.com.co', 'CONSTITUIDA', '04', '1999',
      'PROPIO', 'IGLEICO', '', 0, 1, 0,
      'ESCRITURA', 1, 'SI',
      JSON.stringify({ colegio: { exists: false, owner: '' }, finca: { exists: false, owner: '' }, lote: { exists: true, owner: 'IGLEICO' }, local_comercial: { exists: false, owner: '' }, otro: { exists: false, label: '', owner: '' } }),
      0, 0,
      JSON.stringify({ has_car: false, has_moto: true, owner_type: 'IGLEICO', owner_third_party: '', sold_transfer_done: '' }),
      4850000, 1, '890.905.568-5', 'Bancolombia', 'Ahorros', 1, 0, '[]',
      1, 'Diác. Pedro Nel Gómez', '314 778 9021', 'pedro.gomez@correo.com', 0, 1,
      1, 7, 'Sandra Milena Torres', '312 650 3312', 'sandra.tesoreria@correo.com', 'Tecnóloga en Contabilidad',
      'Andrés Felipe Ramos', '300 812 4419', 'andres.secretaria@correo.com', 'Técnico Administrativo',
      1, 1, 1, 1,
      1, 1, 1, 1, 1, 'Ministerio de Medios y Sonido',
      'Vida Nueva en Cristo – Cartilla IGLEICO', 1, 2, 1, 1,
      0, 0, 1,
      JSON.stringify([{ profession: 'Docente', count: 3 }, { profession: 'Contador / Aux. Contable', count: 2 }, { profession: 'Enfermería', count: 2 }, { profession: 'Ingeniero de Sistemas', count: 1 }]),
      JSON.stringify({ communication: true, journalism: false, content: true, cameraman: true, image_editing: true, programmer: true, presenter: true }),
      6, 1, 'Cuna (0-5), Semillas (6-11), Exploradores (12-14)',
      JSON.stringify({ school: { exists: false, name: '' }, cdi: { exists: false, name: '' }, foundation: { exists: false, name: '' }, association: { exists: false, name: '' }, business: { exists: false, count: 0, activity: '' } }),
      JSON.stringify({ facebook: 'IGLEICO El Redentor Sincelejo', tiktok: '@elredentor.sabana', instagram: '@igleico_elredentor', whatsapp: '3014428890', youtube: 'Iglesia El Redentor IGLEICO', has_website: false, website_name: '', has_tv_channel: false, has_virtual_radio: false }),
      JSON.stringify({ camera: true, videobeam: true, screen: true, computer: true, other: 'Consola digital 16 canales y 4 micrófonos inalámbricos' }),
      1, 1
    ).lastInsertRowid
  );

  const c2 = Number(
    insertChurch.run(
      districtId, z1, 'Zona Centro – Sincelejo',
      'Iglesia Central de Corozal – Betel',
      'Carrera 28 # 31-15', '3', 'Barrio San José', 'Corozal', 'Sucre',
      '315 620 1184', 'betel.corozal@igleico.com.co', 'CONSTITUIDA', '08', '1992',
      'PROPIO', 'IGLEICO_CENTRAL', '', 0, 1, 0,
      'ESCRITURA', 1, 'SI', '{}', 0, 0,
      JSON.stringify({ has_car: false, has_moto: false, owner_type: '', owner_third_party: '', sold_transfer_done: '' }),
      6200000, 1, '811.031.238-0', 'Banco Agrario', 'Ahorros', 0, 1,
      JSON.stringify([{ contract_type: 'Prestación de servicios (Aseo)', value: 550000, start_date: '2026-01-15', end_date: '2026-12-15', pays_social_security: false }]),
      0, '', '', '', 0, 1,
      1, 9, 'Yolanda Esther Vergara', '311 402 9987', 'yolanda.v@correo.com', 'Contadora Pública',
      'Jorge Iván Salgado', '318 220 5411', 'jorge.s@correo.com', 'Universitario',
      1, 1, 1, 1,
      1, 1, 1, 1, 1, '',
      'Discipulado Interamericano Nivel 1 y 2', 1, 1, 1, 2,
      1, 1, 1,
      JSON.stringify([{ profession: 'Contador Público', count: 1 }, { profession: 'Abogado', count: 1 }, { profession: 'Docente', count: 4 }]),
      JSON.stringify({ communication: true, journalism: true, content: true, cameraman: false, image_editing: true, programmer: false, presenter: true }),
      8, 1, '4 salones divididos por edad escolar',
      JSON.stringify({ school: { exists: false, name: '' }, cdi: { exists: true, name: 'CDI Semillitas de Fe Corozal' }, foundation: { exists: false, name: '' }, association: { exists: false, name: '' }, business: { exists: false, count: 0, activity: '' } }),
      JSON.stringify({ facebook: 'IGLEICO Betel Corozal', tiktok: '', instagram: '@betelcorozal', whatsapp: '3156201184', youtube: '', has_website: false, website_name: '', has_tv_channel: false, has_virtual_radio: true }),
      JSON.stringify({ camera: true, videobeam: true, screen: true, computer: true, other: 'Sistema de sonido exterior' }),
      1, 1
    ).lastInsertRowid
  );

  const c3 = Number(
    insertChurch.run(
      districtId, z2, 'Zona Sabana Sur – Sampués / Chinú',
      'Iglesia Monte de Sion – Sampués',
      'Calle 14 # 9-20', '1', 'Barrio 12 de Octubre', 'Sampués', 'Sucre',
      '320 715 4409', 'montesion.sampues@igleico.com.co', 'EN_FORMACION', '11', '2018',
      'ARRENDADO', 'TERCERO', 'Familia Hernández Paternina', 850000, 0, 500000,
      'NINGUNO', 0, 'NO_APLICA', '{}', 0, 0, '{}',
      2150000, 0, '', '', '', 0, 0, '[]',
      0, '', '', '', 0, 1,
      1, 5, 'Luz Marina Sierra', '310 998 3120', 'luz.sierra@correo.com', 'Bachiller',
      'Keiner José Mercado', '321 440 1209', 'keiner.m@correo.com', 'Técnico en Sistemas',
      0, 1, 1, 1,
      0, 1, 1, 1, 1, '',
      'Fundamentos Cristianos', 0, 0, 0, 0,
      0, 0, 0, '[]',
      JSON.stringify({ communication: false, journalism: false, content: true, cameraman: false, image_editing: false, programmer: false, presenter: false }),
      3, 1, 'Niños pequeños (0-6) y mayores (7-12)',
      '{}',
      JSON.stringify({ facebook: 'IGLEICO Monte de Sion Sampués', tiktok: '', instagram: '', whatsapp: '3207154409', youtube: '', has_website: false, website_name: '', has_tv_channel: false, has_virtual_radio: false }),
      JSON.stringify({ camera: false, videobeam: true, screen: false, computer: true, other: 'Cabina activa 15 pulgadas' }),
      0, 1
    ).lastInsertRowid
  );

  const c4 = Number(
    insertChurch.run(
      districtId, z3, 'Zona Montes de María – Ovejas / Los Palmitos',
      'Campo de Predicación Luz del Evangelio',
      'Vereda Don Gabriel, Casa Comunal', '1', 'Vereda Don Gabriel', 'Ovejas', 'Sucre',
      '313 880 7721', '', 'CAMPO_PREDICACION', '03', '2023',
      'PRESTADO', 'TERCERO', 'Hno. Rafael Contreras', 0, 0, 0,
      'NINGUNO', 0, 'NO_APLICA', '{}', 0, 0, '{}',
      650000, 0, '', '', '', 0, 0, '[]',
      0, '', '', '', 0, 1,
      0, 0, 'María del Carmen Oviedo', '314 331 0981', '', 'Primaria',
      'Dairo Luis Álvarez', '312 889 4321', '', 'Bachiller',
      0, 1, 1, 1,
      0, 1, 1, 1, 0, '',
      'Discipulado básico rural', 0, 0, 0, 0,
      0, 0, 0, '[]', '{}',
      2, 0, 'Clase única infantil',
      '{}', '{}',
      JSON.stringify({ camera: false, videobeam: false, screen: false, computer: false, other: 'Parlante recargable' }),
      0, 1
    ).lastInsertRowid
  );

  // 4. Pastores (Formato Oficial IGLEICO completo)
  const insertPastor = db.prepare(`
    INSERT INTO pastors (
      district_id, church_id, full_name, birth_date, birth_place, id_number, phone, email,
      ministerial_dignity, ministry_start_month, ministry_start_year, ministry_time_text, past_churches,
      national_roles_json, district_roles_json,
      has_contract, contract_type, pays_social_security, contract_entity, monthly_remuneration,
      has_real_estate, real_estate_details, academic_level, formal_theology_studies, informal_theology_studies,
      spouse_name, spouse_birth_date, spouse_birth_place, spouse_id_number, spouse_phone, spouse_email,
      spouse_dignity, spouse_receives_aid, spouse_monthly_aid, spouse_national_roles_json, spouse_district_roles_json,
      spouse_academic_level, spouse_formal_theology, spouse_informal_theology,
      children_json, has_family_disability, disability_member, disability_details,
      data_auth_accepted, data_auth_date, signature_name, status
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  insertPastor.run(
    districtId, c1, 'Carlos Eduardo Mendoza Arrieta', '1979-05-14', 'Sincelejo, Sucre', '92.541.880', '301 442 8890', 'carlos.mendoza@igleico.com.co',
    'PASTOR', '02', '2012', '14 años', 'Campo El Carmen (2012-2016), Iglesia Nueva Vida Tolú (2016-2020), Iglesia El Redentor Sincelejo (2020-actual)',
    JSON.stringify([{ role: 'Delegado Asamblea Nacional', duration: '2021 - 2025' }]),
    JSON.stringify([{ role: 'Coordinador Zona Centro Distrito Sabana', duration: '2023 - Actual' }]),
    1, 'ACUERDO_EMOLUMENTOS', 1, 'IGLEICO', 2200000,
    1, 'Casa familiar en Barrio Las Margaritas, Sincelejo', 'UNIVERSITARIO',
    'Licenciatura en Teología – Seminario Bíblico Interamericano (Aprobado MEN)', 'Diplomado en Consejería Pastoral y Liderazgo',
    'Ana Milena Beltrán Castro', '1982-11-03', 'Corozal, Sucre', '64.582.104', '301 510 2231', 'ana.beltran@correo.com',
    'LIDER', 1, 350000, '[]',
    JSON.stringify([{ role: 'Comité Distrital UDEI Sabana', duration: '2022 - Actual' }]),
    'TECNOLOGO', 'Técnico en Ministerio Infantil', 'Seminarios de Damas UDEI',
    JSON.stringify([
      { name: 'Samuel David Mendoza Beltrán', birth_date: '2009-08-21' },
      { name: 'Sara Sofía Mendoza Beltrán', birth_date: '2015-03-10' }
    ]),
    0, 'NINGUNO', '',
    1, '2026-01-18', 'Carlos Eduardo Mendoza Arrieta', 'ACTIVO'
  );

  insertPastor.run(
    districtId, c2, 'Jonás Pinto Madera', '1972-09-22', 'Corozal, Sucre', '92.190.345', '310 555 2480', 'jonas.pinto@igleico.com.co',
    'REVERENDO', '06', '2001', '25 años', 'Iglesia San Marcos (2001-2008), Iglesia Sincelejo Norte (2008-2016), Iglesia Betel Corozal (2016-actual)',
    JSON.stringify([{ role: 'Vocal Junta Nacional IGLEICO', duration: '2018 - 2022' }]),
    JSON.stringify([{ role: 'Ministro Distrital – Distrito Sabana', duration: '2022 - Actual' }]),
    1, 'LABORAL_TERMINO_INDEFINIDO', 1, 'IGLEICO_CENTRAL', 2800000,
    1, 'Vivienda propia en Corozal', 'POSTGRADO',
    'Teología Profesional y Especialización en Gerencia Ministerial', 'Congresos Internacionales SMI',
    'Claudia Patricia Ríos', '1976-04-12', 'Montería, Córdoba', '50.892.311', '310 612 7781', 'claudia.rios@correo.com',
    'PASTOR', 0, 0, '[]', JSON.stringify([{ role: 'Asesora Distrital de Familias', duration: '2022 - Actual' }]),
    'UNIVERSITARIO', 'Seminario Bíblico Interamericano', 'Escuelas de Liderazgo Femenino',
    JSON.stringify([{ name: 'Daniel Felipe Pinto Ríos', birth_date: '2003-01-15' }]),
    0, 'NINGUNO', '',
    1, '2026-01-10', 'Rvdo. Jonás Pinto Madera', 'ACTIVO'
  );

  insertPastor.run(
    districtId, c3, 'Luis Alberto Díaz Salcedo', '1986-02-19', 'Sampués, Sucre', '1.102.814.902', '320 715 4409', 'luis.diaz@igleico.com.co',
    'PASTOR', '07', '2018', '8 años', 'Iglesia Monte de Sion Sampués (2018-actual)',
    '[]', JSON.stringify([{ role: 'Coordinador Zona Sabana Sur', duration: '2024 - Actual' }]),
    1, 'ACUERDO_EMOLUMENTOS', 1, 'IGLEICO', 1300000,
    0, '', 'TECNICO', 'Tecnología en Estudios Bíblicos (en curso)', 'Instituto Bíblico Distrital Sabana',
    'Yurleidys Paola Montes', '1989-10-08', 'Chinú, Córdoba', '1.069.431.220', '320 882 1190', '',
    'LIDER', 0, 0, '[]', '[]', 'BACHILLER', '', 'Escuela de Maestros UNEI',
    JSON.stringify([
      { name: 'Mateo Díaz Montes', birth_date: '2017-06-02' },
      { name: 'Salomé Díaz Montes', birth_date: '2022-09-14' }
    ]),
    0, 'NINGUNO', '',
    1, '2026-02-05', 'Luis Alberto Díaz Salcedo', 'ACTIVO'
  );

  insertPastor.run(
    districtId, c4, 'Martha Lucía Pérez Ortega', '1984-12-01', 'Ovejas, Sucre', '64.702.318', '313 880 7721', 'martha.perez@igleico.com.co',
    'LIDER', '03', '2023', '3 años', 'Campo de Predicación Luz del Evangelio (2023-actual)',
    '[]', '[]',
    0, 'NINGUNO', 0, '', 450000,
    0, '', 'BACHILLER', '', 'Escuela de Obreros y Misioneros IGLEICO',
    '', '', '', '', '', '', 'NINGUNA', 0, 0, '[]', '[]', '', '', '',
    '[]', 0, 'NINGUNO', '',
    1, '2026-02-12', 'Martha Lucía Pérez Ortega', 'ACTIVO'
  );

  // 5. Usuarios del sistema (Multi-rol)
  const insertUser = db.prepare(
    `INSERT INTO users (username, email, password_hash, full_name, role, church_id) VALUES (?, ?, ?, ?, ?, ?)`
  );
  // Admin Distrito Sabana
  insertUser.run('distrito', 'distritosabana@igleico.com.co', hashPassword('sabana2026'), 'Directiva Distrito Sabana (Rvdo. Jonás Pinto)', 'ADMIN_DISTRITO', null);
  // Pastor Iglesia El Redentor
  insertUser.run('elredentor', 'carlos.mendoza@igleico.com.co', hashPassword('redentor2026'), 'Pr. Carlos Mendoza – El Redentor', 'PASTOR_LOCAL', c1);
  // Tesorera Iglesia El Redentor
  insertUser.run('tesoreria', 'sandra.tesoreria@correo.com', hashPassword('tesoreria2026'), 'Sandra Torres – Tesorera El Redentor', 'TESORERO_LOCAL', c1);
  // Pastor Iglesia Betel Corozal
  insertUser.run('betel', 'betel.corozal@igleico.com.co', hashPassword('betel2026'), 'Directiva Local – Betel Corozal', 'PASTOR_LOCAL', c2);

  // 6. Miembros (Congregación realista distribuida por edades y organismos UCEI/UDEI/UJEI/UNEI)
  const insertMember = db.prepare(`
    INSERT INTO members (
      church_id, full_name, id_number, phone, email, birth_date, gender, address,
      baptism_status, baptism_date, organism, church_role, profession, comm_skills, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const membersElRedentor: Array<[string, string, string, string, string, string, string, string, string, string, string, string, string]> = [
    ['Sandra Milena Torres Ruiz', '64.571.220', '312 650 3312', 'sandra.t@correo.com', '1983-04-18', 'F', 'Barrio La Floresta', 'BAUTIZADO', '2004-06-15', 'UDEI', 'Tesorera Local', 'Tecnóloga en Contabilidad', ''],
    ['Pedro Nel Gómez Acosta', '92.518.903', '314 778 9021', 'pedro.g@correo.com', '1975-10-02', 'M', 'Barrio Las Peñitas', 'BAUTIZADO', '2001-12-20', 'UCEI', 'Copastor / Diácono', 'Comerciante', 'Presentador'],
    ['Andrés Felipe Ramos Pineda', '1.102.861.440', '300 812 4419', 'andres.r@correo.com', '1997-07-11', 'M', 'Barrio La Floresta', 'BAUTIZADO', '2016-04-10', 'UJEI', 'Secretario Local', 'Ingeniero de Sistemas', 'Programador, Edición'],
    ['María Alejandra Navarro Gil', '1.102.889.310', '315 901 4482', 'maria.n@correo.com', '2001-02-25', 'F', 'Barrio Boston', 'BAUTIZADO', '2019-08-18', 'UJEI', 'Líder de Alabanza', 'Docente', 'Creación de contenido'],
    ['José Gregorio Salgado', '92.411.005', '311 452 0987', '', '1961-08-30', 'M', 'Barrio La Palma', 'BAUTIZADO', '1999-05-01', 'UCEI', 'Anciano / Intercesión', 'Pensionado', ''],
    ['Luz Dary Mercado Vergara', '64.520.891', '304 619 2210', '', '1963-11-12', 'F', 'Barrio La Floresta', 'BAUTIZADO', '2000-03-14', 'UDEI', 'Coordinadora UDEI', 'Modista', ''],
    ['Jhonatan David Pérez Ruiz', '1.102.895.102', '320 441 7890', 'jhonatan.p@correo.com', '2003-09-05', 'M', 'Barrio Venecia', 'NO_BAUTIZADO', '', 'UJEI', 'Equipo de Sonido', 'Estudiante Universitario', 'Camarógrafo'],
    ['Camila Andrea Ortiz Lara', '1.102.912.334', '301 774 3019', '', '2013-05-19', 'F', 'Barrio La Floresta', 'BAUTIZADO', '2025-11-02', 'UJEI', 'Adolescente Coro', 'Estudiante', ''],
    ['Santiago José Gómez Torres', '1.102.940.112', '314 778 9021', '', '2018-01-22', 'M', 'Barrio Las Peñitas', 'NINO', '', 'UNEI', 'Escuela Dominical', '', ''],
    ['Isabella Sofía Ramos', '1.102.955.801', '300 812 4419', '', '2022-06-14', 'F', 'Barrio La Floresta', 'NINO', '', 'UNEI', 'Cuna UNEI', '', ''],
    ['Lucas Mateo Navarro', '', '315 901 4482', '', '2026-04-02', 'M', 'Barrio Boston', 'NINO', '', 'UNEI', 'Primera Infancia', '', ''],
    ['Roberto Carlos Benítez', '92.559.104', '316 332 1098', '', '1988-03-27', 'M', 'Barrio La Cruz', 'NO_BAUTIZADO', '', 'UCEI', 'Asistente en Discipulado', 'Técnico Electricista', ''],
    ['Yadira del Carmen Ospino', '64.599.710', '312 819 6654', 'yadira.o@correo.com', '1980-12-09', 'F', 'Barrio Las Margaritas', 'BAUTIZADO', '2010-07-20', 'UDEI', 'Maestra Escuela Dominical', 'Enfermera', ''],
    ['Esteban Camilo Barrios', '1.102.903.418', '321 908 1134', '', '2012-10-30', 'M', 'Barrio La Cruz', 'NO_BAUTIZADO', '', 'UJEI', 'Adolescentes', 'Estudiante', ''],
  ];

  const memberIdsC1: number[] = [];
  for (const m of membersElRedentor) {
    const res = insertMember.run(c1, ...m, 'ACTIVO', '');
    memberIdsC1.push(Number(res.lastInsertRowid));
  }

  // Miembros Iglesia Betel Corozal
  const membersBetel: Array<[string, string, string, string, string, string, string, string, string, string, string, string, string]> = [
    ['Yolanda Esther Vergara', '64.512.008', '311 402 9987', 'yolanda.v@correo.com', '1978-06-15', 'F', 'Barrio San José', 'BAUTIZADO', '1998-04-12', 'UDEI', 'Tesorera Local', 'Contadora Pública', ''],
    ['Jorge Iván Salgado', '92.530.774', '318 220 5411', 'jorge.s@correo.com', '1985-02-09', 'M', 'Barrio El Jardín', 'BAUTIZADO', '2007-11-18', 'UCEI', 'Secretario Local', 'Abogado', 'Comunicación'],
    ['Valeria Lucía Mendoza', '1.103.112.900', '300 441 9201', '', '2004-08-14', 'F', 'Barrio San José', 'BAUTIZADO', '2021-05-09', 'UJEI', 'Coordinadora UJEI', 'Estudiante', 'Edición'],
    ['Miguel Ángel Contreras', '92.220.411', '315 809 3321', '', '1958-01-25', 'M', 'Centro Corozal', 'BAUTIZADO', '1994-09-03', 'UCEI', 'Diácono', 'Agricultor', ''],
    ['Sofía Valentina Salgado', '', '318 220 5411', '', '2019-07-04', 'F', 'Barrio El Jardín', 'NINO', '', 'UNEI', 'Escuela Dominical', '', ''],
  ];
  const memberIdsC2: number[] = [];
  for (const m of membersBetel) {
    const res = insertMember.run(c2, ...m, 'ACTIVO', '');
    memberIdsC2.push(Number(res.lastInsertRowid));
  }

  // Miembros Monte de Sion Sampués
  const membersSampues: Array<[string, string, string, string, string, string, string, string, string, string, string, string, string]> = [
    ['Luz Marina Sierra', '64.611.209', '310 998 3120', '', '1981-09-12', 'F', 'Barrio 12 de Octubre', 'BAUTIZADO', '2019-04-21', 'UDEI', 'Tesorera Local', 'Comerciante', ''],
    ['Keiner José Mercado', '1.104.221.880', '321 440 1209', '', '2000-03-19', 'M', 'Barrio Millán Vargas', 'BAUTIZADO', '2020-12-06', 'UJEI', 'Secretario Local', 'Técnico en Sistemas', 'Contenido'],
    ['Hernán Darío Paternina', '92.601.552', '312 771 0091', '', '1990-05-04', 'M', 'Vereda Escobar Arriba', 'NO_BAUTIZADO', '', 'UCEI', 'Asistente', 'Artesano', ''],
    ['Mariana Díaz Montes', '', '320 715 4409', '', '2017-06-02', 'F', 'Barrio 12 de Octubre', 'NINO', '', 'UNEI', 'Niñez', '', ''],
  ];
  for (const m of membersSampues) {
    insertMember.run(c3, ...m, 'ACTIVO', '');
  }

  // Miembros Campo Luz del Evangelio
  insertMember.run(c4, 'María del Carmen Oviedo', '64.788.120', '314 331 0981', '', '1977-11-28', 'F', 'Vereda Don Gabriel', 'BAUTIZADO', '2023-10-15', 'UDEI', 'Tesorera', 'Agricultora', '', 'ACTIVO', '');
  insertMember.run(c4, 'Dairo Luis Álvarez', '1.104.889.310', '312 889 4321', '', '1999-04-08', 'M', 'Vereda Don Gabriel', 'BAUTIZADO', '2024-03-31', 'UJEI', 'Secretario', 'Mototaxista', '', 'ACTIVO', '');

  // 7. Actividades (Ventas pro-fondos, Campamento Distrital, etc. con deudores y abonos reales!)
  const insertActivity = db.prepare(`
    INSERT INTO activities (
      district_id, church_id, scope, name, activity_type, organism, event_date, location,
      responsible_name, unit_label, unit_price, goal_amount, description, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const act1 = Number(
    insertActivity.run(
      districtId, c1, 'LOCAL',
      'Venta de Arroz con Pollo Pro-Templo', 'VENTA_RECAUDO', 'PRO_TEMPLO',
      '2026-11-15', 'Templo El Redentor – Sincelejo',
      'Sandra Milena Torres (UDEI)', 'Plato', 18000, 1800000,
      'Recaudación para pintura de fachada y mantenimiento de aires acondicionados del templo.',
      'ACTIVA', 2
    ).lastInsertRowid
  );

  const act2 = Number(
    insertActivity.run(
      districtId, c1, 'LOCAL',
      'Rifa Pro-Sonido y Equipos UJEI', 'VENTA_RECAUDO', 'UJEI',
      '2026-11-28', 'Iglesia El Redentor',
      'Andrés Felipe Ramos', 'Boleta', 10000, 1200000,
      'Venta de talonarios de boletas (cada hermano se lleva boletas y reporta recaudo).',
      'ACTIVA', 2
    ).lastInsertRowid
  );

  const act3 = Number(
    insertActivity.run(
      districtId, null, 'DISTRITAL',
      'Congreso Distrital de Jóvenes UJEI Sabana 2026', 'EVENTO_CUOTA', 'UJEI',
      '2026-12-06', 'Coliseo Las Delicias – Sincelejo',
      'Directiva UJEI Distrito Sabana', 'Inscripción', 45000, 4500000,
      'Encuentro anual de todas las iglesias del Distrito Sabana. Control de asistencia, quién debe ir y pagos de inscripción.',
      'ACTIVA', 1
    ).lastInsertRowid
  );

  const act4 = Number(
    insertActivity.run(
      districtId, c2, 'LOCAL',
      'Almuerzo Misionero Pro-Campo de Predicación', 'VENTA_RECAUDO', 'MISIONES',
      '2026-11-08', 'Iglesia Betel – Corozal',
      'Yolanda Esther Vergara', 'Almuerzo', 20000, 1400000,
      'Apoyo económico al campo de predicación y transporte misionero.',
      'ACTIVA', 4
    ).lastInsertRowid
  );

  // Participantes y pagos/abonos de Actividades + registro automático en Finanzas
  const insertPart = db.prepare(`
    INSERT INTO activity_participants (
      activity_id, church_id, member_id, person_name, person_phone, is_member,
      item_detail, quantity, unit_price, assigned_amount, paid_amount, attendance_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTx = db.prepare(`
    INSERT INTO financial_transactions (
      district_id, church_id, scope, type, category, amount, tx_date, description,
      member_id, person_name, activity_id, payment_method, receipt_number, recorded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPay = db.prepare(`
    INSERT INTO activity_payments (
      participant_id, activity_id, amount, payment_date, payment_method, notes, finance_tx_id, recorded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  function addParticipantWithPayment(opts: {
    activityId: number;
    churchId: number | null;
    scope: 'LOCAL' | 'DISTRITAL';
    memberId: number | null;
    name: string;
    phone: string;
    isMember: boolean;
    detail: string;
    qty: number;
    unitPrice: number;
    paid: number;
    payDate?: string;
    method?: string;
    attendance: string;
    notes?: string;
    actName: string;
  }) {
    const assigned = opts.qty * opts.unitPrice;
    const pRes = insertPart.run(
      opts.activityId, opts.churchId, opts.memberId, opts.name, opts.phone, opts.isMember ? 1 : 0,
      opts.detail, opts.qty, opts.unitPrice, assigned, opts.paid, opts.attendance, opts.notes || ''
    );
    const partId = Number(pRes.lastInsertRowid);
    if (opts.paid > 0) {
      const txRes = insertTx.run(
        districtId, opts.churchId, opts.scope, 'INGRESO', 'ACTIVIDAD', opts.paid,
        opts.payDate || '2026-11-15', `Recaudo actividad: ${opts.actName} – ${opts.name} (${opts.detail})`,
        opts.memberId, opts.name, opts.activityId, opts.method || 'EFECTIVO',
        `ACT-${opts.activityId}-${partId}`, 2
      );
      const txId = Number(txRes.lastInsertRowid);
      insertPay.run(
        partId, opts.activityId, opts.paid, opts.payDate || '2026-11-15',
        opts.method || 'EFECTIVO', 'Abono registrado', txId, 2
      );
    }
  }

  // Actividad 1: Venta de Arroz con Pollo (El Redentor) — mezcla de pagados, abonos parciales y deudores
  addParticipantWithPayment({
    activityId: act1, churchId: c1, scope: 'LOCAL', memberId: memberIdsC1[0],
    name: 'Sandra Milena Torres Ruiz', phone: '312 650 3312', isMember: true,
    detail: '10 platos vendidos en su barrio', qty: 10, unitPrice: 18000, paid: 180000,
    payDate: '2026-11-15', method: 'EFECTIVO', attendance: 'ASISTIO', actName: 'Venta de Arroz con Pollo Pro-Templo'
  });
  addParticipantWithPayment({
    activityId: act1, churchId: c1, scope: 'LOCAL', memberId: memberIdsC1[1],
    name: 'Pedro Nel Gómez Acosta', phone: '314 778 9021', isMember: true,
    detail: '8 platos (llevó para familiares)', qty: 8, unitPrice: 18000, paid: 90000,
    payDate: '2026-11-15', method: 'NEQUI', attendance: 'ASISTIO', notes: 'Quedó de cancelar el resto el domingo',
    actName: 'Venta de Arroz con Pollo Pro-Templo'
  });
  addParticipantWithPayment({
    activityId: act1, churchId: c1, scope: 'LOCAL', memberId: memberIdsC1[2],
    name: 'Andrés Felipe Ramos Pineda', phone: '300 812 4419', isMember: true,
    detail: '5 platos', qty: 5, unitPrice: 18000, paid: 90000,
    payDate: '2026-11-15', method: 'TRANSFERENCIA', attendance: 'ASISTIO', actName: 'Venta de Arroz con Pollo Pro-Templo'
  });
  addParticipantWithPayment({
    activityId: act1, churchId: c1, scope: 'LOCAL', memberId: memberIdsC1[11],
    name: 'Roberto Carlos Benítez', phone: '316 332 1098', isMember: true,
    detail: '4 platos fiados', qty: 4, unitPrice: 18000, paid: 0,
    attendance: 'ASISTIO', notes: 'Se llevó los 4 platos, paga en quincena',
    actName: 'Venta de Arroz con Pollo Pro-Templo'
  });
  addParticipantWithPayment({
    activityId: act1, churchId: c1, scope: 'LOCAL', memberId: memberIdsC1[12],
    name: 'Yadira del Carmen Ospino', phone: '312 819 6654', isMember: true,
    detail: '6 platos para compañeras del hospital', qty: 6, unitPrice: 18000, paid: 54000,
    payDate: '2026-11-16', method: 'NEQUI', attendance: 'CONFIRMADO', notes: 'Abonó 3 platos, debe 3 platos',
    actName: 'Venta de Arroz con Pollo Pro-Templo'
  });
  addParticipantWithPayment({
    activityId: act1, churchId: c1, scope: 'LOCAL', memberId: null,
    name: 'Carlos Julio Madera (Vecino externo)', phone: '310 223 4490', isMember: false,
    detail: '3 platos por encargo', qty: 3, unitPrice: 18000, paid: 54000,
    payDate: '2026-11-15', method: 'EFECTIVO', attendance: 'CONFIRMADO', actName: 'Venta de Arroz con Pollo Pro-Templo'
  });

  // Actividad 2: Rifa UJEI
  addParticipantWithPayment({
    activityId: act2, churchId: c1, scope: 'LOCAL', memberId: memberIdsC1[3],
    name: 'María Alejandra Navarro Gil', phone: '315 901 4482', isMember: true,
    detail: 'Talonario #01 (10 boletas)', qty: 10, unitPrice: 10000, paid: 60000,
    payDate: '2026-11-17', method: 'NEQUI', attendance: 'CONFIRMADO', notes: 'Faltan 4 boletas por entregar dinero',
    actName: 'Rifa Pro-Sonido y Equipos UJEI'
  });
  addParticipantWithPayment({
    activityId: act2, churchId: c1, scope: 'LOCAL', memberId: memberIdsC1[6],
    name: 'Jhonatan David Pérez Ruiz', phone: '320 441 7890', isMember: true,
    detail: 'Talonario #02 (10 boletas)', qty: 10, unitPrice: 10000, paid: 0,
    attendance: 'CONVOCADO', notes: 'Se llevó el talonario completo',
    actName: 'Rifa Pro-Sonido y Equipos UJEI'
  });

  // Actividad 3: Congreso Distrital UJEI (varias iglesias!)
  addParticipantWithPayment({
    activityId: act3, churchId: c1, scope: 'DISTRITAL', memberId: memberIdsC1[2],
    name: 'Andrés Felipe Ramos Pineda', phone: '300 812 4419', isMember: true,
    detail: 'Inscripción + almuerzo (El Redentor)', qty: 1, unitPrice: 45000, paid: 45000,
    payDate: '2026-11-10', method: 'TRANSFERENCIA', attendance: 'CONFIRMADO', actName: 'Congreso Distrital de Jóvenes UJEI Sabana 2026'
  });
  addParticipantWithPayment({
    activityId: act3, churchId: c1, scope: 'DISTRITAL', memberId: memberIdsC1[3],
    name: 'María Alejandra Navarro Gil', phone: '315 901 4482', isMember: true,
    detail: 'Inscripción (El Redentor)', qty: 1, unitPrice: 45000, paid: 25000,
    payDate: '2026-11-14', method: 'NEQUI', attendance: 'CONFIRMADO', notes: 'Debe $20.000 antes del congreso',
    actName: 'Congreso Distrital de Jóvenes UJEI Sabana 2026'
  });
  addParticipantWithPayment({
    activityId: act3, churchId: c2, scope: 'DISTRITAL', memberId: memberIdsC2[2],
    name: 'Valeria Lucía Mendoza', phone: '300 441 9201', isMember: true,
    detail: 'Inscripción + delegación (Betel Corozal)', qty: 1, unitPrice: 45000, paid: 45000,
    payDate: '2026-11-12', method: 'EFECTIVO', attendance: 'CONFIRMADO', actName: 'Congreso Distrital de Jóvenes UJEI Sabana 2026'
  });
  addParticipantWithPayment({
    activityId: act3, churchId: c1, scope: 'DISTRITAL', memberId: memberIdsC1[6],
    name: 'Jhonatan David Pérez Ruiz', phone: '320 441 7890', isMember: true,
    detail: 'Inscripción (El Redentor)', qty: 1, unitPrice: 45000, paid: 0,
    attendance: 'CONVOCADO', notes: 'Convocado como equipo audiovisual',
    actName: 'Congreso Distrital de Jóvenes UJEI Sabana 2026'
  });

  // Actividad 4: Almuerzo Misionero Betel Corozal
  addParticipantWithPayment({
    activityId: act4, churchId: c2, scope: 'LOCAL', memberId: memberIdsC2[0],
    name: 'Yolanda Esther Vergara', phone: '311 402 9987', isMember: true,
    detail: '12 almuerzos', qty: 12, unitPrice: 20000, paid: 240000,
    payDate: '2026-11-08', method: 'EFECTIVO', attendance: 'ASISTIO', actName: 'Almuerzo Misionero Pro-Campo de Predicación'
  });
  addParticipantWithPayment({
    activityId: act4, churchId: c2, scope: 'LOCAL', memberId: memberIdsC2[1],
    name: 'Jorge Iván Salgado', phone: '318 220 5411', isMember: true,
    detail: '6 almuerzos', qty: 6, unitPrice: 20000, paid: 80000,
    payDate: '2026-11-08', method: 'TRANSFERENCIA', attendance: 'ASISTIO', notes: 'Saldo pendiente de 2 almuerzos',
    actName: 'Almuerzo Misionero Pro-Campo de Predicación'
  });

  // 8. Movimientos Financieros históricos (últimos 6 meses: Jun-Nov 2026) para gráficos y reportes reales
  const monthlySeeds = [
    { month: '2026-06', c1Inc: [1650000, 1420000, 680000], c1Exp: [2200000, 460000, 380000], c2Inc: [2100000, 1850000], c2Exp: [2800000, 520000] },
    { month: '2026-07', c1Inc: [1780000, 1510000, 520000], c1Exp: [2200000, 490000, 410000], c2Inc: [2350000, 1900000], c2Exp: [2800000, 550000] },
    { month: '2026-08', c1Inc: [1920000, 1600000, 840000], c1Exp: [2200000, 510000, 620000], c2Inc: [2480000, 2120000], c2Exp: [2800000, 640000] },
    { month: '2026-09', c1Inc: [1850000, 1490000, 710000], c1Exp: [2200000, 475000, 450000], c2Inc: [2290000, 1980000], c2Exp: [2800000, 580000] },
    { month: '2026-10', c1Inc: [2150000, 1740000, 960000], c1Exp: [2200000, 530000, 540000], c2Inc: [2620000, 2240000], c2Exp: [2800000, 610000] },
  ];

  for (const s of monthlySeeds) {
    // El Redentor
    insertTx.run(districtId, c1, 'LOCAL', 'INGRESO', 'DIEZMO', s.c1Inc[0], `${s.month}-07`, `Diezmos consolidados mes ${s.month}`, null, 'Congregación El Redentor', null, 'EFECTIVO', `DZ-${s.month}-01`, 3);
    insertTx.run(districtId, c1, 'LOCAL', 'INGRESO', 'OFRENDA_GENERAL', s.c1Inc[1], `${s.month}-14`, `Ofrendas cultos dominicales ${s.month}`, null, '', null, 'EFECTIVO', `OF-${s.month}-02`, 3);
    insertTx.run(districtId, c1, 'LOCAL', 'INGRESO', 'OFRENDA_MISIONERA', s.c1Inc[2], `${s.month}-21`, `Ofrenda misionera y pro-templo ${s.month}`, null, '', null, 'CUENTA_BANCARIA', `OM-${s.month}-03`, 3);

    insertTx.run(districtId, c1, 'LOCAL', 'EGRESO', 'REMUNERACION_PASTORAL', s.c1Exp[0], `${s.month}-28`, `Emolumentos pastorales ${s.month}`, null, 'Pr. Carlos Mendoza', null, 'TRANSFERENCIA', `EG-${s.month}-01`, 3);
    insertTx.run(districtId, c1, 'LOCAL', 'EGRESO', 'SERVICIOS_PUBLICOS', s.c1Exp[1], `${s.month}-20`, `Energía eléctrica, agua e internet templo`, null, 'Afinia / Veolia', null, 'CUENTA_BANCARIA', `EG-${s.month}-02`, 3);
    insertTx.run(districtId, c1, 'LOCAL', 'EGRESO', 'APORTE_DISTRITAL', s.c1Exp[2], `${s.month}-29`, `Aporte distrital y diezmo de diezmos a Distrito Sabana`, null, 'Tesorería Distrito Sabana', null, 'TRANSFERENCIA', `EG-${s.month}-03`, 3);

    // Betel Corozal
    insertTx.run(districtId, c2, 'LOCAL', 'INGRESO', 'DIEZMO', s.c2Inc[0], `${s.month}-10`, `Diezmos mensuales Betel Corozal`, null, 'Congregación Betel', null, 'CUENTA_BANCARIA', `BT-${s.month}-01`, 4);
    insertTx.run(districtId, c2, 'LOCAL', 'INGRESO', 'OFRENDA_GENERAL', s.c2Inc[1], `${s.month}-20`, `Ofrendas generales Betel Corozal`, null, '', null, 'EFECTIVO', `BT-${s.month}-02`, 4);
    insertTx.run(districtId, c2, 'LOCAL', 'EGRESO', 'REMUNERACION_PASTORAL', s.c2Exp[0], `${s.month}-28`, `Remuneración pastoral Rvdo. Jonás Pinto`, null, 'Rvdo. Jonás Pinto', null, 'TRANSFERENCIA', `BTE-${s.month}-01`, 4);
    insertTx.run(districtId, c2, 'LOCAL', 'EGRESO', 'SERVICIOS_PUBLICOS', s.c2Exp[1], `${s.month}-22`, `Servicios públicos templo y casa pastoral`, null, '', null, 'CUENTA_BANCARIA', `BTE-${s.month}-02`, 4);
  }

  // Movimientos detallados del mes actual (Noviembre 2026) — con diezmos vinculados a miembros!
  insertTx.run(districtId, c1, 'LOCAL', 'INGRESO', 'DIEZMO', 420000, '2026-11-01', 'Diezmo mes de noviembre', memberIdsC1[0], 'Sandra Milena Torres Ruiz', null, 'TRANSFERENCIA', 'DZ-202611-01', 3);
  insertTx.run(districtId, c1, 'LOCAL', 'INGRESO', 'DIEZMO', 650000, '2026-11-01', 'Diezmo mes de noviembre', memberIdsC1[1], 'Pedro Nel Gómez Acosta', null, 'EFECTIVO', 'DZ-202611-02', 3);
  insertTx.run(districtId, c1, 'LOCAL', 'INGRESO', 'DIEZMO', 500000, '2026-11-08', 'Diezmo mes de noviembre', memberIdsC1[2], 'Andrés Felipe Ramos Pineda', null, 'NEQUI', 'DZ-202611-03', 3);
  insertTx.run(districtId, c1, 'LOCAL', 'INGRESO', 'DIEZMO', 340000, '2026-11-08', 'Diezmo mes de noviembre', memberIdsC1[3], 'María Alejandra Navarro Gil', null, 'EFECTIVO', 'DZ-202611-04', 3);
  insertTx.run(districtId, c1, 'LOCAL', 'INGRESO', 'DIEZMO', 280000, '2026-11-15', 'Diezmo mes de noviembre', memberIdsC1[12], 'Yadira del Carmen Ospino', null, 'EFECTIVO', 'DZ-202611-05', 3);
  insertTx.run(districtId, c1, 'LOCAL', 'INGRESO', 'OFRENDA_GENERAL', 890000, '2026-11-08', 'Ofrendas cultos 1a y 2a semana noviembre', null, '', null, 'EFECTIVO', 'OF-202611-01', 3);
  insertTx.run(districtId, c1, 'LOCAL', 'INGRESO', 'OFRENDA_GENERAL', 760000, '2026-11-15', 'Ofrendas culto dominical 15 noviembre', null, '', null, 'EFECTIVO', 'OF-202611-02', 3);
  insertTx.run(districtId, c1, 'LOCAL', 'INGRESO', 'OFRENDA_MISIONERA', 410000, '2026-11-15', 'Ofrenda especial misiones', null, '', null, 'CUENTA_BANCARIA', 'OM-202611-01', 3);

  insertTx.run(districtId, c1, 'LOCAL', 'EGRESO', 'REMUNERACION_PASTORAL', 2200000, '2026-11-15', 'Emolumentos pastorales noviembre', null, 'Pr. Carlos Mendoza', null, 'TRANSFERENCIA', 'EG-202611-01', 3);
  insertTx.run(districtId, c1, 'LOCAL', 'EGRESO', 'SERVICIOS_PUBLICOS', 485000, '2026-11-14', 'Factura energía Afinia y agua Veolia', null, 'Afinia / Veolia', null, 'CUENTA_BANCARIA', 'EG-202611-02', 3);
  insertTx.run(districtId, c1, 'LOCAL', 'EGRESO', 'GASTO_ACTIVIDAD', 390000, '2026-11-14', 'Compra de ingredientes arroz con pollo pro-templo', null, 'Mercado Nuevo', act1, 'EFECTIVO', 'EG-202611-03', 3);
  insertTx.run(districtId, c1, 'LOCAL', 'EGRESO', 'APORTE_DISTRITAL', 350000, '2026-11-16', 'Aporte mensual al Distrito Sabana', null, 'Tesorería Distrito Sabana', null, 'TRANSFERENCIA', 'EG-202611-04', 3);

  // Noviembre para Betel Corozal, Sampués, Ovejas y Aporte Distrital
  insertTx.run(districtId, c2, 'LOCAL', 'INGRESO', 'DIEZMO', 920000, '2026-11-08', 'Diezmo noviembre', memberIdsC2[0], 'Yolanda Esther Vergara', null, 'CUENTA_BANCARIA', 'BT-202611-01', 4);
  insertTx.run(districtId, c2, 'LOCAL', 'INGRESO', 'DIEZMO', 1480000, '2026-11-15', 'Diezmos congregación 2a quincena', null, 'Congregación Betel', null, 'EFECTIVO', 'BT-202611-02', 4);
  insertTx.run(districtId, c2, 'LOCAL', 'INGRESO', 'OFRENDA_GENERAL', 1950000, '2026-11-15', 'Ofrendas generales noviembre', null, '', null, 'EFECTIVO', 'BT-202611-03', 4);
  insertTx.run(districtId, c2, 'LOCAL', 'EGRESO', 'REMUNERACION_PASTORAL', 2800000, '2026-11-15', 'Remuneración mensual noviembre', null, 'Rvdo. Jonás Pinto', null, 'TRANSFERENCIA', 'BTE-202611-01', 4);
  insertTx.run(districtId, c2, 'LOCAL', 'EGRESO', 'SERVICIOS_PUBLICOS', 560000, '2026-11-15', 'Servicios públicos noviembre', null, '', null, 'CUENTA_BANCARIA', 'BTE-202611-02', 4);

  insertTx.run(districtId, c3, 'LOCAL', 'INGRESO', 'DIEZMO', 1120000, '2026-11-15', 'Diezmos noviembre Monte de Sion', null, 'Congregación Sampués', null, 'EFECTIVO', 'MS-202611-01', 1);
  insertTx.run(districtId, c3, 'LOCAL', 'INGRESO', 'OFRENDA_GENERAL', 880000, '2026-11-15', 'Ofrendas noviembre Monte de Sion', null, '', null, 'EFECTIVO', 'MS-202611-02', 1);
  insertTx.run(districtId, c3, 'LOCAL', 'EGRESO', 'ARRIENDO_TEMPLO', 850000, '2026-11-05', 'Canon arriendo local templo noviembre', null, 'Familia Hernández Paternina', null, 'EFECTIVO', 'MSE-202611-01', 1);
  insertTx.run(districtId, c3, 'LOCAL', 'EGRESO', 'ARRIENDO_CASA_PASTORAL', 500000, '2026-11-05', 'Arriendo casa pastoral noviembre', null, '', null, 'EFECTIVO', 'MSE-202611-02', 1);

  insertTx.run(districtId, c4, 'LOCAL', 'INGRESO', 'OFRENDA_GENERAL', 480000, '2026-11-15', 'Ofrendas noviembre Campo Luz del Evangelio', null, '', null, 'EFECTIVO', 'LE-202611-01', 1);
  insertTx.run(districtId, c4, 'LOCAL', 'EGRESO', 'AYUDA_SOCIAL', 180000, '2026-11-16', 'Transporte pastoral y biblias nuevos creyentes', null, '', null, 'EFECTIVO', 'LEE-202611-01', 1);

  // Finanzas propias de la Tesorería Distrital (Distrito Sabana)
  insertTx.run(districtId, null, 'DISTRITAL', 'INGRESO', 'APORTE_DISTRITAL', 1250000, '2026-11-16', 'Recaudo consolidado aportes distritales de iglesias', null, 'Iglesias Distrito Sabana', null, 'CUENTA_BANCARIA', 'DS-202611-01', 1);
  insertTx.run(districtId, null, 'DISTRITAL', 'EGRESO', 'APORTE_NACIONAL', 450000, '2026-11-18', 'Aporte a Sede Nacional IGLEICO Medellín', null, 'IGLEICO Nacional', null, 'TRANSFERENCIA', 'DSE-202611-01', 1);

  // 9. Cuentas por pagar / Préstamos (Sección 2 de Ficha Iglesia)
  db.prepare(`
    INSERT INTO debts_loans (church_id, creditor, initial_amount, remaining_amount, start_date, term_description, seniority_text, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    c1,
    'Fondo Rotatorio IGLEICO Nacional',
    12000000,
    4500000,
    '2024-06-01',
    '36 meses (cuotas mensuales de $350.000)',
    '2 años y 5 meses',
    'ACTIVO',
    'Préstamo para ampliación del techo y adecuación de salones de Escuela Dominical.'
  );

  console.log('Datos iniciales de IGLEICO – Distrito Sabana cargados exitosamente.');
}

if (require.main === module) {
  seedIfEmpty();
}
