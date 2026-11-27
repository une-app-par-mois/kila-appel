// Tout effacer (EX-23, SEC-11, ABS-05) : vide la base et les réglages, garde le schéma et sa version.
import type { Db } from '@/data/db';
import { log } from '@/data/log';

/**
 * Les 16 tables de la migration 1, des tables filles aux tables mères : chaque suppression respecte
 * les clés étrangères. Requêtes fixes, jamais un nom lu dans la base. Une table ajoutée par une
 * migration doit venir ici : un test compare cette liste aux tables du schéma.
 */
export const ERASE_STATEMENTS = [
  'DELETE FROM roll_call_draft_statuses',
  'DELETE FROM roll_call_draft_groups',
  'DELETE FROM roll_call_drafts',
  'DELETE FROM attendances',
  'DELETE FROM session_groups',
  'DELETE FROM sessions',
  'DELETE FROM slot_dates',
  'DELETE FROM slot_groups',
  'DELETE FROM slots',
  'DELETE FROM alert_acks',
  'DELETE FROM enrollments',
  'DELETE FROM emergency_contacts',
  'DELETE FROM groups',
  'DELETE FROM members',
  'DELETE FROM seasons',
  'DELETE FROM settings',
] as const;

/**
 * Une seule transaction : tout est effacé, ou rien. Pas de VACUUM : `secure_delete` (ouverture de
 * la base, ticket 007d) écrit des zéros sur les valeurs supprimées.
 */
export const eraseAll = async (db: Db): Promise<void> => {
  await db.transaction(async (tx) => {
    for (const statement of ERASE_STATEMENTS) await tx.execute(statement);
  });
  log('ERASE_ALL_DONE');
};
