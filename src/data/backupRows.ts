// Règles de l'appli rejouées sur chaque ligne d'une sauvegarde (EX-20, SEC-10 ; « toute entrée est
// validée », ABS-03). Les contraintes de la base ne suffisent pas : un fichier peut les contourner
// (ignore_check_constraints), et certaines règles n'y sont pas (téléphone, commentaire, réglages).
// Utilisé sur la copie ouverte seule (schéma `main`) et sur la copie attachée, dans la transaction
// de restauration (schéma `kila_backup`). Les tables du brouillon y sont lues pour être validées,
// jamais pour une statistique (EX-14, liste de staticChecks).
import type { Db, SqlValue } from '@/data/db';
import { isValidSetting } from '@/data/settingsRepo';
import { isIsoDate } from '@/domain/formats';
import {
  isAttendanceStatus,
  isTime,
  validateComment,
  validateContact,
  validateMember,
  validateName,
  validateSeason,
} from '@/domain/validation';

/** Nom de la copie attachée à la connexion de l'appli (export et restauration). */
export const BACKUP_ALIAS = 'kila_backup';

type Row = Record<string, SqlValue>;
// Une colonne absente (undefined) est refusée comme une valeur du mauvais type.
type Cell = SqlValue | undefined;

class InvalidRow extends Error {}

const text = (value: Cell): string => {
  if (typeof value !== 'string') throw new InvalidRow();
  return value;
};
const optionalText = (value: Cell): string | null => (value === null ? null : text(value));
const ensure = (ok: boolean) => {
  if (!ok) throw new InvalidRow();
};
const date = (value: Cell) => ensure(isIsoDate(text(value)));
const optionalDate = (value: Cell) => ensure(value === null || isIsoDate(text(value)));
const time = (value: Cell) => ensure(isTime(text(value)));
// L'appel en cours écrit `AAAA-MM-JJTHH:MM` ; les secondes sont tolérées.
const STAMP = /^(.{10})T(\d\d:\d\d)(:[0-5]\d)?$/;
const stamp = (value: Cell) => {
  const match = STAMP.exec(text(value));
  ensure(match !== null && isIsoDate(match[1] ?? '') && isTime(match[2] ?? ''));
};
// La date de naissance n'est bornée que par RM-04 : la sauvegarde peut venir d'un autre jour.
const LATEST_DAY = '2100-12-31';

/** Une règle par table : les colonnes lues et ce que chaque ligne doit respecter. */
const RULES: { table: string; columns: string; check: (row: Row) => void }[] = [
  {
    table: 'seasons',
    columns: 'name, start_date, end_date',
    check: (r) =>
      validateSeason({
        name: text(r.name),
        startDate: text(r.start_date),
        endDate: text(r.end_date),
      }),
  },
  {
    table: 'members',
    columns: 'last_name, first_name, birth_date, archived_at',
    check: (r) => {
      validateMember(
        {
          lastName: text(r.last_name),
          firstName: text(r.first_name),
          birthDate: optionalText(r.birth_date),
        },
        LATEST_DAY,
      );
      optionalDate(r.archived_at);
    },
  },
  {
    table: 'emergency_contacts',
    columns: 'label, phone',
    check: (r) => validateContact({ label: optionalText(r.label) ?? '', phone: text(r.phone) }),
  },
  {
    table: 'groups',
    columns: 'name, archived_at',
    check: (r) => {
      validateName(text(r.name));
      optionalDate(r.archived_at);
    },
  },
  {
    table: 'enrollments',
    columns: 'start_date, end_date',
    check: (r) => {
      date(r.start_date);
      optionalDate(r.end_date);
    },
  },
  {
    // EX-08 : le déclencheur de schedule_from ne protège que les modifications (ticket 005).
    table: 'slots',
    columns: 'start_time, schedule_from',
    check: (r) => {
      time(r.start_time);
      date(r.schedule_from);
    },
  },
  { table: 'slot_dates', columns: 'date', check: (r) => date(r.date) },
  {
    table: 'sessions',
    columns: 'date, start_time, comment',
    check: (r) => {
      date(r.date);
      time(r.start_time);
      validateComment(optionalText(r.comment));
    },
  },
  {
    table: 'attendances',
    columns: 'status',
    check: (r) => ensure(isAttendanceStatus(text(r.status))),
  },
  {
    table: 'roll_call_drafts',
    columns: 'date, comment, started_at, updated_at',
    check: (r) => {
      date(r.date);
      validateComment(optionalText(r.comment));
      time(r.started_at);
      stamp(r.updated_at);
    },
  },
  {
    table: 'roll_call_draft_statuses',
    columns: 'status',
    check: (r) => ensure(isAttendanceStatus(text(r.status))),
  },
  { table: 'alert_acks', columns: 'acked_at', check: (r) => date(r.acked_at) },
  {
    // ADR-002, ABS-08 : seulement les réglages connus, avec une valeur valide.
    table: 'settings',
    columns: 'key, value',
    check: (r) => ensure(isValidSetting(text(r.key), text(r.value))),
  },
];

/**
 * Vérifie chaque ligne de la base `schema` (`main` : la copie ouverte seule ; BACKUP_ALIAS : la
 * copie attachée). Une ligne refusée donne INVALID_DATA, sans dire laquelle (ABS-04).
 */
export const checkRows = async (
  db: Db,
  schema: 'main' | typeof BACKUP_ALIAS = 'main',
): Promise<'INVALID_DATA' | null> => {
  for (const rule of RULES) {
    const rows = await db.query<Row>(`SELECT ${rule.columns} FROM ${schema}.${rule.table}`);
    try {
      for (const row of rows) rule.check(row);
    } catch {
      return 'INVALID_DATA';
    }
  }
  return null;
};
