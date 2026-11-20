import type {
  Activity,
  ActivityParticipant,
  ActivityPayment,
  AuthUser,
  CensusTable,
  Church,
  DebtLoan,
  District,
  FinancialTransaction,
  Member,
  Pastor,
  SystemUser,
  UserRole,
  Zone,
} from '../types';

const STORAGE_KEY = 'igleico_distrito_sabana_static_db_v1';

interface StoredUser extends SystemUser {
  password: string;
}

interface StaticStore {
  nextId: number;
  district: District;
  zones: Zone[];
  churches: Church[];
  pastors: Pastor[];
  users: StoredUser[];
  members: Member[];
  activities: Activity[];
  participants: ActivityParticipant[];
  payments: ActivityPayment[];
  transactions: FinancialTransaction[];
  loans: DebtLoan[];
}

function emptyCensus(): CensusTable {
  return {
    infancy_0_12m: 0,
    infancy_1_5: 0,
    childhood_6_11: 0,
    adolescents_12_14_b: 0,
    adolescents_12_14_nb: 0,
    youth_15_30_b: 0,
    youth_15_30_nb: 0,
    adults_31_59_b: 0,
    adults_31_59_nb: 0,
    seniors_60_plus_b: 0,
    seniors_60_plus_nb: 0,
    total_baptized: 0,
    total_not_baptized: 0,
    total_children: 0,
    grand_total: 0,
  };
}

function recalcCensus(c: Partial<CensusTable>): CensusTable {
  const b: CensusTable = {
    infancy_0_12m: Number(c.infancy_0_12m || 0),
    infancy_1_5: Number(c.infancy_1_5 || 0),
    childhood_6_11: Number(c.childhood_6_11 || 0),
    adolescents_12_14_b: Number(c.adolescents_12_14_b || 0),
    adolescents_12_14_nb: Number(c.adolescents_12_14_nb || 0),
    youth_15_30_b: Number(c.youth_15_30_b || 0),
    youth_15_30_nb: Number(c.youth_15_30_nb || 0),
    adults_31_59_b: Number(c.adults_31_59_b || 0),
    adults_31_59_nb: Number(c.adults_31_59_nb || 0),
    seniors_60_plus_b: Number(c.seniors_60_plus_b || 0),
    seniors_60_plus_nb: Number(c.seniors_60_plus_nb || 0),
    total_baptized: 0,
    total_not_baptized: 0,
    total_children: 0,
    grand_total: 0,
  };
  b.total_children = b.infancy_0_12m + b.infancy_1_5 + b.childhood_6_11;
  b.total_baptized =
    b.adolescents_12_14_b + b.youth_15_30_b + b.adults_31_59_b + b.seniors_60_plus_b;
  b.total_not_baptized =
    b.adolescents_12_14_nb + b.youth_15_30_nb + b.adults_31_59_nb + b.seniors_60_plus_nb;
  b.grand_total = b.total_children + b.total_baptized + b.total_not_baptized;
  return b;
}

function sumCensus(list: CensusTable[]): CensusTable {
  const s = emptyCensus();
  for (const item of list) {
    s.infancy_0_12m += item.infancy_0_12m;
    s.infancy_1_5 += item.infancy_1_5;
    s.childhood_6_11 += item.childhood_6_11;
    s.adolescents_12_14_b += item.adolescents_12_14_b;
    s.adolescents_12_14_nb += item.adolescents_12_14_nb;
    s.youth_15_30_b += item.youth_15_30_b;
    s.youth_15_30_nb += item.youth_15_30_nb;
    s.adults_31_59_b += item.adults_31_59_b;
    s.adults_31_59_nb += item.adults_31_59_nb;
    s.seniors_60_plus_b += item.seniors_60_plus_b;
    s.seniors_60_plus_nb += item.seniors_60_plus_nb;
  }
  return recalcCensus(s);
}

function getAgeMonths(birthDateStr: string): number | null {
  if (!birthDateStr) return null;
  const d = new Date(birthDateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  return Math.max(0, months);
}

function computeChurchAutoCensus(store: StaticStore, churchId: number): CensusTable {
  const c = emptyCensus();
  for (const m of store.members) {
    if (m.church_id !== churchId || m.status !== 'ACTIVO') continue;
    const months = getAgeMonths(m.birth_date);
    const isB = m.baptism_status === 'BAUTIZADO';
    if (months !== null && months <= 12) c.infancy_0_12m++;
    else if (months !== null && months < 72) c.infancy_1_5++;
    else if ((months !== null && months < 144) || m.baptism_status === 'NINO') c.childhood_6_11++;
    else if (months !== null && months < 180) {
      if (isB) c.adolescents_12_14_b++;
      else c.adolescents_12_14_nb++;
    } else if (months !== null && months <= 360) {
      if (isB) c.youth_15_30_b++;
      else c.youth_15_30_nb++;
    } else if (months !== null && months <= 708) {
      if (isB) c.adults_31_59_b++;
      else c.adults_31_59_nb++;
    } else if (months !== null && months >= 720) {
      if (isB) c.seniors_60_plus_b++;
      else c.seniors_60_plus_nb++;
    } else {
      if (isB) c.adults_31_59_b++;
      else c.adults_31_59_nb++;
    }
  }
  return recalcCensus(c);
}

function createInitialStore(): StaticStore {
  const district: District = {
    id: 1,
    name: 'Distrito Sabana',
    organization: 'Iglesia Evangélica Interamericana de Colombia (IGLEICO)',
    personeria: '',
    region: 'Región Sabana / Costa Caribe Colombiana (Sucre y Córdoba)',
    minister_name: 'Rvdo. Jonás Pinto',
    substitute_minister_name: 'Carmen Bayesta',
    secretary_name: 'Liceth Martínez',
    treasurer_name: 'Onelia Contreras',
    email: 'distritosabana@igleico.com.co',
    phone: '310 555 2480',
    address: 'Sincelejo, Sucre – Colombia',
    notes: 'Circunscripción administrativa y ministerial de IGLEICO en la región Sabana.',
  };

  const zones: Zone[] = [
    { id: 1, district_id: 1, name: 'Zona Centro – Sincelejo', coordinator_name: 'Pr. Carlos Mendoza', description: 'Iglesias urbanas y periurbanas de Sincelejo y Corozal.' },
    { id: 2, district_id: 1, name: 'Zona Sabana Sur – Sampués / Chinú', coordinator_name: 'Pr. Luis Alberto Díaz', description: 'Congregaciones de Sampués, Chinú y veredas aledañas.' },
    { id: 3, district_id: 1, name: 'Zona Montes de María – Ovejas', coordinator_name: 'Pra. Martha Lucía Pérez', description: 'Iglesias y campos de predicación en Montes de María.' },
  ];

  const baseChurchDefaults = {
    district_id: 1,
    is_active: 1,
    premises_other: '',
    rent_start_date: '',
    rent_end_date: '',
    other_properties: {},
    has_leased_property: 0,
    leased_property_income: 0,
    vehicles: {},
    has_accounts_payable: 0,
    has_hired_staff: 0,
    hired_staff: [],
    has_copastor: 0,
    copastor_name: '',
    copastor_phone: '',
    copastor_email: '',
    copastor_remuneration: 0,
    copastor_no_pay: 1,
    has_local_council: 1,
    local_council_count: 5,
    treasurer_email: '',
    secretary_email: '',
    ministry_other: '',
    has_preaching_fields: 0,
    preaching_fields_count: 0,
    has_ordained_ministers: 0,
    ordained_ministers_count: 0,
    has_retired_pastors: 0,
    retired_pastors_count: 0,
    has_professionals: 0,
    professionals: [],
    skills: {},
    has_age_divided_classes: 1,
    institutions: {},
    social: {},
    equipment: {},
    has_theology_teachers: 0,
    use_auto_census: 1,
    manual_census: {},
    census: emptyCensus(),
  };

  const churches: Church[] = [
    {
      ...baseChurchDefaults,
      id: 1,
      zone_id: 1,
      zone_name: 'Zona Centro – Sincelejo',
      name: 'Iglesia Evangélica Interamericana El Redentor',
      address: 'Calle 25 # 18-42',
      stratum: '2',
      neighborhood: 'Barrio La Floresta',
      municipality: 'Sincelejo',
      department: 'Sucre',
      phone: '301 442 8890',
      email: 'elredentor.sabana@igleico.com.co',
      categorization: 'CONSTITUIDA',
      foundation_month: '04',
      foundation_year: '1999',
      premises_type: 'PROPIO',
      property_owner_type: 'IGLEICO',
      property_owner_name: '',
      rent_amount: 0,
      has_pastoral_house: 1,
      pastoral_house_rent: 0,
      ownership_doc_type: 'ESCRITURA',
      pays_property_tax: 1,
      property_tax_up_to_date: 'SI',
      vehicles: { has_car: false, has_moto: true, owner_type: 'IGLEICO' },
      avg_monthly_income: 4850000,
      has_bank_account: 1,
      bank_nit: '890.905.568-5',
      bank_name: 'Bancolombia',
      bank_account_type: 'Ahorros',
      has_accounts_payable: 1,
      has_copastor: 1,
      copastor_name: 'Diác. Pedro Nel Gómez',
      copastor_phone: '314 778 9021',
      local_council_count: 7,
      treasurer_name: 'Sandra Milena Torres',
      treasurer_phone: '312 650 3312',
      treasurer_academic: 'Tecnóloga en Contabilidad',
      secretary_name: 'Andrés Felipe Ramos',
      secretary_phone: '300 812 4419',
      secretary_academic: 'Técnico Administrativo',
      has_ucei: 1, has_ujei: 1, has_udei: 1, has_unei: 1,
      ministry_missions: 1, ministry_discipleship: 1, ministry_intercession: 1, ministry_evangelism: 1, ministry_worship: 1,
      ministry_other: 'Ministerio de Medios y Sonido',
      discipleship_program: 'Vida Nueva en Cristo – Cartilla IGLEICO',
      has_preaching_fields: 1, preaching_fields_count: 2,
      has_professionals: 1,
      professionals: [{ profession: 'Docente', count: 3 }, { profession: 'Contador / Aux. Contable', count: 2 }, { profession: 'Enfermería', count: 2 }, { profession: 'Ingeniero de Sistemas', count: 1 }],
      sunday_school_teachers: 6,
      age_divided_classes_info: 'Cuna (0-5), Semillas (6-11), Exploradores (12-14)',
      social: { facebook: 'IGLEICO El Redentor Sincelejo', tiktok: '@elredentor.sabana', instagram: '@igleico_elredentor', whatsapp: '3014428890', youtube: 'Iglesia El Redentor IGLEICO' },
      equipment: { camera: true, videobeam: true, screen: true, computer: true, other: 'Consola digital 16 canales y 4 micrófonos inalámbricos' },
      has_theology_teachers: 1,
    },
    {
      ...baseChurchDefaults,
      id: 2,
      zone_id: 1,
      zone_name: 'Zona Centro – Sincelejo',
      name: 'Iglesia Central de Corozal – Betel',
      address: 'Carrera 28 # 31-15',
      stratum: '3',
      neighborhood: 'Barrio San José',
      municipality: 'Corozal',
      department: 'Sucre',
      phone: '315 620 1184',
      email: 'betel.corozal@igleico.com.co',
      categorization: 'CONSTITUIDA',
      foundation_month: '08',
      foundation_year: '1992',
      premises_type: 'PROPIO',
      property_owner_type: 'IGLEICO_CENTRAL',
      property_owner_name: '',
      rent_amount: 0,
      has_pastoral_house: 1,
      pastoral_house_rent: 0,
      ownership_doc_type: 'ESCRITURA',
      pays_property_tax: 1,
      property_tax_up_to_date: 'SI',
      avg_monthly_income: 6200000,
      has_bank_account: 1,
      bank_nit: '811.031.238-0',
      bank_name: 'Banco Agrario',
      bank_account_type: 'Ahorros',
      has_hired_staff: 1,
      hired_staff: [{ contract_type: 'Prestación de servicios (Aseo)', value: 550000, start_date: '2026-01-15', end_date: '2026-12-15', pays_social_security: false }],
      local_council_count: 9,
      treasurer_name: 'Yolanda Esther Vergara',
      treasurer_phone: '311 402 9987',
      treasurer_academic: 'Contadora Pública',
      secretary_name: 'Jorge Iván Salgado',
      secretary_phone: '318 220 5411',
      secretary_academic: 'Universitario',
      has_ucei: 1, has_ujei: 1, has_udei: 1, has_unei: 1,
      ministry_missions: 1, ministry_discipleship: 1, ministry_intercession: 1, ministry_evangelism: 1, ministry_worship: 1,
      discipleship_program: 'Discipulado Interamericano Nivel 1 y 2',
      has_preaching_fields: 1, preaching_fields_count: 1,
      has_professionals: 1,
      professionals: [{ profession: 'Contador Público', count: 1 }, { profession: 'Abogado', count: 1 }, { profession: 'Docente', count: 4 }],
      sunday_school_teachers: 8,
      age_divided_classes_info: '4 salones divididos por edad escolar',
      social: { facebook: 'IGLEICO Betel Corozal', instagram: '@betelcorozal', whatsapp: '3156201184' },
      equipment: { camera: true, videobeam: true, screen: true, computer: true, other: 'Sistema de sonido exterior' },
      has_theology_teachers: 1,
    },
    {
      ...baseChurchDefaults,
      id: 3,
      zone_id: 2,
      zone_name: 'Zona Sabana Sur – Sampués / Chinú',
      name: 'Iglesia Monte de Sion – Sampués',
      address: 'Calle 14 # 9-20',
      stratum: '1',
      neighborhood: 'Barrio 12 de Octubre',
      municipality: 'Sampués',
      department: 'Sucre',
      phone: '320 715 4409',
      email: 'montesion.sampues@igleico.com.co',
      categorization: 'EN_FORMACION',
      foundation_month: '11',
      foundation_year: '2018',
      premises_type: 'ARRENDADO',
      property_owner_type: 'TERCERO',
      property_owner_name: 'Familia Hernández Paternina',
      rent_amount: 850000,
      has_pastoral_house: 0,
      pastoral_house_rent: 500000,
      ownership_doc_type: 'NINGUNO',
      pays_property_tax: 0,
      property_tax_up_to_date: 'NO_APLICA',
      avg_monthly_income: 2150000,
      has_bank_account: 0,
      bank_nit: '', bank_name: '', bank_account_type: '',
      local_council_count: 5,
      treasurer_name: 'Luz Marina Sierra',
      treasurer_phone: '310 998 3120',
      treasurer_academic: 'Bachiller',
      secretary_name: 'Keiner José Mercado',
      secretary_phone: '321 440 1209',
      secretary_academic: 'Técnico en Sistemas',
      has_ucei: 0, has_ujei: 1, has_udei: 1, has_unei: 1,
      ministry_missions: 0, ministry_discipleship: 1, ministry_intercession: 1, ministry_evangelism: 1, ministry_worship: 1,
      discipleship_program: 'Fundamentos Cristianos',
      sunday_school_teachers: 3,
      age_divided_classes_info: 'Niños pequeños (0-6) y mayores (7-12)',
      social: { facebook: 'IGLEICO Monte de Sion Sampués', whatsapp: '3207154409' },
      equipment: { videobeam: true, computer: true, other: 'Cabina activa 15 pulgadas' },
    },
    {
      ...baseChurchDefaults,
      id: 4,
      zone_id: 3,
      zone_name: 'Zona Montes de María – Ovejas',
      name: 'Campo de Predicación Luz del Evangelio',
      address: 'Vereda Don Gabriel, Casa Comunal',
      stratum: '1',
      neighborhood: 'Vereda Don Gabriel',
      municipality: 'Ovejas',
      department: 'Sucre',
      phone: '313 880 7721',
      email: '',
      categorization: 'CAMPO_PREDICACION',
      foundation_month: '03',
      foundation_year: '2023',
      premises_type: 'PRESTADO',
      property_owner_type: 'TERCERO',
      property_owner_name: 'Hno. Rafael Contreras',
      rent_amount: 0,
      has_pastoral_house: 0,
      pastoral_house_rent: 0,
      ownership_doc_type: 'NINGUNO',
      pays_property_tax: 0,
      property_tax_up_to_date: 'NO_APLICA',
      avg_monthly_income: 650000,
      has_bank_account: 0,
      bank_nit: '', bank_name: '', bank_account_type: '',
      has_local_council: 0, local_council_count: 0,
      treasurer_name: 'María del Carmen Oviedo',
      treasurer_phone: '314 331 0981',
      treasurer_academic: 'Primaria',
      secretary_name: 'Dairo Luis Álvarez',
      secretary_phone: '312 889 4321',
      secretary_academic: 'Bachiller',
      has_ucei: 0, has_ujei: 1, has_udei: 1, has_unei: 1,
      ministry_missions: 0, ministry_discipleship: 1, ministry_intercession: 1, ministry_evangelism: 1, ministry_worship: 0,
      discipleship_program: 'Discipulado básico rural',
      sunday_school_teachers: 2,
      has_age_divided_classes: 0,
      age_divided_classes_info: 'Clase única infantil',
      equipment: { other: 'Parlante recargable' },
    },
  ];

  const pastors: Pastor[] = [
    {
      id: 1, district_id: 1, church_id: 1,
      full_name: 'Carlos Eduardo Mendoza Arrieta', birth_date: '1979-05-14', birth_place: 'Sincelejo, Sucre',
      id_number: '92.541.880', phone: '301 442 8890', email: 'carlos.mendoza@igleico.com.co',
      ministerial_dignity: 'PASTOR', ministry_start_month: '02', ministry_start_year: '2012', ministry_time_text: '14 años',
      past_churches: 'Campo El Carmen (2012-2016), Iglesia Nueva Vida Tolú (2016-2020), Iglesia El Redentor Sincelejo (2020-actual)',
      national_roles: [{ role: 'Delegado Asamblea Nacional', duration: '2021 - 2025' }],
      district_roles: [{ role: 'Coordinador Zona Centro Distrito Sabana', duration: '2023 - Actual' }],
      has_contract: 1, contract_type: 'ACUERDO_EMOLUMENTOS', pays_social_security: 1, contract_entity: 'IGLEICO',
      monthly_remuneration: 2200000, has_real_estate: 1, real_estate_details: 'Casa familiar en Barrio Las Margaritas, Sincelejo',
      academic_level: 'UNIVERSITARIO', formal_theology_studies: 'Licenciatura en Teología – Seminario Bíblico Interamericano',
      informal_theology_studies: 'Diplomado en Consejería Pastoral y Liderazgo',
      spouse_name: 'Ana Milena Beltrán Castro', spouse_birth_date: '1982-11-03', spouse_birth_place: 'Corozal, Sucre',
      spouse_id_number: '64.582.104', spouse_phone: '301 510 2231', spouse_email: 'ana.beltran@correo.com',
      spouse_dignity: 'LIDER', spouse_receives_aid: 1, spouse_monthly_aid: 350000,
      spouse_national_roles: [], spouse_district_roles: [{ role: 'Comité Distrital UDEI Sabana', duration: '2022 - Actual' }],
      spouse_academic_level: 'TECNOLOGO', spouse_formal_theology: 'Técnico en Ministerio Infantil', spouse_informal_theology: 'Seminarios UDEI',
      children: [{ name: 'Samuel David Mendoza Beltrán', birth_date: '2009-08-21' }, { name: 'Sara Sofía Mendoza Beltrán', birth_date: '2015-03-10' }],
      has_family_disability: 0, disability_member: 'NINGUNO', disability_details: '',
      data_auth_accepted: 1, data_auth_date: '2026-01-18', signature_name: 'Carlos Eduardo Mendoza Arrieta', status: 'ACTIVO',
    },
    {
      id: 2, district_id: 1, church_id: 2,
      full_name: 'Jonás Pinto Madera', birth_date: '1972-09-22', birth_place: 'Corozal, Sucre',
      id_number: '92.190.345', phone: '310 555 2480', email: 'jonas.pinto@igleico.com.co',
      ministerial_dignity: 'REVERENDO', ministry_start_month: '06', ministry_start_year: '2001', ministry_time_text: '25 años',
      past_churches: 'Iglesia San Marcos (2001-2008), Iglesia Sincelejo Norte (2008-2016), Iglesia Betel Corozal (2016-actual)',
      national_roles: [{ role: 'Vocal Junta Nacional IGLEICO', duration: '2018 - 2022' }],
      district_roles: [{ role: 'Ministro Distrital – Distrito Sabana', duration: '2022 - Actual' }],
      has_contract: 1, contract_type: 'LABORAL_TERMINO_INDEFINIDO', pays_social_security: 1, contract_entity: 'IGLEICO_CENTRAL',
      monthly_remuneration: 2800000, has_real_estate: 1, real_estate_details: 'Vivienda propia en Corozal',
      academic_level: 'POSTGRADO', formal_theology_studies: 'Teología Profesional y Especialización en Gerencia Ministerial',
      informal_theology_studies: 'Congresos Internacionales SMI',
      spouse_name: 'Claudia Patricia Ríos', spouse_birth_date: '1976-04-12', spouse_birth_place: 'Montería, Córdoba',
      spouse_id_number: '50.892.311', spouse_phone: '310 612 7781', spouse_email: 'claudia.rios@correo.com',
      spouse_dignity: 'PASTOR', spouse_receives_aid: 0, spouse_monthly_aid: 0,
      spouse_national_roles: [], spouse_district_roles: [{ role: 'Asesora Distrital de Familias', duration: '2022 - Actual' }],
      spouse_academic_level: 'UNIVERSITARIO', spouse_formal_theology: 'Seminario Bíblico Interamericano', spouse_informal_theology: '',
      children: [{ name: 'Daniel Felipe Pinto Ríos', birth_date: '2003-01-15' }],
      has_family_disability: 0, disability_member: 'NINGUNO', disability_details: '',
      data_auth_accepted: 1, data_auth_date: '2026-01-10', signature_name: 'Rvdo. Jonás Pinto Madera', status: 'ACTIVO',
    },
    {
      id: 3, district_id: 1, church_id: 3,
      full_name: 'Luis Alberto Díaz Salcedo', birth_date: '1986-02-19', birth_place: 'Sampués, Sucre',
      id_number: '1.102.814.902', phone: '320 715 4409', email: 'luis.diaz@igleico.com.co',
      ministerial_dignity: 'PASTOR', ministry_start_month: '07', ministry_start_year: '2018', ministry_time_text: '8 años',
      past_churches: 'Iglesia Monte de Sion Sampués (2018-actual)',
      national_roles: [], district_roles: [{ role: 'Coordinador Zona Sabana Sur', duration: '2024 - Actual' }],
      has_contract: 1, contract_type: 'ACUERDO_EMOLUMENTOS', pays_social_security: 1, contract_entity: 'IGLEICO',
      monthly_remuneration: 1300000, has_real_estate: 0, real_estate_details: '',
      academic_level: 'TECNICO', formal_theology_studies: 'Tecnología en Estudios Bíblicos (en curso)',
      informal_theology_studies: 'Instituto Bíblico Distrital Sabana',
      spouse_name: 'Yurleidys Paola Montes', spouse_birth_date: '1989-10-08', spouse_birth_place: 'Chinú, Córdoba',
      spouse_id_number: '1.069.431.220', spouse_phone: '320 882 1190', spouse_email: '',
      spouse_dignity: 'LIDER', spouse_receives_aid: 0, spouse_monthly_aid: 0,
      spouse_national_roles: [], spouse_district_roles: [],
      spouse_academic_level: 'BACHILLER', spouse_formal_theology: '', spouse_informal_theology: 'Escuela de Maestros UNEI',
      children: [{ name: 'Mateo Díaz Montes', birth_date: '2017-06-02' }, { name: 'Salomé Díaz Montes', birth_date: '2022-09-14' }],
      has_family_disability: 0, disability_member: 'NINGUNO', disability_details: '',
      data_auth_accepted: 1, data_auth_date: '2026-02-05', signature_name: 'Luis Alberto Díaz Salcedo', status: 'ACTIVO',
    },
    {
      id: 4, district_id: 1, church_id: 4,
      full_name: 'Martha Lucía Pérez Ortega', birth_date: '1984-12-01', birth_place: 'Ovejas, Sucre',
      id_number: '64.702.318', phone: '313 880 7721', email: 'martha.perez@igleico.com.co',
      ministerial_dignity: 'LIDER', ministry_start_month: '03', ministry_start_year: '2023', ministry_time_text: '3 años',
      past_churches: 'Campo de Predicación Luz del Evangelio (2023-actual)',
      national_roles: [], district_roles: [],
      has_contract: 0, contract_type: 'NINGUNO', pays_social_security: 0, contract_entity: '',
      monthly_remuneration: 450000, has_real_estate: 0, real_estate_details: '',
      academic_level: 'BACHILLER', formal_theology_studies: '', informal_theology_studies: 'Escuela de Obreros y Misioneros IGLEICO',
      spouse_name: '', spouse_birth_date: '', spouse_birth_place: '', spouse_id_number: '', spouse_phone: '', spouse_email: '',
      spouse_dignity: 'NINGUNA', spouse_receives_aid: 0, spouse_monthly_aid: 0,
      spouse_national_roles: [], spouse_district_roles: [],
      spouse_academic_level: '', spouse_formal_theology: '', spouse_informal_theology: '',
      children: [], has_family_disability: 0, disability_member: 'NINGUNO', disability_details: '',
      data_auth_accepted: 1, data_auth_date: '2026-02-12', signature_name: 'Martha Lucía Pérez Ortega', status: 'ACTIVO',
    },
  ];

  const users: StoredUser[] = [
    { id: 1, username: 'distrito', password: 'sabana2026', email: 'distritosabana@igleico.com.co', full_name: 'Rvdo. Jonás Pinto', role: 'ADMIN_DISTRITO', church_id: null, church_name: null, is_active: 1, created_at: '2026-01-05' },
    { id: 2, username: 'elredentor', password: 'redentor2026', email: 'carlos.mendoza@igleico.com.co', full_name: 'Pr. Carlos Mendoza – El Redentor', role: 'PASTOR_LOCAL', church_id: 1, church_name: churches[0].name, is_active: 1, created_at: '2026-01-10' },
    { id: 3, username: 'tesoreria', password: 'tesoreria2026', email: 'sandra.tesoreria@correo.com', full_name: 'Sandra Torres – Tesorera El Redentor', role: 'TESORERO_LOCAL', church_id: 1, church_name: churches[0].name, is_active: 1, created_at: '2026-01-12' },
    { id: 4, username: 'betel', password: 'betel2026', email: 'betel.corozal@igleico.com.co', full_name: 'Directiva Local – Betel Corozal', role: 'PASTOR_LOCAL', church_id: 2, church_name: churches[1].name, is_active: 1, created_at: '2026-01-15' },
  ];

  const rawMembers: Array<[number, string, string, string, string, 'M' | 'F', string, 'BAUTIZADO' | 'NO_BAUTIZADO' | 'NINO', 'UCEI' | 'UDEI' | 'UJEI' | 'UNEI', string, string]> = [
    [1, 'Sandra Milena Torres Ruiz', '64.571.220', '312 650 3312', '1983-04-18', 'F', 'Barrio La Floresta', 'BAUTIZADO', 'UDEI', 'Tesorera Local', 'Tecnóloga en Contabilidad'],
    [1, 'Pedro Nel Gómez Acosta', '92.518.903', '314 778 9021', '1975-10-02', 'M', 'Barrio Las Peñitas', 'BAUTIZADO', 'UCEI', 'Copastor / Diácono', 'Comerciante'],
    [1, 'Andrés Felipe Ramos Pineda', '1.102.861.440', '300 812 4419', '1997-07-11', 'M', 'Barrio La Floresta', 'BAUTIZADO', 'UJEI', 'Secretario Local', 'Ingeniero de Sistemas'],
    [1, 'María Alejandra Navarro Gil', '1.102.889.310', '315 901 4482', '2001-02-25', 'F', 'Barrio Boston', 'BAUTIZADO', 'UJEI', 'Líder de Alabanza', 'Docente'],
    [1, 'José Gregorio Salgado', '92.411.005', '311 452 0987', '1961-08-30', 'M', 'Barrio La Palma', 'BAUTIZADO', 'UCEI', 'Anciano / Intercesión', 'Pensionado'],
    [1, 'Luz Dary Mercado Vergara', '64.520.891', '304 619 2210', '1963-11-12', 'F', 'Barrio La Floresta', 'BAUTIZADO', 'UDEI', 'Coordinadora UDEI', 'Modista'],
    [1, 'Jhonatan David Pérez Ruiz', '1.102.895.102', '320 441 7890', '2003-09-05', 'M', 'Barrio Venecia', 'NO_BAUTIZADO', 'UJEI', 'Equipo de Sonido', 'Estudiante Universitario'],
    [1, 'Camila Andrea Ortiz Lara', '1.102.912.334', '301 774 3019', '2013-05-19', 'F', 'Barrio La Floresta', 'BAUTIZADO', 'UJEI', 'Adolescente Coro', 'Estudiante'],
    [1, 'Santiago José Gómez Torres', '1.102.940.112', '314 778 9021', '2018-01-22', 'M', 'Barrio Las Peñitas', 'NINO', 'UNEI', 'Escuela Dominical', ''],
    [1, 'Isabella Sofía Ramos', '1.102.955.801', '300 812 4419', '2022-06-14', 'F', 'Barrio La Floresta', 'NINO', 'UNEI', 'Cuna UNEI', ''],
    [1, 'Lucas Mateo Navarro', '', '315 901 4482', '2026-04-02', 'M', 'Barrio Boston', 'NINO', 'UNEI', 'Primera Infancia', ''],
    [1, 'Roberto Carlos Benítez', '92.559.104', '316 332 1098', '1988-03-27', 'M', 'Barrio La Cruz', 'NO_BAUTIZADO', 'UCEI', 'Discipulado', 'Técnico Electricista'],
    [1, 'Yadira del Carmen Ospino', '64.599.710', '312 819 6654', '1980-12-09', 'F', 'Barrio Las Margaritas', 'BAUTIZADO', 'UDEI', 'Maestra E.D.', 'Enfermera'],
    [1, 'Esteban Camilo Barrios', '1.102.903.418', '321 908 1134', '2012-10-30', 'M', 'Barrio La Cruz', 'NO_BAUTIZADO', 'UJEI', 'Adolescentes', 'Estudiante'],
    [2, 'Yolanda Esther Vergara', '64.512.008', '311 402 9987', '1978-06-15', 'F', 'Barrio San José', 'BAUTIZADO', 'UDEI', 'Tesorera Local', 'Contadora Pública'],
    [2, 'Jorge Iván Salgado', '92.530.774', '318 220 5411', '1985-02-09', 'M', 'Barrio El Jardín', 'BAUTIZADO', 'UCEI', 'Secretario Local', 'Abogado'],
    [2, 'Valeria Lucía Mendoza', '1.103.112.900', '300 441 9201', '2004-08-14', 'F', 'Barrio San José', 'BAUTIZADO', 'UJEI', 'Coordinadora UJEI', 'Estudiante'],
    [2, 'Miguel Ángel Contreras', '92.220.411', '315 809 3321', '1958-01-25', 'M', 'Centro Corozal', 'BAUTIZADO', 'UCEI', 'Diácono', 'Agricultor'],
    [2, 'Sofía Valentina Salgado', '', '318 220 5411', '2019-07-04', 'F', 'Barrio El Jardín', 'NINO', 'UNEI', 'Escuela Dominical', ''],
    [3, 'Luz Marina Sierra', '64.611.209', '310 998 3120', '1981-09-12', 'F', 'Barrio 12 de Octubre', 'BAUTIZADO', 'UDEI', 'Tesorera Local', 'Comerciante'],
    [3, 'Keiner José Mercado', '1.104.221.880', '321 440 1209', '2000-03-19', 'M', 'Barrio Millán Vargas', 'BAUTIZADO', 'UJEI', 'Secretario Local', 'Técnico en Sistemas'],
    [3, 'Hernán Darío Paternina', '92.601.552', '312 771 0091', '1990-05-04', 'M', 'Vereda Escobar Arriba', 'NO_BAUTIZADO', 'UCEI', 'Asistente', 'Artesano'],
    [3, 'Mariana Díaz Montes', '', '320 715 4409', '2017-06-02', 'F', 'Barrio 12 de Octubre', 'NINO', 'UNEI', 'Niñez', ''],
    [4, 'María del Carmen Oviedo', '64.788.120', '314 331 0981', '1977-11-28', 'F', 'Vereda Don Gabriel', 'BAUTIZADO', 'UDEI', 'Tesorera', 'Agricultora'],
    [4, 'Dairo Luis Álvarez', '1.104.889.310', '312 889 4321', '1999-04-08', 'M', 'Vereda Don Gabriel', 'BAUTIZADO', 'UJEI', 'Secretario', 'Mototaxista'],
  ];

  const members: Member[] = rawMembers.map((m, idx) => ({
    id: idx + 1,
    church_id: m[0],
    full_name: m[1],
    id_number: m[2],
    phone: m[3],
    email: '',
    birth_date: m[4],
    gender: m[5],
    address: m[6],
    baptism_status: m[7],
    baptism_date: '',
    organism: m[8],
    church_role: m[9],
    profession: m[10],
    comm_skills: '',
    status: 'ACTIVO',
    notes: '',
  }));

  const activities: Activity[] = [
    {
      id: 1, district_id: 1, church_id: 1, scope: 'LOCAL',
      name: 'Venta de Arroz con Pollo Pro-Templo', activity_type: 'VENTA_RECAUDO', organism: 'PRO_TEMPLO',
      event_date: '2026-11-15', location: 'Templo El Redentor – Sincelejo', responsible_name: 'Sandra Milena Torres (UDEI)',
      unit_label: 'Plato', unit_price: 18000, goal_amount: 1800000,
      description: 'Recaudación para pintura de fachada y mantenimiento de aires acondicionados del templo.',
      status: 'ACTIVA',
    },
    {
      id: 2, district_id: 1, church_id: 1, scope: 'LOCAL',
      name: 'Rifa Pro-Sonido y Equipos UJEI', activity_type: 'VENTA_RECAUDO', organism: 'UJEI',
      event_date: '2026-11-28', location: 'Iglesia El Redentor', responsible_name: 'Andrés Felipe Ramos',
      unit_label: 'Boleta', unit_price: 10000, goal_amount: 1200000,
      description: 'Venta de talonarios de boletas (cada hermano se lleva boletas y reporta recaudo).',
      status: 'ACTIVA',
    },
    {
      id: 3, district_id: 1, church_id: null, scope: 'DISTRITAL',
      name: 'Congreso Distrital de Jóvenes UJEI Sabana 2026', activity_type: 'EVENTO_CUOTA', organism: 'UJEI',
      event_date: '2026-12-06', location: 'Coliseo Las Delicias – Sincelejo', responsible_name: 'Directiva UJEI Distrito Sabana',
      unit_label: 'Inscripción', unit_price: 45000, goal_amount: 4500000,
      description: 'Encuentro anual de todas las iglesias del Distrito Sabana. Control de asistencia e inscripciones.',
      status: 'ACTIVA',
    },
    {
      id: 4, district_id: 1, church_id: 2, scope: 'LOCAL',
      name: 'Almuerzo Misionero Pro-Campo de Predicación', activity_type: 'VENTA_RECAUDO', organism: 'MISIONES',
      event_date: '2026-11-08', location: 'Iglesia Betel – Corozal', responsible_name: 'Yolanda Esther Vergara',
      unit_label: 'Almuerzo', unit_price: 20000, goal_amount: 1400000,
      description: 'Apoyo económico al campo de predicación y transporte misionero.',
      status: 'ACTIVA',
    },
  ];

  const participants: ActivityParticipant[] = [
    { id: 1, activity_id: 1, church_id: 1, member_id: 1, person_name: 'Sandra Milena Torres Ruiz', person_phone: '312 650 3312', is_member: 1, item_detail: '10 platos vendidos en su barrio', quantity: 10, unit_price: 18000, assigned_amount: 180000, paid_amount: 180000, pending_amount: 0, attendance_status: 'ASISTIO', notes: '' },
    { id: 2, activity_id: 1, church_id: 1, member_id: 2, person_name: 'Pedro Nel Gómez Acosta', person_phone: '314 778 9021', is_member: 1, item_detail: '8 platos (llevó para familiares)', quantity: 8, unit_price: 18000, assigned_amount: 144000, paid_amount: 90000, pending_amount: 54000, attendance_status: 'ASISTIO', notes: 'Cancela el resto el domingo' },
    { id: 3, activity_id: 1, church_id: 1, member_id: 3, person_name: 'Andrés Felipe Ramos Pineda', person_phone: '300 812 4419', is_member: 1, item_detail: '5 platos', quantity: 5, unit_price: 18000, assigned_amount: 90000, paid_amount: 90000, pending_amount: 0, attendance_status: 'ASISTIO', notes: '' },
    { id: 4, activity_id: 1, church_id: 1, member_id: 12, person_name: 'Roberto Carlos Benítez', person_phone: '316 332 1098', is_member: 1, item_detail: '4 platos fiados', quantity: 4, unit_price: 18000, assigned_amount: 72000, paid_amount: 0, pending_amount: 72000, attendance_status: 'ASISTIO', notes: 'Se llevó los 4 platos, paga en quincena' },
    { id: 5, activity_id: 1, church_id: 1, member_id: 13, person_name: 'Yadira del Carmen Ospino', person_phone: '312 819 6654', is_member: 1, item_detail: '6 platos para compañeras del hospital', quantity: 6, unit_price: 18000, assigned_amount: 108000, paid_amount: 54000, pending_amount: 54000, attendance_status: 'CONFIRMADO', notes: 'Abonó 3 platos, debe 3 platos' },
    { id: 6, activity_id: 1, church_id: 1, member_id: null, person_name: 'Carlos Julio Madera (Vecino externo)', person_phone: '310 223 4490', is_member: 0, item_detail: '3 platos por encargo', quantity: 3, unit_price: 18000, assigned_amount: 54000, paid_amount: 54000, pending_amount: 0, attendance_status: 'CONFIRMADO', notes: '' },

    { id: 7, activity_id: 2, church_id: 1, member_id: 4, person_name: 'María Alejandra Navarro Gil', person_phone: '315 901 4482', is_member: 1, item_detail: 'Talonario #01 (10 boletas)', quantity: 10, unit_price: 10000, assigned_amount: 100000, paid_amount: 60000, pending_amount: 40000, attendance_status: 'CONFIRMADO', notes: 'Faltan 4 boletas' },
    { id: 8, activity_id: 2, church_id: 1, member_id: 7, person_name: 'Jhonatan David Pérez Ruiz', person_phone: '320 441 7890', is_member: 1, item_detail: 'Talonario #02 (10 boletas)', quantity: 10, unit_price: 10000, assigned_amount: 100000, paid_amount: 0, pending_amount: 100000, attendance_status: 'CONVOCADO', notes: 'Llevó talonario completo' },

    { id: 9, activity_id: 3, church_id: 1, member_id: 3, person_name: 'Andrés Felipe Ramos Pineda', person_phone: '300 812 4419', is_member: 1, item_detail: 'Inscripción + almuerzo', quantity: 1, unit_price: 45000, assigned_amount: 45000, paid_amount: 45000, pending_amount: 0, attendance_status: 'CONFIRMADO', notes: '' },
    { id: 10, activity_id: 3, church_id: 1, member_id: 4, person_name: 'María Alejandra Navarro Gil', person_phone: '315 901 4482', is_member: 1, item_detail: 'Inscripción congreso', quantity: 1, unit_price: 45000, assigned_amount: 45000, paid_amount: 25000, pending_amount: 20000, attendance_status: 'CONFIRMADO', notes: 'Debe $20.000 antes del evento' },
    { id: 11, activity_id: 3, church_id: 2, member_id: 17, person_name: 'Valeria Lucía Mendoza', person_phone: '300 441 9201', is_member: 1, item_detail: 'Inscripción + delegación', quantity: 1, unit_price: 45000, assigned_amount: 45000, paid_amount: 45000, pending_amount: 0, attendance_status: 'CONFIRMADO', notes: '' },
    { id: 12, activity_id: 3, church_id: 1, member_id: 7, person_name: 'Jhonatan David Pérez Ruiz', person_phone: '320 441 7890', is_member: 1, item_detail: 'Inscripción audiovisual', quantity: 1, unit_price: 45000, assigned_amount: 45000, paid_amount: 0, pending_amount: 45000, attendance_status: 'CONVOCADO', notes: '' },

    { id: 13, activity_id: 4, church_id: 2, member_id: 15, person_name: 'Yolanda Esther Vergara', person_phone: '311 402 9987', is_member: 1, item_detail: '12 almuerzos', quantity: 12, unit_price: 20000, assigned_amount: 240000, paid_amount: 240000, pending_amount: 0, attendance_status: 'ASISTIO', notes: '' },
    { id: 14, activity_id: 4, church_id: 2, member_id: 16, person_name: 'Jorge Iván Salgado', person_phone: '318 220 5411', is_member: 1, item_detail: '6 almuerzos', quantity: 6, unit_price: 20000, assigned_amount: 120000, paid_amount: 80000, pending_amount: 40000, attendance_status: 'ASISTIO', notes: 'Saldo pendiente 2 almuerzos' },
  ];

  let txId = 1;
  const transactions: FinancialTransaction[] = [];
  const payments: ActivityPayment[] = [];
  let payId = 1;

  for (const p of participants) {
    if (p.paid_amount > 0) {
      const act = activities.find((a) => a.id === p.activity_id)!;
      const tid = txId++;
      transactions.push({
        id: tid,
        district_id: 1,
        church_id: act.scope === 'DISTRITAL' ? null : p.church_id,
        scope: act.scope,
        type: 'INGRESO',
        category: 'ACTIVIDAD',
        amount: p.paid_amount,
        tx_date: act.event_date,
        description: `Recaudo actividad: ${act.name} – ${p.person_name}`,
        member_id: p.member_id,
        person_name: p.person_name,
        activity_id: act.id,
        payment_method: 'EFECTIVO',
        receipt_number: `ACT-${act.id}-${p.id}`,
      });
      payments.push({
        id: payId++,
        participant_id: p.id,
        activity_id: act.id,
        amount: p.paid_amount,
        payment_date: act.event_date,
        payment_method: 'EFECTIVO',
        notes: 'Abono registrado',
        finance_tx_id: tid,
      });
    }
  }

  const pushTx = (t: Omit<FinancialTransaction, 'id' | 'district_id'>) => {
    transactions.push({ id: txId++, district_id: 1, ...t });
  };

  const months = [
    { m: '2026-06', c1: [1650000, 1420000, 680000], e1: [2200000, 460000, 380000], c2: [2100000, 1850000], e2: [2800000, 520000] },
    { m: '2026-07', c1: [1780000, 1510000, 520000], e1: [2200000, 490000, 410000], c2: [2350000, 1900000], e2: [2800000, 550000] },
    { m: '2026-08', c1: [1920000, 1600000, 840000], e1: [2200000, 510000, 620000], c2: [2480000, 2120000], e2: [2800000, 640000] },
    { m: '2026-09', c1: [1850000, 1490000, 710000], e1: [2200000, 475000, 450000], c2: [2290000, 1980000], e2: [2800000, 580000] },
    { m: '2026-10', c1: [2150000, 1740000, 960000], e1: [2200000, 530000, 540000], c2: [2620000, 2240000], e2: [2800000, 610000] },
  ];

  for (const s of months) {
    pushTx({ church_id: 1, scope: 'LOCAL', type: 'INGRESO', category: 'DIEZMO', amount: s.c1[0], tx_date: `${s.m}-07`, description: `Diezmos consolidados ${s.m}`, member_id: null, person_name: 'Congregación El Redentor', activity_id: null, payment_method: 'EFECTIVO', receipt_number: `DZ-${s.m}-01` });
    pushTx({ church_id: 1, scope: 'LOCAL', type: 'INGRESO', category: 'OFRENDA_GENERAL', amount: s.c1[1], tx_date: `${s.m}-14`, description: `Ofrendas cultos dominicales ${s.m}`, member_id: null, person_name: '', activity_id: null, payment_method: 'EFECTIVO', receipt_number: `OF-${s.m}-02` });
    pushTx({ church_id: 1, scope: 'LOCAL', type: 'INGRESO', category: 'OFRENDA_MISIONERA', amount: s.c1[2], tx_date: `${s.m}-21`, description: `Ofrenda misionera ${s.m}`, member_id: null, person_name: '', activity_id: null, payment_method: 'CUENTA_BANCARIA', receipt_number: `OM-${s.m}-03` });
    pushTx({ church_id: 1, scope: 'LOCAL', type: 'EGRESO', category: 'REMUNERACION_PASTORAL', amount: s.e1[0], tx_date: `${s.m}-28`, description: `Emolumentos pastorales ${s.m}`, member_id: null, person_name: 'Pr. Carlos Mendoza', activity_id: null, payment_method: 'TRANSFERENCIA', receipt_number: `EG-${s.m}-01` });
    pushTx({ church_id: 1, scope: 'LOCAL', type: 'EGRESO', category: 'SERVICIOS_PUBLICOS', amount: s.e1[1], tx_date: `${s.m}-20`, description: 'Energía, agua e internet', member_id: null, person_name: 'Afinia / Veolia', activity_id: null, payment_method: 'CUENTA_BANCARIA', receipt_number: `EG-${s.m}-02` });
    pushTx({ church_id: 1, scope: 'LOCAL', type: 'EGRESO', category: 'APORTE_DISTRITAL', amount: s.e1[2], tx_date: `${s.m}-29`, description: 'Aporte distrital a Distrito Sabana', member_id: null, person_name: 'Tesorería Distrito Sabana', activity_id: null, payment_method: 'TRANSFERENCIA', receipt_number: `EG-${s.m}-03` });

    pushTx({ church_id: 2, scope: 'LOCAL', type: 'INGRESO', category: 'DIEZMO', amount: s.c2[0], tx_date: `${s.m}-10`, description: `Diezmos mensuales Betel ${s.m}`, member_id: null, person_name: 'Congregación Betel', activity_id: null, payment_method: 'CUENTA_BANCARIA', receipt_number: `BT-${s.m}-01` });
    pushTx({ church_id: 2, scope: 'LOCAL', type: 'INGRESO', category: 'OFRENDA_GENERAL', amount: s.c2[1], tx_date: `${s.m}-20`, description: `Ofrendas Betel ${s.m}`, member_id: null, person_name: '', activity_id: null, payment_method: 'EFECTIVO', receipt_number: `BT-${s.m}-02` });
    pushTx({ church_id: 2, scope: 'LOCAL', type: 'EGRESO', category: 'REMUNERACION_PASTORAL', amount: s.e2[0], tx_date: `${s.m}-28`, description: 'Remuneración pastoral', member_id: null, person_name: 'Rvdo. Jonás Pinto', activity_id: null, payment_method: 'TRANSFERENCIA', receipt_number: `BTE-${s.m}-01` });
    pushTx({ church_id: 2, scope: 'LOCAL', type: 'EGRESO', category: 'SERVICIOS_PUBLICOS', amount: s.e2[1], tx_date: `${s.m}-22`, description: 'Servicios públicos templo', member_id: null, person_name: '', activity_id: null, payment_method: 'CUENTA_BANCARIA', receipt_number: `BTE-${s.m}-02` });
  }

  // Noviembre 2026
  pushTx({ church_id: 1, scope: 'LOCAL', type: 'INGRESO', category: 'DIEZMO', amount: 420000, tx_date: '2026-11-01', description: 'Diezmo mes de noviembre', member_id: 1, person_name: 'Sandra Milena Torres Ruiz', activity_id: null, payment_method: 'TRANSFERENCIA', receipt_number: 'DZ-202611-01' });
  pushTx({ church_id: 1, scope: 'LOCAL', type: 'INGRESO', category: 'DIEZMO', amount: 650000, tx_date: '2026-11-01', description: 'Diezmo mes de noviembre', member_id: 2, person_name: 'Pedro Nel Gómez Acosta', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'DZ-202611-02' });
  pushTx({ church_id: 1, scope: 'LOCAL', type: 'INGRESO', category: 'DIEZMO', amount: 500000, tx_date: '2026-11-08', description: 'Diezmo mes de noviembre', member_id: 3, person_name: 'Andrés Felipe Ramos Pineda', activity_id: null, payment_method: 'NEQUI', receipt_number: 'DZ-202611-03' });
  pushTx({ church_id: 1, scope: 'LOCAL', type: 'INGRESO', category: 'DIEZMO', amount: 340000, tx_date: '2026-11-08', description: 'Diezmo mes de noviembre', member_id: 4, person_name: 'María Alejandra Navarro Gil', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'DZ-202611-04' });
  pushTx({ church_id: 1, scope: 'LOCAL', type: 'INGRESO', category: 'DIEZMO', amount: 280000, tx_date: '2026-11-15', description: 'Diezmo mes de noviembre', member_id: 13, person_name: 'Yadira del Carmen Ospino', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'DZ-202611-05' });
  pushTx({ church_id: 1, scope: 'LOCAL', type: 'INGRESO', category: 'OFRENDA_GENERAL', amount: 890000, tx_date: '2026-11-08', description: 'Ofrendas cultos 1a y 2a semana', member_id: null, person_name: '', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'OF-202611-01' });
  pushTx({ church_id: 1, scope: 'LOCAL', type: 'INGRESO', category: 'OFRENDA_GENERAL', amount: 760000, tx_date: '2026-11-15', description: 'Ofrendas culto dominical 15 nov', member_id: null, person_name: '', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'OF-202611-02' });
  pushTx({ church_id: 1, scope: 'LOCAL', type: 'INGRESO', category: 'OFRENDA_MISIONERA', amount: 410000, tx_date: '2026-11-15', description: 'Ofrenda especial misiones', member_id: null, person_name: '', activity_id: null, payment_method: 'CUENTA_BANCARIA', receipt_number: 'OM-202611-01' });

  pushTx({ church_id: 1, scope: 'LOCAL', type: 'EGRESO', category: 'REMUNERACION_PASTORAL', amount: 2200000, tx_date: '2026-11-15', description: 'Emolumentos pastorales noviembre', member_id: null, person_name: 'Pr. Carlos Mendoza', activity_id: null, payment_method: 'TRANSFERENCIA', receipt_number: 'EG-202611-01' });
  pushTx({ church_id: 1, scope: 'LOCAL', type: 'EGRESO', category: 'SERVICIOS_PUBLICOS', amount: 485000, tx_date: '2026-11-14', description: 'Factura energía y agua', member_id: null, person_name: 'Afinia / Veolia', activity_id: null, payment_method: 'CUENTA_BANCARIA', receipt_number: 'EG-202611-02' });
  pushTx({ church_id: 1, scope: 'LOCAL', type: 'EGRESO', category: 'GASTO_ACTIVIDAD', amount: 390000, tx_date: '2026-11-14', description: 'Insumos arroz con pollo pro-templo', member_id: null, person_name: 'Mercado Nuevo', activity_id: 1, payment_method: 'EFECTIVO', receipt_number: 'EG-202611-03' });
  pushTx({ church_id: 1, scope: 'LOCAL', type: 'EGRESO', category: 'APORTE_DISTRITAL', amount: 350000, tx_date: '2026-11-16', description: 'Aporte mensual al Distrito Sabana', member_id: null, person_name: 'Tesorería Distrito Sabana', activity_id: null, payment_method: 'TRANSFERENCIA', receipt_number: 'EG-202611-04' });

  pushTx({ church_id: 2, scope: 'LOCAL', type: 'INGRESO', category: 'DIEZMO', amount: 920000, tx_date: '2026-11-08', description: 'Diezmo noviembre', member_id: 15, person_name: 'Yolanda Esther Vergara', activity_id: null, payment_method: 'CUENTA_BANCARIA', receipt_number: 'BT-202611-01' });
  pushTx({ church_id: 2, scope: 'LOCAL', type: 'INGRESO', category: 'DIEZMO', amount: 1480000, tx_date: '2026-11-15', description: 'Diezmos congregación noviembre', member_id: null, person_name: 'Congregación Betel', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'BT-202611-02' });
  pushTx({ church_id: 2, scope: 'LOCAL', type: 'INGRESO', category: 'OFRENDA_GENERAL', amount: 1950000, tx_date: '2026-11-15', description: 'Ofrendas generales noviembre', member_id: null, person_name: '', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'BT-202611-03' });
  pushTx({ church_id: 2, scope: 'LOCAL', type: 'EGRESO', category: 'REMUNERACION_PASTORAL', amount: 2800000, tx_date: '2026-11-15', description: 'Remuneración mensual noviembre', member_id: null, person_name: 'Rvdo. Jonás Pinto', activity_id: null, payment_method: 'TRANSFERENCIA', receipt_number: 'BTE-202611-01' });
  pushTx({ church_id: 2, scope: 'LOCAL', type: 'EGRESO', category: 'SERVICIOS_PUBLICOS', amount: 560000, tx_date: '2026-11-15', description: 'Servicios públicos noviembre', member_id: null, person_name: '', activity_id: null, payment_method: 'CUENTA_BANCARIA', receipt_number: 'BTE-202611-02' });

  pushTx({ church_id: 3, scope: 'LOCAL', type: 'INGRESO', category: 'DIEZMO', amount: 1120000, tx_date: '2026-11-15', description: 'Diezmos noviembre Monte de Sion', member_id: null, person_name: 'Congregación Sampués', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'MS-202611-01' });
  pushTx({ church_id: 3, scope: 'LOCAL', type: 'INGRESO', category: 'OFRENDA_GENERAL', amount: 880000, tx_date: '2026-11-15', description: 'Ofrendas noviembre', member_id: null, person_name: '', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'MS-202611-02' });
  pushTx({ church_id: 3, scope: 'LOCAL', type: 'EGRESO', category: 'ARRIENDO_TEMPLO', amount: 850000, tx_date: '2026-11-05', description: 'Arriendo local templo noviembre', member_id: null, person_name: 'Familia Hernández', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'MSE-202611-01' });
  pushTx({ church_id: 3, scope: 'LOCAL', type: 'EGRESO', category: 'ARRIENDO_CASA_PASTORAL', amount: 500000, tx_date: '2026-11-05', description: 'Arriendo casa pastoral noviembre', member_id: null, person_name: '', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'MSE-202611-02' });

  pushTx({ church_id: 4, scope: 'LOCAL', type: 'INGRESO', category: 'OFRENDA_GENERAL', amount: 480000, tx_date: '2026-11-15', description: 'Ofrendas noviembre Campo Luz del Evangelio', member_id: null, person_name: '', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'LE-202611-01' });
  pushTx({ church_id: 4, scope: 'LOCAL', type: 'EGRESO', category: 'AYUDA_SOCIAL', amount: 180000, tx_date: '2026-11-16', description: 'Transporte pastoral y biblias', member_id: null, person_name: '', activity_id: null, payment_method: 'EFECTIVO', receipt_number: 'LEE-202611-01' });

  pushTx({ church_id: null, scope: 'DISTRITAL', type: 'INGRESO', category: 'APORTE_DISTRITAL', amount: 1250000, tx_date: '2026-11-16', description: 'Recaudo consolidado aportes distritales', member_id: null, person_name: 'Iglesias Distrito Sabana', activity_id: null, payment_method: 'CUENTA_BANCARIA', receipt_number: 'DS-202611-01' });
  pushTx({ church_id: null, scope: 'DISTRITAL', type: 'EGRESO', category: 'APORTE_NACIONAL', amount: 450000, tx_date: '2026-11-18', description: 'Aporte a Sede Nacional IGLEICO', member_id: null, person_name: 'IGLEICO Nacional', activity_id: null, payment_method: 'TRANSFERENCIA', receipt_number: 'DSE-202611-01' });

  const loans: DebtLoan[] = [
    {
      id: 1, church_id: 1, creditor: 'Fondo Rotatorio IGLEICO Nacional',
      initial_amount: 12000000, remaining_amount: 4500000, start_date: '2024-06-01',
      term_description: '36 meses (cuotas mensuales de $350.000)', seniority_text: '2 años y 5 meses',
      status: 'ACTIVO', notes: 'Préstamo para ampliación de techo y salones de Escuela Dominical.',
    },
  ];

  return { nextId: 500, district, zones, churches, pastors, users, members, activities, participants, payments, transactions, loans };
}

function loadStore(): StaticStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StaticStore;
  } catch {}
  const init = createInitialStore();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
  return init;
}

function saveStore(store: StaticStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getChurchName(store: StaticStore, churchId: number | null | undefined): string | null {
  if (!churchId) return null;
  return store.churches.find((c) => c.id === churchId)?.name || null;
}

function hydrateChurch(store: StaticStore, c: Church): Church {
  const auto = computeChurchAutoCensus(store, c.id);
  const effective = c.use_auto_census === 0 ? recalcCensus(c.manual_census || {}) : auto;
  const pastor = store.pastors.find((p) => p.church_id === c.id && p.status === 'ACTIVO');
  const monthMap = new Map<string, number>();
  for (const t of store.transactions) {
    if (t.church_id === c.id && t.type === 'INGRESO') {
      const ym = t.tx_date.slice(0, 7);
      monthMap.set(ym, (monthMap.get(ym) || 0) + Number(t.amount));
    }
  }
  const vals = Array.from(monthMap.values());
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : c.avg_monthly_income;
  return {
    ...c,
    auto_census: auto,
    census: effective,
    live_avg_monthly_income: avg,
    pastor: pastor ? { id: pastor.id, full_name: pastor.full_name, ministerial_dignity: pastor.ministerial_dignity, phone: pastor.phone } : null,
    loans: store.loans.filter((l) => l.church_id === c.id),
  };
}

function getCurrentUser(store: StaticStore, token: string | null): AuthUser | null {
  if (!token || !token.startsWith('static-uid-')) return null;
  const uid = Number(token.replace('static-uid-', ''));
  const u = store.users.find((x) => x.id === uid && x.is_active);
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    church_id: u.church_id,
    church_name: getChurchName(store, u.church_id),
  };
}

function scopeChurch(user: AuthUser, reqParam: string | null): number | null {
  if (user.role !== 'ADMIN_DISTRITO') return user.church_id;
  if (reqParam && reqParam !== 'all') {
    const n = Number(reqParam);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

export async function handleStaticRequest<T>(
  rawPath: string,
  method: string,
  body: Record<string, unknown> | undefined,
  token: string | null
): Promise<T> {
  const store = loadStore();
  const url = new URL(rawPath, 'https://demo.local');
  const pathname = url.pathname;
  const q = url.searchParams;

  // LOGIN
  if (pathname === '/api/auth/login' && method === 'POST') {
    const uStr = String(body?.username || '').trim().toLowerCase();
    const pStr = String(body?.password || '');
    const found = store.users.find(
      (u) => (u.username.toLowerCase() === uStr || u.email.toLowerCase() === uStr) && u.password === pStr
    );
    if (!found) throw new Error('Usuario o contraseña incorrectos.');
    if (!found.is_active) throw new Error('Tu usuario está desactivado.');
    const authUser: AuthUser = {
      id: found.id,
      username: found.username,
      email: found.email,
      full_name: found.full_name,
      role: found.role,
      church_id: found.church_id,
      church_name: getChurchName(store, found.church_id),
    };
    return { token: `static-uid-${found.id}`, user: authUser } as T;
  }

  const user = getCurrentUser(store, token);
  if (!user) throw new Error('Sesión requerida. Inicia sesión para continuar.');

  if (pathname === '/api/auth/me') return { user } as T;

  // USERS
  if (pathname === '/api/auth/users') {
    if (user.role !== 'ADMIN_DISTRITO') throw new Error('Acceso restringido al Distrito.');
    if (method === 'GET') {
      return {
        users: store.users.map(({ password: _, ...u }) => ({ ...u, church_name: getChurchName(store, u.church_id) })),
      } as T;
    }
    if (method === 'POST') {
      const id = store.nextId++;
      const role = String(body?.role || 'PASTOR_LOCAL') as UserRole;
      const churchId = role === 'ADMIN_DISTRITO' ? null : Number(body?.church_id);
      store.users.push({
        id,
        username: String(body?.username || '').trim().toLowerCase(),
        email: String(body?.email || ''),
        password: String(body?.password || '123456'),
        full_name: String(body?.full_name || ''),
        role,
        church_id: churchId,
        church_name: getChurchName(store, churchId),
        is_active: 1,
        created_at: new Date().toISOString().slice(0, 10),
      });
      saveStore(store);
      return { id } as T;
    }
  }
  const userMatch = pathname.match(/^\/api\/auth\/users\/(\d+)$/);
  if (userMatch) {
    const id = Number(userMatch[1]);
    if (method === 'PUT') {
      const u = store.users.find((x) => x.id === id);
      if (u) {
        u.full_name = String(body?.full_name ?? u.full_name);
        u.email = String(body?.email ?? u.email);
        u.role = (body?.role as UserRole) || u.role;
        u.church_id = u.role === 'ADMIN_DISTRITO' ? null : Number(body?.church_id ?? u.church_id);
        u.is_active = body?.is_active ? 1 : 0;
        saveStore(store);
      }
      return { ok: true } as T;
    }
    if (method === 'DELETE') {
      if (id === user.id) throw new Error('No puedes eliminar tu propio usuario.');
      store.users = store.users.filter((x) => x.id !== id);
      saveStore(store);
      return { ok: true } as T;
    }
  }

  // DISTRICT & ZONES
  if (pathname === '/api/district') {
    if (method === 'GET') return { district: store.district, zones: store.zones } as T;
    if (method === 'PUT') {
      store.district = { ...store.district, ...(body as Partial<District>) };
      saveStore(store);
      return { ok: true } as T;
    }
  }
  if (pathname === '/api/zones' && method === 'POST') {
    const id = store.nextId++;
    store.zones.push({
      id,
      district_id: 1,
      name: String(body?.name || ''),
      coordinator_name: String(body?.coordinator_name || ''),
      description: String(body?.description || ''),
    });
    saveStore(store);
    return { id } as T;
  }
  const zoneMatch = pathname.match(/^\/api\/zones\/(\d+)$/);
  if (zoneMatch && method === 'DELETE') {
    const id = Number(zoneMatch[1]);
    store.zones = store.zones.filter((z) => z.id !== id);
    saveStore(store);
    return { ok: true } as T;
  }

  // DASHBOARD
  if (pathname === '/api/dashboard') {
    const cid = scopeChurch(user, q.get('church_id'));
    const currentMonth = '2026-11';
    const scopedChurches = cid ? store.churches.filter((c) => c.id === cid) : store.churches;
    const hydrated = scopedChurches.map((c) => hydrateChurch(store, c));
    const totalCensus = sumCensus(hydrated.map((c) => c.census));

    const scopedTx = cid ? store.transactions.filter((t) => t.church_id === cid) : store.transactions;
    const monthTx = scopedTx.filter((t) => t.tx_date.startsWith(currentMonth));
    const monthIncome = monthTx.filter((t) => t.type === 'INGRESO').reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthTx.filter((t) => t.type === 'EGRESO').reduce((s, t) => s + t.amount, 0);
    const totalIncome = scopedTx.filter((t) => t.type === 'INGRESO').reduce((s, t) => s + t.amount, 0);
    const totalExpense = scopedTx.filter((t) => t.type === 'EGRESO').reduce((s, t) => s + t.amount, 0);

    const ymMap = new Map<string, { month: string; ingresos: number; egresos: number }>();
    for (const t of scopedTx) {
      const m = t.tx_date.slice(0, 7);
      const entry = ymMap.get(m) || { month: m, ingresos: 0, egresos: 0 };
      if (t.type === 'INGRESO') entry.ingresos += t.amount;
      else entry.egresos += t.amount;
      ymMap.set(m, entry);
    }
    const monthly_series = Array.from(ymMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);

    const catMap = new Map<string, number>();
    for (const t of monthTx) {
      if (t.type === 'INGRESO') catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    }
    const income_by_category = Array.from(catMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    const activeActs = store.activities.filter(
      (a) => a.status === 'ACTIVA' && (!cid || a.church_id === cid || a.scope === 'DISTRITAL')
    );
    const activeIds = new Set(activeActs.map((a) => a.id));
    const scopedParts = store.participants.filter(
      (p) => activeIds.has(p.activity_id) && (!cid || p.church_id === cid)
    );

    const actAssigned = scopedParts.reduce((s, p) => s + p.assigned_amount, 0);
    const actPaid = scopedParts.reduce((s, p) => s + p.paid_amount, 0);
    const actPending = scopedParts.reduce((s, p) => s + Math.max(0, p.assigned_amount - p.paid_amount), 0);
    const debtorsCount = scopedParts.filter((p) => p.assigned_amount > p.paid_amount).length;

    const active_activities = activeActs.map((a) => {
      const ps = store.participants.filter((p) => p.activity_id === a.id && (!cid || a.scope === 'LOCAL' || p.church_id === cid));
      return {
        ...a,
        church_name: getChurchName(store, a.church_id),
        participants_count: ps.length,
        total_assigned: ps.reduce((s, p) => s + p.assigned_amount, 0),
        total_paid: ps.reduce((s, p) => s + p.paid_amount, 0),
        total_pending: ps.reduce((s, p) => s + Math.max(0, p.assigned_amount - p.paid_amount), 0),
      };
    });

    const top_debtors = scopedParts
      .filter((p) => p.assigned_amount > p.paid_amount)
      .map((p) => {
        const a = store.activities.find((x) => x.id === p.activity_id);
        return {
          ...p,
          pending_amount: p.assigned_amount - p.paid_amount,
          activity_name: a?.name || '',
          church_name: getChurchName(store, p.church_id),
        };
      })
      .sort((a, b) => b.pending_amount - a.pending_amount)
      .slice(0, 8);

    const churches_summary = hydrated.map((c) => {
      const cMonthTx = store.transactions.filter((t) => t.church_id === c.id && t.tx_date.startsWith(currentMonth));
      const cPending = store.participants
        .filter((p) => activeIds.has(p.activity_id) && p.church_id === c.id)
        .reduce((s, p) => s + Math.max(0, p.assigned_amount - p.paid_amount), 0);
      return {
        id: c.id,
        name: c.name,
        municipality: c.municipality,
        zone_name: c.zone_name,
        categorization: c.categorization,
        pastor_name: c.pastor ? `${c.pastor.ministerial_dignity === 'REVERENDO' ? 'Rvdo.' : c.pastor.ministerial_dignity === 'PASTOR' ? 'Pr.' : 'Líd.'} ${c.pastor.full_name}` : 'Sin asignar',
        members_total: c.census.grand_total,
        baptized: c.census.total_baptized,
        month_income: cMonthTx.filter((t) => t.type === 'INGRESO').reduce((s, t) => s + t.amount, 0),
        month_expense: cMonthTx.filter((t) => t.type === 'EGRESO').reduce((s, t) => s + t.amount, 0),
        activity_pending: cPending,
      };
    });

    const pastorsCount = store.pastors.filter((p) => p.status === 'ACTIVO' && (!cid || p.church_id === cid)).length;
    const loansRem = store.loans.filter((l) => l.status === 'ACTIVO' && (!cid || l.church_id === cid)).reduce((s, l) => s + l.remaining_amount, 0);

    return {
      district: store.district,
      current_month: currentMonth,
      kpis: {
        churches_total: hydrated.length,
        constituidas: hydrated.filter((c) => c.categorization === 'CONSTITUIDA').length,
        en_formacion: hydrated.filter((c) => c.categorization === 'EN_FORMACION').length,
        campos_predicacion: hydrated.filter((c) => c.categorization === 'CAMPO_PREDICACION').length,
        pastors_total: pastorsCount,
        members_total: totalCensus.grand_total,
        baptized_total: totalCensus.total_baptized,
        not_baptized_total: totalCensus.total_not_baptized,
        children_total: totalCensus.total_children,
        month_income: monthIncome,
        month_expense: monthExpense,
        month_balance: monthIncome - monthExpense,
        accumulated_balance: totalIncome - totalExpense,
        activity_assigned: actAssigned,
        activity_paid: actPaid,
        activity_pending: actPending,
        debtors_count: debtorsCount,
        loans_remaining: loansRem,
      },
      census: totalCensus,
      monthly_series,
      income_by_category,
      active_activities,
      top_debtors,
      churches_summary,
    } as T;
  }

  // CHURCHES
  if (pathname === '/api/churches') {
    if (method === 'GET') {
      const list = user.role === 'ADMIN_DISTRITO' ? store.churches : store.churches.filter((c) => c.id === user.church_id);
      return { churches: list.map((c) => hydrateChurch(store, c)) } as T;
    }
    if (method === 'POST') {
      const id = store.nextId++;
      const ch = { ...(body as unknown as Church), id, district_id: 1, is_active: 1 };
      store.churches.push(ch);
      saveStore(store);
      return { church: hydrateChurch(store, ch) } as T;
    }
  }
  const chMatch = pathname.match(/^\/api\/churches\/(\d+)$/);
  if (chMatch) {
    const id = Number(chMatch[1]);
    if (method === 'GET') {
      const c = store.churches.find((x) => x.id === id);
      if (!c) throw new Error('Iglesia no encontrada.');
      return { church: hydrateChurch(store, c) } as T;
    }
    if (method === 'PUT') {
      const idx = store.churches.findIndex((x) => x.id === id);
      if (idx >= 0) {
        store.churches[idx] = { ...store.churches[idx], ...(body as Partial<Church>), id };
        saveStore(store);
        return { church: hydrateChurch(store, store.churches[idx]) } as T;
      }
    }
    if (method === 'DELETE') {
      store.churches = store.churches.filter((x) => x.id !== id);
      saveStore(store);
      return { ok: true } as T;
    }
  }

  // PASTORS
  if (pathname === '/api/pastors') {
    if (method === 'GET') {
      const list = user.role === 'ADMIN_DISTRITO' ? store.pastors : store.pastors.filter((p) => p.church_id === user.church_id);
      return { pastors: list.map((p) => ({ ...p, church_name: getChurchName(store, p.church_id) })) } as T;
    }
    if (method === 'POST') {
      const id = store.nextId++;
      const p = {
        ...(body as unknown as Pastor),
        id,
        district_id: 1,
        church_id: user.role === 'ADMIN_DISTRITO' ? (body?.church_id ? Number(body.church_id) : null) : user.church_id,
      };
      store.pastors.push(p);
      saveStore(store);
      return { pastor: { ...p, church_name: getChurchName(store, p.church_id) } } as T;
    }
  }
  const pasMatch = pathname.match(/^\/api\/pastors\/(\d+)$/);
  if (pasMatch) {
    const id = Number(pasMatch[1]);
    if (method === 'PUT') {
      const idx = store.pastors.findIndex((x) => x.id === id);
      if (idx >= 0) {
        store.pastors[idx] = { ...store.pastors[idx], ...(body as Partial<Pastor>), id };
        saveStore(store);
        return { pastor: { ...store.pastors[idx], church_name: getChurchName(store, store.pastors[idx].church_id) } } as T;
      }
    }
    if (method === 'DELETE') {
      store.pastors = store.pastors.filter((x) => x.id !== id);
      saveStore(store);
      return { ok: true } as T;
    }
  }

  // MEMBERS
  if (pathname === '/api/members') {
    if (method === 'GET') {
      const cid = scopeChurch(user, q.get('church_id'));
      const search = (q.get('q') || '').trim().toLowerCase();
      const org = q.get('organism') || '';
      const bap = q.get('baptism') || '';
      const activeIds = new Set(store.activities.filter((a) => a.status === 'ACTIVA').map((a) => a.id));

      const filtered = store.members
        .filter((m) => {
          if (cid && m.church_id !== cid) return false;
          if (org && org !== 'ALL' && m.organism !== org) return false;
          if (bap && bap !== 'ALL' && m.baptism_status !== bap) return false;
          if (
            search &&
            !m.full_name.toLowerCase().includes(search) &&
            !(m.id_number || '').toLowerCase().includes(search) &&
            !(m.phone || '').toLowerCase().includes(search) &&
            !(m.profession || '').toLowerCase().includes(search)
          )
            return false;
          return true;
        })
        .map((m) => ({
          ...m,
          church_name: getChurchName(store, m.church_id) || '',
          pending_activity_debt: store.participants
            .filter((p) => p.member_id === m.id && activeIds.has(p.activity_id))
            .reduce((s, p) => s + Math.max(0, p.assigned_amount - p.paid_amount), 0),
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
      return { members: filtered } as T;
    }
    if (method === 'POST') {
      const id = store.nextId++;
      const m: Member = {
        ...(body as unknown as Member),
        id,
        church_id: user.role === 'ADMIN_DISTRITO' ? Number(body?.church_id) : Number(user.church_id),
      };
      store.members.push(m);
      saveStore(store);
      return { member: { ...m, church_name: getChurchName(store, m.church_id) || '' } } as T;
    }
  }
  const memMatch = pathname.match(/^\/api\/members\/(\d+)$/);
  if (memMatch) {
    const id = Number(memMatch[1]);
    if (method === 'GET') {
      const m = store.members.find((x) => x.id === id);
      if (!m) throw new Error('Miembro no encontrado.');
      const acts = store.participants
        .filter((p) => p.member_id === id)
        .map((p) => {
          const a = store.activities.find((x) => x.id === p.activity_id);
          return {
            ...p,
            activity_name: a?.name || '',
            event_date: a?.event_date || '',
            pending_amount: Math.max(0, p.assigned_amount - p.paid_amount),
          };
        });
      const tithes = store.transactions
        .filter((t) => t.member_id === id && t.type === 'INGRESO')
        .sort((a, b) => b.tx_date.localeCompare(a.tx_date));
      return { member: { ...m, church_name: getChurchName(store, m.church_id) || '' }, activities: acts, tithes } as T;
    }
    if (method === 'PUT') {
      const idx = store.members.findIndex((x) => x.id === id);
      if (idx >= 0) {
        store.members[idx] = { ...store.members[idx], ...(body as Partial<Member>), id };
        saveStore(store);
      }
      return { member: store.members[idx] } as T;
    }
    if (method === 'DELETE') {
      store.members = store.members.filter((x) => x.id !== id);
      saveStore(store);
      return { ok: true } as T;
    }
  }

  // ACTIVITIES
  if (pathname === '/api/activities') {
    if (method === 'GET') {
      const cid = scopeChurch(user, q.get('church_id'));
      const list = store.activities
        .filter((a) => !cid || a.church_id === cid || a.scope === 'DISTRITAL')
        .map((a) => {
          const ps = store.participants.filter(
            (p) => p.activity_id === a.id && (user.role === 'ADMIN_DISTRITO' || a.scope === 'LOCAL' || p.church_id === user.church_id)
          );
          return {
            ...a,
            church_name: getChurchName(store, a.church_id),
            participants_count: ps.length,
            total_assigned: ps.reduce((s, p) => s + p.assigned_amount, 0),
            total_paid: ps.reduce((s, p) => s + p.paid_amount, 0),
            total_pending: ps.reduce((s, p) => s + Math.max(0, p.assigned_amount - p.paid_amount), 0),
            debtors_count: ps.filter((p) => p.assigned_amount > p.paid_amount).length,
          };
        });
      return { activities: list } as T;
    }
    if (method === 'POST') {
      const id = store.nextId++;
      const scope = user.role === 'ADMIN_DISTRITO' ? (String(body?.scope || 'LOCAL') as 'LOCAL' | 'DISTRITAL') : 'LOCAL';
      const churchId = scope === 'DISTRITAL' ? null : user.role === 'ADMIN_DISTRITO' ? Number(body?.church_id) : user.church_id;
      const act: Activity = {
        id,
        district_id: 1,
        church_id: churchId,
        scope,
        name: String(body?.name || ''),
        activity_type: (body?.activity_type as Activity['activity_type']) || 'VENTA_RECAUDO',
        organism: String(body?.organism || 'GENERAL'),
        event_date: String(body?.event_date || new Date().toISOString().slice(0, 10)),
        location: String(body?.location || ''),
        responsible_name: String(body?.responsible_name || user.full_name),
        unit_label: String(body?.unit_label || 'Unidad'),
        unit_price: Number(body?.unit_price || 0),
        goal_amount: Number(body?.goal_amount || 0),
        description: String(body?.description || ''),
        status: 'ACTIVA',
      };
      store.activities.unshift(act);
      saveStore(store);
      return { activity: act } as T;
    }
  }

  const actPayMatch = pathname.match(/^\/api\/activities\/(\d+)\/participants\/(\d+)\/payments$/);
  if (actPayMatch && method === 'POST') {
    const activityId = Number(actPayMatch[1]);
    const pid = Number(actPayMatch[2]);
    const act = store.activities.find((a) => a.id === activityId);
    const part = store.participants.find((p) => p.id === pid);
    if (!act || !part) throw new Error('Registro no encontrado.');
    const amount = Number(body?.amount || 0);
    if (amount <= 0) throw new Error('Monto inválido.');
    const paymentDate = String(body?.payment_date || new Date().toISOString().slice(0, 10));
    const paymentMethod = String(body?.payment_method || 'EFECTIVO');
    const notes = String(body?.notes || '');
    let financeTxId: number | null = null;

    if (body?.record_in_finance !== false) {
      financeTxId = store.nextId++;
      const txScope = act.scope === 'DISTRITAL' && user.role === 'ADMIN_DISTRITO' ? 'DISTRITAL' : 'LOCAL';
      store.transactions.unshift({
        id: financeTxId,
        district_id: 1,
        church_id: txScope === 'DISTRITAL' ? null : (part.church_id ?? act.church_id ?? user.church_id),
        scope: txScope,
        type: 'INGRESO',
        category: 'ACTIVIDAD',
        amount,
        tx_date: paymentDate,
        description: `Abono actividad: ${act.name} – ${part.person_name}${notes ? ` (${notes})` : ''}`,
        member_id: part.member_id,
        person_name: part.person_name,
        activity_id: activityId,
        payment_method: paymentMethod,
        receipt_number: `ABN-${activityId}-${Date.now().toString().slice(-4)}`,
      });
    }

    part.paid_amount += amount;
    part.pending_amount = Math.max(0, part.assigned_amount - part.paid_amount);
    store.payments.unshift({
      id: store.nextId++,
      participant_id: pid,
      activity_id: activityId,
      person_name: part.person_name,
      amount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      notes,
      finance_tx_id: financeTxId,
    });
    saveStore(store);
    return { ok: true, finance_tx_id: financeTxId } as T;
  }

  const actPartItemMatch = pathname.match(/^\/api\/activities\/(\d+)\/participants\/(\d+)$/);
  if (actPartItemMatch) {
    const pid = Number(actPartItemMatch[2]);
    if (method === 'PUT') {
      const part = store.participants.find((p) => p.id === pid);
      if (part) {
        part.attendance_status = (body?.attendance_status as ActivityParticipant['attendance_status']) || part.attendance_status;
        if (body?.assigned_amount !== undefined) {
          part.assigned_amount = Number(body.assigned_amount);
          part.pending_amount = Math.max(0, part.assigned_amount - part.paid_amount);
        }
        saveStore(store);
      }
      return { ok: true } as T;
    }
    if (method === 'DELETE') {
      store.participants = store.participants.filter((p) => p.id !== pid);
      saveStore(store);
      return { ok: true } as T;
    }
  }

  const actPartsMatch = pathname.match(/^\/api\/activities\/(\d+)\/participants$/);
  if (actPartsMatch && method === 'POST') {
    const activityId = Number(actPartsMatch[1]);
    const act = store.activities.find((a) => a.id === activityId);
    if (!act) throw new Error('Actividad no encontrada.');
    const memberId = body?.member_id ? Number(body.member_id) : null;
    const member = memberId ? store.members.find((m) => m.id === memberId) : null;
    const personName = member ? member.full_name : String(body?.person_name || '').trim();
    const personPhone = String(body?.person_phone || member?.phone || '');
    const churchId = member ? member.church_id : act.church_id ?? user.church_id;
    const quantity = Number(body?.quantity ?? 1);
    const unitPrice = Number(body?.unit_price ?? act.unit_price);
    const assigned = body?.assigned_amount !== undefined ? Number(body.assigned_amount) : quantity * unitPrice;
    const initialPayment = Math.max(0, Number(body?.initial_payment || 0));
    const pid = store.nextId++;

    store.participants.unshift({
      id: pid,
      activity_id: activityId,
      church_id: churchId,
      member_id: memberId,
      person_name: personName,
      person_phone: personPhone,
      is_member: memberId ? 1 : 0,
      item_detail: String(body?.item_detail || ''),
      quantity,
      unit_price: unitPrice,
      assigned_amount: assigned,
      paid_amount: initialPayment,
      pending_amount: Math.max(0, assigned - initialPayment),
      attendance_status: (body?.attendance_status as ActivityParticipant['attendance_status']) || 'CONFIRMADO',
      notes: String(body?.notes || ''),
    });

    if (initialPayment > 0) {
      const payDate = new Date().toISOString().slice(0, 10);
      const pm = String(body?.payment_method || 'EFECTIVO');
      let txId: number | null = null;
      if (body?.record_in_finance !== false) {
        txId = store.nextId++;
        const txScope = act.scope === 'DISTRITAL' && user.role === 'ADMIN_DISTRITO' ? 'DISTRITAL' : 'LOCAL';
        store.transactions.unshift({
          id: txId,
          district_id: 1,
          church_id: txScope === 'DISTRITAL' ? null : churchId,
          scope: txScope,
          type: 'INGRESO',
          category: 'ACTIVIDAD',
          amount: initialPayment,
          tx_date: payDate,
          description: `Abono inicial actividad: ${act.name} – ${personName}`,
          member_id: memberId,
          person_name: personName,
          activity_id: activityId,
          payment_method: pm,
          receipt_number: `ACT-${activityId}-${pid}`,
        });
      }
      store.payments.unshift({
        id: store.nextId++,
        participant_id: pid,
        activity_id: activityId,
        person_name: personName,
        amount: initialPayment,
        payment_date: payDate,
        payment_method: pm,
        notes: 'Abono inicial',
        finance_tx_id: txId,
      });
    }
    saveStore(store);
    return { id: pid } as T;
  }

  const actSingleMatch = pathname.match(/^\/api\/activities\/(\d+)$/);
  if (actSingleMatch) {
    const id = Number(actSingleMatch[1]);
    if (method === 'GET') {
      const act = store.activities.find((a) => a.id === id);
      if (!act) throw new Error('Actividad no encontrada.');
      const isLocalOnDist = act.scope === 'DISTRITAL' && user.role !== 'ADMIN_DISTRITO';
      const ps = store.participants
        .filter((p) => p.activity_id === id && (!isLocalOnDist || p.church_id === user.church_id))
        .map((p) => ({
          ...p,
          church_name: getChurchName(store, p.church_id),
          pending_amount: Math.max(0, p.assigned_amount - p.paid_amount),
        }));
      const pays = store.payments
        .filter((pay) => pay.activity_id === id)
        .map((pay) => ({
          ...pay,
          person_name: store.participants.find((p) => p.id === pay.participant_id)?.person_name || pay.person_name || '',
        }));
      return {
        activity: { ...act, church_name: getChurchName(store, act.church_id) },
        participants: ps,
        payments: pays,
        summary: {
          participants_count: ps.length,
          total_assigned: ps.reduce((s, p) => s + p.assigned_amount, 0),
          total_paid: ps.reduce((s, p) => s + p.paid_amount, 0),
          total_pending: ps.reduce((s, p) => s + p.pending_amount, 0),
          debtors_count: ps.filter((p) => p.pending_amount > 0).length,
        },
      } as T;
    }
    if (method === 'PUT') {
      const act = store.activities.find((a) => a.id === id);
      if (act) {
        Object.assign(act, body);
        saveStore(store);
      }
      return { ok: true } as T;
    }
  }

  // FINANCE
  if (pathname === '/api/finance/transactions') {
    if (method === 'GET') {
      const cid = scopeChurch(user, q.get('church_id'));
      const type = q.get('type') || 'ALL';
      const cat = q.get('category') || 'ALL';
      const month = q.get('month') || 'ALL';

      const list = store.transactions
        .filter((t) => {
          if (cid && t.church_id !== cid) return false;
          if (type !== 'ALL' && t.type !== type) return false;
          if (cat !== 'ALL' && t.category !== cat) return false;
          if (month !== 'ALL' && !t.tx_date.startsWith(month)) return false;
          return true;
        })
        .map((t) => ({ ...t, church_name: getChurchName(store, t.church_id) }))
        .sort((a, b) => b.tx_date.localeCompare(a.tx_date) || b.id - a.id);

      let total_income = 0, total_expense = 0, total_tithes = 0, total_offerings = 0, total_activities = 0;
      for (const t of list) {
        if (t.type === 'INGRESO') {
          total_income += t.amount;
          if (t.category === 'DIEZMO') total_tithes += t.amount;
          if (t.category.startsWith('OFRENDA')) total_offerings += t.amount;
          if (t.category === 'ACTIVIDAD') total_activities += t.amount;
        } else total_expense += t.amount;
      }

      return {
        transactions: list,
        summary: { total_income, total_expense, balance: total_income - total_expense, total_tithes, total_offerings, total_activities, count: list.length },
      } as T;
    }
    if (method === 'POST') {
      const id = store.nextId++;
      const scope = user.role === 'ADMIN_DISTRITO' ? (String(body?.scope || 'LOCAL') as 'LOCAL' | 'DISTRITAL') : 'LOCAL';
      const churchId = scope === 'DISTRITAL' ? null : user.role === 'ADMIN_DISTRITO' ? Number(body?.church_id) : user.church_id;
      const txDate = String(body?.tx_date || new Date().toISOString().slice(0, 10));
      const receipt = String(body?.receipt_number || '').trim() || `${body?.type === 'INGRESO' ? 'ING' : 'EGR'}-${txDate.replace(/-/g, '')}-${id}`;
      store.transactions.unshift({
        id,
        district_id: 1,
        church_id: churchId,
        scope,
        type: body?.type as 'INGRESO' | 'EGRESO',
        category: String(body?.category || ''),
        amount: Number(body?.amount || 0),
        tx_date: txDate,
        description: String(body?.description || ''),
        member_id: body?.member_id ? Number(body.member_id) : null,
        person_name: String(body?.person_name || ''),
        activity_id: null,
        payment_method: String(body?.payment_method || 'EFECTIVO'),
        receipt_number: receipt,
      });
      saveStore(store);
      return { id, receipt_number: receipt } as T;
    }
  }
  const txDelMatch = pathname.match(/^\/api\/finance\/transactions\/(\d+)$/);
  if (txDelMatch && method === 'DELETE') {
    const id = Number(txDelMatch[1]);
    store.transactions = store.transactions.filter((t) => t.id !== id);
    saveStore(store);
    return { ok: true } as T;
  }

  // LOANS
  if (pathname === '/api/finance/loans') {
    if (method === 'GET') {
      const cid = scopeChurch(user, q.get('church_id'));
      const list = store.loans
        .filter((l) => !cid || l.church_id === cid)
        .map((l) => ({ ...l, church_name: getChurchName(store, l.church_id) || '' }));
      return { loans: list } as T;
    }
    if (method === 'POST') {
      const id = store.nextId++;
      const cid = user.role === 'ADMIN_DISTRITO' ? Number(body?.church_id) : Number(user.church_id);
      const initial = Number(body?.initial_amount || 0);
      const rem = body?.remaining_amount !== undefined ? Number(body.remaining_amount) : initial;
      store.loans.unshift({
        id,
        church_id: cid,
        creditor: String(body?.creditor || ''),
        initial_amount: initial,
        remaining_amount: rem,
        start_date: String(body?.start_date || ''),
        term_description: String(body?.term_description || ''),
        seniority_text: String(body?.seniority_text || ''),
        status: rem <= 0 ? 'PAGADO' : 'ACTIVO',
        notes: String(body?.notes || ''),
      });
      saveStore(store);
      return { id } as T;
    }
  }
  const loanPayMatch = pathname.match(/^\/api\/finance\/loans\/(\d+)\/pay$/);
  if (loanPayMatch && method === 'POST') {
    const id = Number(loanPayMatch[1]);
    const loan = store.loans.find((l) => l.id === id);
    if (!loan) throw new Error('Préstamo no encontrado.');
    const amount = Number(body?.amount || 0);
    loan.remaining_amount = Math.max(0, loan.remaining_amount - amount);
    loan.status = loan.remaining_amount <= 0 ? 'PAGADO' : 'ACTIVO';
    if (body?.record_in_finance !== false) {
      store.transactions.unshift({
        id: store.nextId++,
        district_id: 1,
        church_id: loan.church_id,
        scope: 'LOCAL',
        type: 'EGRESO',
        category: 'PAGO_PRESTAMO',
        amount,
        tx_date: String(body?.payment_date || new Date().toISOString().slice(0, 10)),
        description: `Abono a préstamo: ${loan.creditor}`,
        member_id: null,
        person_name: loan.creditor,
        activity_id: null,
        payment_method: String(body?.payment_method || 'TRANSFERENCIA'),
        receipt_number: `PREST-${id}`,
      });
    }
    saveStore(store);
    return { ok: true } as T;
  }

  // REPORTS
  if (pathname === '/api/reports/financial') {
    const cid = scopeChurch(user, q.get('church_id'));
    const start = q.get('start_date') || '2026-01-01';
    const end = q.get('end_date') || '2026-12-31';
    const txs = store.transactions
      .filter((t) => t.tx_date >= start && t.tx_date <= end && (!cid || t.church_id === cid))
      .map((t) => ({ ...t, church_name: getChurchName(store, t.church_id) }))
      .sort((a, b) => a.tx_date.localeCompare(b.tx_date));

    const catMap = new Map<string, { type: string; category: string; total: number; count: number }>();
    const chMap = new Map<string, { church_name: string; ingresos: number; egresos: number; saldo: number }>();
    let total_income = 0, total_expense = 0;

    for (const t of txs) {
      if (t.type === 'INGRESO') total_income += t.amount;
      else total_expense += t.amount;
      const k = `${t.type}:${t.category}`;
      const ce = catMap.get(k) || { type: t.type, category: t.category, total: 0, count: 0 };
      ce.total += t.amount;
      ce.count += 1;
      catMap.set(k, ce);

      const cn = t.church_name || 'Tesorería Distrital (Distrito Sabana)';
      const che = chMap.get(cn) || { church_name: cn, ingresos: 0, egresos: 0, saldo: 0 };
      if (t.type === 'INGRESO') che.ingresos += t.amount;
      else che.egresos += t.amount;
      che.saldo = che.ingresos - che.egresos;
      chMap.set(cn, che);
    }

    return {
      district: store.district,
      church: cid ? hydrateChurch(store, store.churches.find((c) => c.id === cid)!) : null,
      period: { start_date: start, end_date: end },
      summary: { total_income, total_expense, net_balance: total_income - total_expense, transactions_count: txs.length },
      by_category: Array.from(catMap.values()).sort((a, b) => b.total - a.total),
      by_church: !cid ? Array.from(chMap.values()).sort((a, b) => b.ingresos - a.ingresos) : [],
      transactions: txs,
    } as T;
  }

  if (pathname === '/api/reports/census') {
    const cid = scopeChurch(user, q.get('church_id'));
    const list = cid ? store.churches.filter((c) => c.id === cid) : store.churches;
    const rows = list.map((c) => {
      const h = hydrateChurch(store, c);
      return { church_id: c.id, church_name: c.name, municipality: c.municipality, categorization: c.categorization, census: h.census };
    });
    return { district: store.district, rows, consolidated: sumCensus(rows.map((r) => r.census)) } as T;
  }

  if (pathname === '/api/reports/activities') {
    const cid = scopeChurch(user, q.get('church_id'));
    const onlyDebtors = q.get('only_debtors') === 'true';
    const rows = store.participants
      .map((p) => {
        const a = store.activities.find((x) => x.id === p.activity_id)!;
        const pending = Math.max(0, p.assigned_amount - p.paid_amount);
        return {
          activity_name: a?.name || '',
          event_date: a?.event_date || '',
          church_id: p.church_id ?? a?.church_id,
          church_name: getChurchName(store, p.church_id ?? a?.church_id) || 'Distrito Sabana',
          person_name: p.person_name,
          person_phone: p.person_phone,
          is_member: p.is_member,
          item_detail: p.item_detail,
          quantity: p.quantity,
          assigned_amount: p.assigned_amount,
          paid_amount: p.paid_amount,
          pending_amount: pending,
          attendance_status: p.attendance_status,
          notes: p.notes,
        };
      })
      .filter((r) => (!cid || r.church_id === cid) && (!onlyDebtors || r.pending_amount > 0))
      .sort((a, b) => b.pending_amount - a.pending_amount);

    return {
      district: store.district,
      rows,
      totals: {
        assigned: rows.reduce((s, r) => s + r.assigned_amount, 0),
        paid: rows.reduce((s, r) => s + r.paid_amount, 0),
        pending: rows.reduce((s, r) => s + r.pending_amount, 0),
      },
    } as T;
  }

  throw new Error(`Endpoint no encontrado en modo demostración: ${pathname}`);
}
