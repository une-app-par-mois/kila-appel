// Migrations du schéma (docs/ARCHITECTURE.md §4.2, zone sensible).
// Numérotées, appliquées dans une transaction, version dans PRAGMA user_version.
// ADR-003 : la migration 1 porte tout le schéma de la v1 ; jamais réécrite une fois publiée.
import type { Db } from '@/data/db';

export type Migration = { version: number; statements: string[] };

// RM-04 : date AAAA-MM-JJ réelle (date() normalise un 31 avril : l'égalité le refuse), 1900 à 2100.
const isoDate = (col: string) =>
  `(${col} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(${col}) IS ${col} ` +
  `AND ${col} BETWEEN '1900-01-01' AND '2100-12-31')`;
const optionalDate = (col: string) => `(${col} IS NULL OR ${isoDate(col)})`;
// RM-04 : heure HH:MM de 00:00 à 23:59.
const hhmm = (col: string) => `(${col} GLOB '[0-2][0-9]:[0-5][0-9]' AND ${col} <= '23:59')`;
const notBlank = (col: string) => `(length(trim(${col})) > 0)`;

const MIGRATION_1: string[] = [
  `CREATE TABLE seasons (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL CHECK ${notBlank('name')},
    start_date TEXT NOT NULL CHECK ${isoDate('start_date')},
    end_date TEXT NOT NULL CHECK ${isoDate('end_date')},
    is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
    CHECK (end_date >= start_date)
  ) STRICT`,
  // EX-01 : une seule saison active.
  'CREATE UNIQUE INDEX seasons_one_active ON seasons (is_active) WHERE is_active = 1',

  // ABS-03 : seuls nom et prénom sont obligatoires ; aucun autre champ personnel.
  `CREATE TABLE members (
    id INTEGER PRIMARY KEY,
    last_name TEXT NOT NULL CHECK ${notBlank('last_name')},
    first_name TEXT NOT NULL CHECK ${notBlank('first_name')},
    birth_date TEXT CHECK ${optionalDate('birth_date')},
    archived_at TEXT CHECK ${optionalDate('archived_at')}
  ) STRICT`,

  `CREATE TABLE emergency_contacts (
    id INTEGER PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    label TEXT,
    phone TEXT NOT NULL CHECK ${notBlank('phone')},
    position INTEGER NOT NULL DEFAULT 0
  ) STRICT`,
  'CREATE INDEX emergency_contacts_member ON emergency_contacts (member_id)',

  `CREATE TABLE groups (
    id INTEGER PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK ${notBlank('name')},
    archived_at TEXT CHECK ${optionalDate('archived_at')}
  ) STRICT`,
  'CREATE INDEX groups_season ON groups (season_id)',

  `CREATE TABLE enrollments (
    id INTEGER PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    start_date TEXT NOT NULL CHECK ${isoDate('start_date')},
    end_date TEXT CHECK ${optionalDate('end_date')},
    CHECK (end_date IS NULL OR end_date >= start_date)
  ) STRICT`,
  'CREATE INDEX enrollments_member ON enrollments (member_id)',
  'CREATE INDEX enrollments_group ON enrollments (group_id)',

  // weekday : 1 = lundi … 7 = dimanche ; NULL = créneau ponctuel (dates dans slot_dates, F-10).
  `CREATE TABLE slots (
    id INTEGER PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
    weekday INTEGER CHECK (weekday IS NULL OR weekday BETWEEN 1 AND 7),
    start_time TEXT NOT NULL CHECK ${hhmm('start_time')},
    duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 1 AND 1440),
    place TEXT,
    name TEXT,
    -- EX-08 : date d'effet de l'horaire ; aucun appel réclamé avant (décisions du 2026-11-26).
    schedule_from TEXT NOT NULL CHECK ${isoDate('schedule_from')}
  ) STRICT`,
  'CREATE INDEX slots_season ON slots (season_id)',
  // EX-07 : avancée quand le jour ou l'heure changent (ticket 009), jamais reculée : le passé
  // n'est pas recalculé avec le nouvel horaire. Pas de REPLACE INTO slots (ARCHITECTURE §4.2).
  `CREATE TRIGGER slots_schedule_from_forward BEFORE UPDATE OF schedule_from ON slots
   WHEN NEW.schedule_from < OLD.schedule_from
   BEGIN SELECT RAISE(ABORT, 'slots.schedule_from ne recule pas (EX-07)'); END`,

  `CREATE TABLE slot_dates (
    slot_id INTEGER NOT NULL REFERENCES slots (id) ON DELETE CASCADE,
    date TEXT NOT NULL CHECK ${isoDate('date')},
    PRIMARY KEY (slot_id, date)
  ) STRICT`,

  // F-11 : plusieurs groupes par créneau.
  `CREATE TABLE slot_groups (
    slot_id INTEGER NOT NULL REFERENCES slots (id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    PRIMARY KEY (slot_id, group_id)
  ) STRICT`,
  'CREATE INDEX slot_groups_group ON slot_groups (group_id)',

  // ADR-004 : une ligne n'existe qu'une fois l'appel enregistré, préparé, annulé ou non planifié.
  // EX-07 : supprimer le créneau garde la séance (slot_id vidé) ; EX-39 : slot_id NULL = sans créneau.
  `CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
    slot_id INTEGER REFERENCES slots (id) ON DELETE SET NULL,
    date TEXT NOT NULL CHECK ${isoDate('date')},
    start_time TEXT NOT NULL CHECK ${hhmm('start_time')},
    state TEXT NOT NULL CHECK (state IN ('recorded', 'prepared', 'cancelled', 'unscheduled')),
    comment TEXT
  ) STRICT`,
  // RM-05 : une seule séance par créneau et par date.
  'CREATE UNIQUE INDEX sessions_slot_date ON sessions (slot_id, date) WHERE slot_id IS NOT NULL',
  'CREATE INDEX sessions_season ON sessions (season_id)',
  'CREATE INDEX sessions_date ON sessions (date)',

  // Groupes figés au jour de la séance ; EX-02 : supprimer un groupe le retire, les présences restent.
  `CREATE TABLE session_groups (
    session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, group_id)
  ) STRICT`,
  'CREATE INDEX session_groups_group ON session_groups (group_id)',

  // SEC-11 : effacées avec le membre ou la séance.
  `CREATE TABLE attendances (
    session_id INTEGER NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    PRIMARY KEY (session_id, member_id)
  ) STRICT`,
  'CREATE INDEX attendances_member ON attendances (member_id)',

  // EX-14 : un seul brouillon à la fois (id = 1) ; effacé avec sa saison, même sans créneau (EX-39).
  `CREATE TABLE roll_call_drafts (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    season_id INTEGER NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
    slot_id INTEGER REFERENCES slots (id) ON DELETE CASCADE,
    date TEXT NOT NULL CHECK ${isoDate('date')},
    comment TEXT,
    updated_at TEXT NOT NULL
  ) STRICT`,
  // Groupes et statuts du brouillon en tables filles (décision du porteur du 2026-11-26) :
  // supprimer un membre ou un groupe les efface aussi (ABS-05, SEC-11).
  `CREATE TABLE roll_call_draft_groups (
    draft_id INTEGER NOT NULL REFERENCES roll_call_drafts (id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    PRIMARY KEY (draft_id, group_id)
  ) STRICT`,
  'CREATE INDEX roll_call_draft_groups_group ON roll_call_draft_groups (group_id)',
  `CREATE TABLE roll_call_draft_statuses (
    draft_id INTEGER NOT NULL REFERENCES roll_call_drafts (id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    PRIMARY KEY (draft_id, member_id)
  ) STRICT`,
  'CREATE INDEX roll_call_draft_statuses_member ON roll_call_draft_statuses (member_id)',

  // EX-26 : alerte traitée à ce niveau de série ; SEC-11 : effacée avec le membre.
  `CREATE TABLE alert_acks (
    member_id INTEGER NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    streak_length INTEGER NOT NULL CHECK (streak_length > 0),
    acked_at TEXT NOT NULL CHECK ${isoDate('acked_at')},
    PRIMARY KEY (member_id, streak_length)
  ) STRICT`,

  // ADR-002 : réglages dans la base, sauvegardés avec elle.
  `CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  ) STRICT`,
];

export const MIGRATIONS: Migration[] = [{ version: 1, statements: MIGRATION_1 }];

export const LATEST_VERSION = MIGRATIONS.length;

export const UNKNOWN_VERSION = 'Version de base inconnue (plus récente que l’appli)';
export const BAD_NUMBERING = 'Migrations mal numérotées';

const readVersion = async (db: Db): Promise<number> =>
  (await db.query<{ user_version: number }>('PRAGMA user_version'))[0]?.user_version ?? 0;

/** Applique les migrations manquantes, chacune dans sa transaction. Refuse une base plus récente. */
export const migrate = async (db: Db, migrations: Migration[] = MIGRATIONS): Promise<void> => {
  // Versions 1, 2, … n dans l'ordre : la dernière version est alors migrations.length.
  if (migrations.some((m, i) => m.version !== i + 1)) {
    throw new Error(BAD_NUMBERING);
  }
  const current = await readVersion(db);
  if (current > migrations.length) {
    // SEC-10 : une base d'une version future n'est jamais modifiée.
    throw new Error(UNKNOWN_VERSION);
  }
  for (const migration of migrations.filter((m) => m.version > current)) {
    await db.transaction(async (tx) => {
      for (const statement of migration.statements) {
        await tx.execute(statement);
      }
      // PRAGMA n'accepte pas de paramètre : la version est un entier du code, jamais une saisie.
      await tx.execute(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
    });
  }
};
