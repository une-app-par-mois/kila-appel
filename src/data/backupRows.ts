// Règles de l'appli rejouées sur chaque ligne d'une sauvegarde (EX-20, SEC-10 ; « toute entrée est
// validée », ABS-03). Les contraintes de la base ne suffisent pas : un fichier peut les contourner
// (ignore_check_constraints), et certaines règles n'y sont pas (téléphone, commentaire, réglages).
// Seules passent les lignes que l'appli aurait écrites : sortie des validateurs égale à la valeur.
// Utilisé sur la copie ouverte seule (schéma `main`) et sur la copie attachée, dans la transaction
// de restauration (schéma `kila_backup`). Les tables du brouillon y sont lues pour être validées,
// jamais pour une statistique (EX-14, liste de staticChecks).
import type { Db, SqlValue } from '@/data/db';
import { isValidSetting } from '@/data/settingsRepo';
import { isIsoDate } from '@/domain/formats';
import {
  isAttendanceStatus,
  isId,
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
  ensure(isIsoDate(match?.[1] ?? '') && isTime(match?.[2] ?? ''));
};
/** Valeur que l'appli écrirait : la sortie du validateur, égale à la valeur stockée. */
const same = (written: string | null, stored: Cell) => ensure(written === stored);
/** Nom écrit par l'appli : nettoyé, non vide (validateName). */
const name = (value: Cell) => same(validateName(text(value)), value);
/** Lieu ou nom de créneau (EX-07) : texte nettoyé non vide, ou NULL. */
const optionalLabel = (value: Cell) =>
  ensure(value === null || (text(value).trim() === value && value !== ''));
/** Commentaire (EX-13) : nettoyé et borné ; vide ou fait d'espaces, l'appli écrit NULL. */
const comment = (value: Cell) => same(validateComment(optionalText(value)), value);
const status = (value: Cell) => ensure(isAttendanceStatus(text(value)));

// Colonnes `id` et `*_id` qui admettent NULL : séance et brouillon sans créneau (EX-39).
const NULLABLE_IDS = ['slot_id'];
/** isId sur chaque colonne `id` et `*_id` lue. */
const ids = (row: Row) => {
  for (const [column, value] of Object.entries(row)) {
    if (column !== 'id' && !column.endsWith('_id')) continue;
    if (value === null) ensure(NULLABLE_IDS.includes(column));
    else ensure(typeof value === 'number' && isId(value));
  }
};
const none = () => undefined;

type Rule = { table: string; columns: string; check: (row: Row, today: string) => void };

/** Une règle par table : les colonnes lues (identifiants compris) et ce que chaque ligne respecte. */
const RULES: Rule[] = [
  {
    table: 'seasons',
    columns: 'id, name, start_date, end_date',
    check: (r) => {
      const season = validateSeason({
        name: text(r.name),
        startDate: text(r.start_date),
        endDate: text(r.end_date),
      });
      same(season.name, r.name);
    },
  },
  {
    // EX-03 : date de naissance bornée au jour de la vérification, passé par l'appelant.
    table: 'members',
    columns: 'id, last_name, first_name, birth_date, archived_at',
    check: (r, today) => {
      const member = validateMember(
        {
          lastName: text(r.last_name),
          firstName: text(r.first_name),
          birthDate: optionalText(r.birth_date),
        },
        today,
      );
      same(member.lastName, r.last_name);
      same(member.firstName, r.first_name);
      optionalDate(r.archived_at);
    },
  },
  {
    // Ticket 008 : nom nettoyé, téléphone normalisé sur 10 chiffres.
    table: 'emergency_contacts',
    columns: 'id, member_id, label, phone',
    check: (r) => {
      const contact = validateContact({ label: optionalText(r.label) ?? '', phone: text(r.phone) });
      same(contact.label, r.label);
      same(contact.phone, r.phone);
    },
  },
  {
    table: 'groups',
    columns: 'id, season_id, name, archived_at',
    check: (r) => {
      name(r.name);
      optionalDate(r.archived_at);
    },
  },
  {
    table: 'enrollments',
    columns: 'id, member_id, group_id, start_date, end_date',
    check: (r) => {
      date(r.start_date);
      optionalDate(r.end_date);
    },
  },
  {
    // EX-08 : le déclencheur de schedule_from ne protège que les modifications (ticket 005).
    table: 'slots',
    columns: 'id, season_id, start_time, place, name, schedule_from',
    check: (r) => {
      time(r.start_time);
      optionalLabel(r.place);
      optionalLabel(r.name);
      date(r.schedule_from);
    },
  },
  { table: 'slot_dates', columns: 'slot_id, date', check: (r) => date(r.date) },
  { table: 'slot_groups', columns: 'slot_id, group_id', check: none },
  {
    table: 'sessions',
    columns: 'id, season_id, slot_id, date, start_time, comment',
    check: (r) => {
      date(r.date);
      time(r.start_time);
      comment(r.comment);
    },
  },
  { table: 'session_groups', columns: 'session_id, group_id', check: none },
  {
    table: 'attendances',
    columns: 'session_id, member_id, status',
    check: (r) => status(r.status),
  },
  {
    table: 'roll_call_drafts',
    columns: 'id, season_id, slot_id, date, comment, started_at, updated_at',
    check: (r) => {
      date(r.date);
      comment(r.comment);
      time(r.started_at);
      stamp(r.updated_at);
    },
  },
  { table: 'roll_call_draft_groups', columns: 'draft_id, group_id', check: none },
  {
    table: 'roll_call_draft_statuses',
    columns: 'draft_id, member_id, status',
    check: (r) => status(r.status),
  },
  { table: 'alert_acks', columns: 'member_id, acked_at', check: (r) => date(r.acked_at) },
  {
    // ADR-002, ABS-08 : seulement les réglages connus, avec une valeur valide.
    table: 'settings',
    columns: 'key, value',
    check: (r) => ensure(isValidSetting(text(r.key), text(r.value))),
  },
];

/**
 * Vérifie chaque ligne de la base `schema` (`main` : la copie ouverte seule ; BACKUP_ALIAS : la
 * copie attachée). `today` (AAAA-MM-JJ) : jour de la vérification. Une ligne refusée donne
 * INVALID_DATA, sans dire laquelle (ABS-04). Ce module n'exporte que BACKUP_ALIAS et checkRows,
 * qui ne renvoie que INVALID_DATA ou null (EX-14 : aucune donnée du brouillon n'en sort).
 */
export const checkRows = async (
  db: Db,
  today: string,
  schema: 'main' | typeof BACKUP_ALIAS = 'main',
): Promise<'INVALID_DATA' | null> => {
  for (const rule of RULES) {
    const rows = await db.query<Row>(`SELECT ${rule.columns} FROM ${schema}.${rule.table}`);
    try {
      for (const row of rows) {
        ids(row);
        rule.check(row, today);
      }
    } catch {
      return 'INVALID_DATA';
    }
  }
  return null;
};
