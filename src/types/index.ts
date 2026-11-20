export type UserRole =
  | 'ADMIN_DISTRITO'
  | 'PASTOR_LOCAL'
  | 'TESORERO_LOCAL'
  | 'SECRETARIO_LOCAL';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  church_id: number | null;
  church_name: string | null;
}

export interface District {
  id: number;
  name: string;
  organization: string;
  personeria: string;
  region: string;
  minister_name: string;
  substitute_minister_name: string;
  secretary_name: string;
  treasurer_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

export interface Zone {
  id: number;
  district_id: number;
  name: string;
  coordinator_name: string;
  description: string;
}

export interface CensusTable {
  infancy_0_12m: number;
  infancy_1_5: number;
  childhood_6_11: number;
  adolescents_12_14_b: number;
  adolescents_12_14_nb: number;
  youth_15_30_b: number;
  youth_15_30_nb: number;
  adults_31_59_b: number;
  adults_31_59_nb: number;
  seniors_60_plus_b: number;
  seniors_60_plus_nb: number;
  total_baptized: number;
  total_not_baptized: number;
  total_children: number;
  grand_total: number;
}

export interface DebtLoan {
  id: number;
  church_id: number;
  church_name?: string;
  creditor: string;
  initial_amount: number;
  remaining_amount: number;
  start_date: string;
  term_description: string;
  seniority_text: string;
  status: 'ACTIVO' | 'PAGADO';
  notes: string;
}

export interface Church {
  id: number;
  district_id: number;
  zone_id: number | null;
  zone_name: string;
  name: string;
  address: string;
  stratum: string;
  neighborhood: string;
  municipality: string;
  department: string;
  phone: string;
  email: string;
  categorization: 'CONSTITUIDA' | 'EN_FORMACION' | 'CAMPO_PREDICACION';
  foundation_month: string;
  foundation_year: string;
  is_active: number;

  premises_type: 'PROPIO' | 'COMODATO' | 'PRESTADO' | 'ARRENDADO' | 'OTRO';
  premises_other: string;
  property_owner_type: 'IGLEICO_CENTRAL' | 'IGLEICO' | 'TERCERO' | '';
  property_owner_name: string;
  rent_amount: number;
  rent_start_date: string;
  rent_end_date: string;
  has_pastoral_house: number;
  pastoral_house_rent: number;
  ownership_doc_type: 'ESCRITURA' | 'COMPRAVENTA' | 'NINGUNO';
  pays_property_tax: number;
  property_tax_up_to_date: 'SI' | 'NO' | 'NO_APLICA';
  other_properties: Record<string, { exists?: boolean; owner?: string; label?: string }>;
  has_leased_property: number;
  leased_property_income: number;
  vehicles: {
    has_car?: boolean;
    has_moto?: boolean;
    owner_type?: string;
    owner_third_party?: string;
    sold_transfer_done?: string;
  };

  avg_monthly_income: number;
  live_avg_monthly_income?: number;
  has_bank_account: number;
  bank_nit: string;
  bank_name: string;
  bank_account_type: string;
  has_accounts_payable: number;
  has_hired_staff: number;
  hired_staff: Array<{
    contract_type: string;
    value: number;
    start_date: string;
    end_date: string;
    pays_social_security: boolean;
  }>;

  has_copastor: number;
  copastor_name: string;
  copastor_phone: string;
  copastor_email: string;
  copastor_remuneration: number;
  copastor_no_pay: number;
  has_local_council: number;
  local_council_count: number;
  treasurer_name: string;
  treasurer_phone: string;
  treasurer_email: string;
  treasurer_academic: string;
  secretary_name: string;
  secretary_phone: string;
  secretary_email: string;
  secretary_academic: string;
  has_ucei: number;
  has_ujei: number;
  has_udei: number;
  has_unei: number;
  ministry_missions: number;
  ministry_discipleship: number;
  ministry_intercession: number;
  ministry_evangelism: number;
  ministry_worship: number;
  ministry_other: string;
  discipleship_program: string;
  has_preaching_fields: number;
  preaching_fields_count: number;
  has_ordained_ministers: number;
  ordained_ministers_count: number;
  has_retired_pastors: number;
  retired_pastors_count: number;
  has_professionals: number;
  professionals: Array<{ profession: string; count: number }>;
  skills: {
    communication?: boolean;
    journalism?: boolean;
    content?: boolean;
    cameraman?: boolean;
    image_editing?: boolean;
    programmer?: boolean;
    presenter?: boolean;
  };
  sunday_school_teachers: number;
  has_age_divided_classes: number;
  age_divided_classes_info: string;

  institutions: {
    school?: { exists?: boolean; name?: string };
    cdi?: { exists?: boolean; name?: string };
    foundation?: { exists?: boolean; name?: string };
    association?: { exists?: boolean; name?: string };
    business?: { exists?: boolean; count?: number; activity?: string };
  };
  social: {
    facebook?: string;
    tiktok?: string;
    instagram?: string;
    whatsapp?: string;
    youtube?: string;
    has_website?: boolean;
    website_name?: string;
    has_tv_channel?: boolean;
    has_virtual_radio?: boolean;
  };
  equipment: {
    camera?: boolean;
    videobeam?: boolean;
    screen?: boolean;
    computer?: boolean;
    other?: string;
  };
  has_theology_teachers: number;
  use_auto_census: number;
  manual_census: Partial<CensusTable>;
  auto_census?: CensusTable;
  census: CensusTable;
  pastor?: { id: number; full_name: string; ministerial_dignity: string; phone: string } | null;
  loans?: DebtLoan[];
}

export interface RoleHistoryItem {
  role: string;
  duration: string;
}

export interface PastorChild {
  name: string;
  birth_date: string;
}

export interface Pastor {
  id: number;
  district_id: number;
  church_id: number | null;
  church_name?: string | null;
  church_municipality?: string | null;
  full_name: string;
  birth_date: string;
  birth_place: string;
  id_number: string;
  phone: string;
  email: string;
  ministerial_dignity: 'REVERENDO' | 'PASTOR' | 'LIDER';
  ministry_start_month: string;
  ministry_start_year: string;
  ministry_time_text: string;
  past_churches: string;
  national_roles: RoleHistoryItem[];
  district_roles: RoleHistoryItem[];
  has_contract: number;
  contract_type: 'ACUERDO_EMOLUMENTOS' | 'LABORAL_TERMINO_FIJO' | 'LABORAL_TERMINO_INDEFINIDO' | 'NINGUNO';
  pays_social_security: number;
  contract_entity: 'IGLEICO' | 'IGLEICO_CENTRAL' | 'OTRO' | '';
  monthly_remuneration: number;
  has_real_estate: number;
  real_estate_details: string;
  academic_level: string;
  formal_theology_studies: string;
  informal_theology_studies: string;

  spouse_name: string;
  spouse_birth_date: string;
  spouse_birth_place: string;
  spouse_id_number: string;
  spouse_phone: string;
  spouse_email: string;
  spouse_dignity: string;
  spouse_receives_aid: number;
  spouse_monthly_aid: number;
  spouse_national_roles: RoleHistoryItem[];
  spouse_district_roles: RoleHistoryItem[];
  spouse_academic_level: string;
  spouse_formal_theology: string;
  spouse_informal_theology: string;
  children: PastorChild[];
  has_family_disability: number;
  disability_member: string;
  disability_details: string;

  data_auth_accepted: number;
  data_auth_date: string;
  signature_name: string;
  status: 'ACTIVO' | 'JUBILADO' | 'TRASLADADO' | 'INACTIVO';
}

export interface Member {
  id: number;
  church_id: number;
  church_name?: string;
  full_name: string;
  id_number: string;
  phone: string;
  email: string;
  birth_date: string;
  gender: 'M' | 'F';
  address: string;
  baptism_status: 'BAUTIZADO' | 'NO_BAUTIZADO' | 'NINO';
  baptism_date: string;
  organism: 'UCEI' | 'UDEI' | 'UJEI' | 'UNEI' | 'NINGUNO';
  church_role: string;
  profession: string;
  comm_skills: string;
  status: 'ACTIVO' | 'INACTIVO' | 'VISITANTE';
  notes: string;
  pending_activity_debt?: number;
}

export interface Activity {
  id: number;
  district_id: number;
  church_id: number | null;
  church_name?: string | null;
  scope: 'LOCAL' | 'DISTRITAL';
  name: string;
  activity_type: 'VENTA_RECAUDO' | 'EVENTO_CUOTA' | 'MINISTERIAL';
  organism: string;
  event_date: string;
  location: string;
  responsible_name: string;
  unit_label: string;
  unit_price: number;
  goal_amount: number;
  description: string;
  status: 'ACTIVA' | 'CERRADA' | 'CANCELADA';
  participants_count?: number;
  total_quantity?: number;
  total_assigned?: number;
  total_paid?: number;
  total_pending?: number;
  debtors_count?: number;
  confirmed_count?: number;
}

export interface ActivityParticipant {
  id: number;
  activity_id: number;
  church_id: number | null;
  church_name?: string | null;
  member_id: number | null;
  member_organism?: string | null;
  person_name: string;
  person_phone: string;
  is_member: number;
  item_detail: string;
  quantity: number;
  unit_price: number;
  assigned_amount: number;
  paid_amount: number;
  pending_amount: number;
  attendance_status: 'CONVOCADO' | 'CONFIRMADO' | 'ASISTIO' | 'NO_ASISTIO';
  notes: string;
}

export interface ActivityPayment {
  id: number;
  participant_id: number;
  activity_id: number;
  person_name?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
  finance_tx_id: number | null;
}

export interface FinancialTransaction {
  id: number;
  district_id: number;
  church_id: number | null;
  church_name?: string | null;
  scope: 'LOCAL' | 'DISTRITAL';
  type: 'INGRESO' | 'EGRESO';
  category: string;
  amount: number;
  tx_date: string;
  description: string;
  member_id: number | null;
  person_name: string;
  activity_id: number | null;
  activity_name?: string | null;
  payment_method: string;
  receipt_number: string;
  recorded_by_name?: string;
}

export interface SystemUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  church_id: number | null;
  church_name: string | null;
  is_active: number;
  created_at: string;
}
