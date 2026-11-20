import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'distrito_sabana.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function toPlain<T = Record<string, unknown>>(row: unknown): T {
  if (!row || typeof row !== 'object') return row as T;
  return { ...(row as Record<string, unknown>) } as T;
}

export function toPlainList<T = Record<string, unknown>>(rows: unknown[]): T[] {
  return rows.map((r) => toPlain<T>(r));
}

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS districts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organization TEXT NOT NULL DEFAULT 'Iglesia Evangélica Interamericana de Colombia (IGLEICO)',
      personeria TEXT DEFAULT 'Personería Jurídica Especial 1134 del 2 de junio de 1998',
      region TEXT DEFAULT 'Región Sabana / Caribe Colombiano',
      minister_name TEXT DEFAULT '',
      substitute_minister_name TEXT DEFAULT '',
      secretary_name TEXT DEFAULT '',
      treasurer_name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      coordinator_name TEXT DEFAULT '',
      description TEXT DEFAULT '',
      FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS churches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district_id INTEGER NOT NULL DEFAULT 1,
      zone_id INTEGER,
      zone_name TEXT DEFAULT '',
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      stratum TEXT DEFAULT '',
      neighborhood TEXT DEFAULT '',
      municipality TEXT DEFAULT '',
      department TEXT DEFAULT 'Sucre',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      categorization TEXT NOT NULL DEFAULT 'CONSTITUIDA',
      foundation_month TEXT DEFAULT '',
      foundation_year TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,

      -- Local y Propiedades
      premises_type TEXT DEFAULT 'PROPIO',
      premises_other TEXT DEFAULT '',
      property_owner_type TEXT DEFAULT 'IGLEICO',
      property_owner_name TEXT DEFAULT '',
      rent_amount REAL DEFAULT 0,
      rent_start_date TEXT DEFAULT '',
      rent_end_date TEXT DEFAULT '',
      has_pastoral_house INTEGER DEFAULT 0,
      pastoral_house_rent REAL DEFAULT 0,
      ownership_doc_type TEXT DEFAULT 'ESCRITURA',
      pays_property_tax INTEGER DEFAULT 0,
      property_tax_up_to_date TEXT DEFAULT 'NO_APLICA',
      other_properties_json TEXT DEFAULT '{}',
      has_leased_property INTEGER DEFAULT 0,
      leased_property_income REAL DEFAULT 0,
      vehicles_json TEXT DEFAULT '{}',

      -- Información Financiera (Ficha Oficial)
      avg_monthly_income REAL DEFAULT 0,
      has_bank_account INTEGER DEFAULT 0,
      bank_nit TEXT DEFAULT '',
      bank_name TEXT DEFAULT '',
      bank_account_type TEXT DEFAULT '',
      has_accounts_payable INTEGER DEFAULT 0,
      has_hired_staff INTEGER DEFAULT 0,
      hired_staff_json TEXT DEFAULT '[]',

      -- Ministerios y Liderazgo
      has_copastor INTEGER DEFAULT 0,
      copastor_name TEXT DEFAULT '',
      copastor_phone TEXT DEFAULT '',
      copastor_email TEXT DEFAULT '',
      copastor_remuneration REAL DEFAULT 0,
      copastor_no_pay INTEGER DEFAULT 1,
      has_local_council INTEGER DEFAULT 1,
      local_council_count INTEGER DEFAULT 0,
      treasurer_name TEXT DEFAULT '',
      treasurer_phone TEXT DEFAULT '',
      treasurer_email TEXT DEFAULT '',
      treasurer_academic TEXT DEFAULT '',
      secretary_name TEXT DEFAULT '',
      secretary_phone TEXT DEFAULT '',
      secretary_email TEXT DEFAULT '',
      secretary_academic TEXT DEFAULT '',
      has_ucei INTEGER DEFAULT 0,
      has_ujei INTEGER DEFAULT 0,
      has_udei INTEGER DEFAULT 0,
      has_unei INTEGER DEFAULT 0,
      ministry_missions INTEGER DEFAULT 0,
      ministry_discipleship INTEGER DEFAULT 0,
      ministry_intercession INTEGER DEFAULT 0,
      ministry_evangelism INTEGER DEFAULT 0,
      ministry_worship INTEGER DEFAULT 0,
      ministry_other TEXT DEFAULT '',
      discipleship_program TEXT DEFAULT '',
      has_preaching_fields INTEGER DEFAULT 0,
      preaching_fields_count INTEGER DEFAULT 0,
      has_ordained_ministers INTEGER DEFAULT 0,
      ordained_ministers_count INTEGER DEFAULT 0,
      has_retired_pastors INTEGER DEFAULT 0,
      retired_pastors_count INTEGER DEFAULT 0,
      has_professionals INTEGER DEFAULT 0,
      professionals_json TEXT DEFAULT '[]',
      skills_json TEXT DEFAULT '{}',
      sunday_school_teachers INTEGER DEFAULT 0,
      has_age_divided_classes INTEGER DEFAULT 0,
      age_divided_classes_info TEXT DEFAULT '',

      -- Otra Información y Censo
      institutions_json TEXT DEFAULT '{}',
      social_json TEXT DEFAULT '{}',
      equipment_json TEXT DEFAULT '{}',
      has_theology_teachers INTEGER DEFAULT 0,
      use_auto_census INTEGER DEFAULT 1,
      manual_census_json TEXT DEFAULT '{}',

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE,
      FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS pastors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district_id INTEGER NOT NULL DEFAULT 1,
      church_id INTEGER,
      full_name TEXT NOT NULL,
      birth_date TEXT DEFAULT '',
      birth_place TEXT DEFAULT '',
      id_number TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      ministerial_dignity TEXT NOT NULL DEFAULT 'PASTOR',
      ministry_start_month TEXT DEFAULT '',
      ministry_start_year TEXT DEFAULT '',
      ministry_time_text TEXT DEFAULT '',
      past_churches TEXT DEFAULT '',
      national_roles_json TEXT DEFAULT '[]',
      district_roles_json TEXT DEFAULT '[]',
      has_contract INTEGER DEFAULT 0,
      contract_type TEXT DEFAULT 'NINGUNO',
      pays_social_security INTEGER DEFAULT 0,
      contract_entity TEXT DEFAULT '',
      monthly_remuneration REAL DEFAULT 0,
      has_real_estate INTEGER DEFAULT 0,
      real_estate_details TEXT DEFAULT '',
      academic_level TEXT DEFAULT 'BACHILLER',
      formal_theology_studies TEXT DEFAULT '',
      informal_theology_studies TEXT DEFAULT '',

      -- Información Familiar
      spouse_name TEXT DEFAULT '',
      spouse_birth_date TEXT DEFAULT '',
      spouse_birth_place TEXT DEFAULT '',
      spouse_id_number TEXT DEFAULT '',
      spouse_phone TEXT DEFAULT '',
      spouse_email TEXT DEFAULT '',
      spouse_dignity TEXT DEFAULT 'NINGUNA',
      spouse_receives_aid INTEGER DEFAULT 0,
      spouse_monthly_aid REAL DEFAULT 0,
      spouse_national_roles_json TEXT DEFAULT '[]',
      spouse_district_roles_json TEXT DEFAULT '[]',
      spouse_academic_level TEXT DEFAULT '',
      spouse_formal_theology TEXT DEFAULT '',
      spouse_informal_theology TEXT DEFAULT '',
      children_json TEXT DEFAULT '[]',
      has_family_disability INTEGER DEFAULT 0,
      disability_member TEXT DEFAULT 'NINGUNO',
      disability_details TEXT DEFAULT '',

      -- Autorización Ley 1581 de 2012
      data_auth_accepted INTEGER DEFAULT 1,
      data_auth_date TEXT DEFAULT '',
      signature_name TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ACTIVO',

      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE,
      FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'PASTOR_LOCAL',
      church_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      church_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      id_number TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      birth_date TEXT DEFAULT '',
      gender TEXT DEFAULT 'M',
      address TEXT DEFAULT '',
      baptism_status TEXT NOT NULL DEFAULT 'BAUTIZADO',
      baptism_date TEXT DEFAULT '',
      organism TEXT NOT NULL DEFAULT 'NINGUNO',
      church_role TEXT DEFAULT 'Miembro',
      profession TEXT DEFAULT '',
      comm_skills TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ACTIVO',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district_id INTEGER NOT NULL DEFAULT 1,
      church_id INTEGER,
      scope TEXT NOT NULL DEFAULT 'LOCAL',
      name TEXT NOT NULL,
      activity_type TEXT NOT NULL DEFAULT 'VENTA_RECAUDO',
      organism TEXT NOT NULL DEFAULT 'GENERAL',
      event_date TEXT NOT NULL,
      location TEXT DEFAULT '',
      responsible_name TEXT DEFAULT '',
      unit_label TEXT DEFAULT 'Unidad',
      unit_price REAL DEFAULT 0,
      goal_amount REAL DEFAULT 0,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ACTIVA',
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE,
      FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS activity_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      church_id INTEGER,
      member_id INTEGER,
      person_name TEXT NOT NULL,
      person_phone TEXT DEFAULT '',
      is_member INTEGER NOT NULL DEFAULT 1,
      item_detail TEXT DEFAULT '',
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      assigned_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      attendance_status TEXT NOT NULL DEFAULT 'CONFIRMADO',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS financial_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      district_id INTEGER NOT NULL DEFAULT 1,
      church_id INTEGER,
      scope TEXT NOT NULL DEFAULT 'LOCAL',
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      tx_date TEXT NOT NULL,
      description TEXT DEFAULT '',
      member_id INTEGER,
      person_name TEXT DEFAULT '',
      activity_id INTEGER,
      payment_method TEXT NOT NULL DEFAULT 'EFECTIVO',
      receipt_number TEXT DEFAULT '',
      recorded_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE,
      FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL,
      FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS activity_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      activity_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'EFECTIVO',
      notes TEXT DEFAULT '',
      finance_tx_id INTEGER,
      recorded_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (participant_id) REFERENCES activity_participants(id) ON DELETE CASCADE,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (finance_tx_id) REFERENCES financial_transactions(id) ON DELETE SET NULL,
      FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS debts_loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      church_id INTEGER NOT NULL,
      creditor TEXT NOT NULL,
      initial_amount REAL NOT NULL,
      remaining_amount REAL NOT NULL,
      start_date TEXT DEFAULT '',
      term_description TEXT DEFAULT '',
      seniority_text TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ACTIVO',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_members_church ON members(church_id);
    CREATE INDEX IF NOT EXISTS idx_activities_church ON activities(church_id);
    CREATE INDEX IF NOT EXISTS idx_participants_activity ON activity_participants(activity_id);
    CREATE INDEX IF NOT EXISTS idx_finance_church_date ON financial_transactions(church_id, tx_date);
    CREATE INDEX IF NOT EXISTS idx_finance_type ON financial_transactions(type);
  `);
}
