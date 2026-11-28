// Écriture d'un import CSV (ticket 034, F-07, EX-30 ; zone sensible : données de mineurs écrites).
// Une seule transaction : le contexte est relu avec `tx`, l'aperçu recalculé sur les lignes gardées
// en mémoire ; s'il a changé (restauration, Tout effacer, groupe archivé…), rien n'est écrit
// (STALE). Puis doublons ignorés inscrits, nouveaux membres, contacts, inscriptions ; un échec
// annule tout. Requêtes paramétrées (SEC-05) ; validations du domaine refaites (SEC-06) ; erreurs
// sans donnée (ABS-04). Règle de db.ts : dans la transaction, seulement `tx`.
import type { Db } from '@/data/db';
import { expectEnrollable, notEnded } from '@/data/enrollmentsRepo';
import { expectChanged } from '@/data/errors';
import type { CsvRow } from '@/domain/csvParse';
import { startInSeason } from '@/domain/formats';
import {
  type ExistingMember,
  type ImportGroup,
  type ImportMember,
  type ImportOptions,
  type ImportPreview,
  membersToWrite,
  previewImport,
} from '@/domain/memberImport';
import { validateContact, validateMember } from '@/domain/validation';

/** EX-05 : libellé obligatoire du contact importé, modifiable ensuite sur la fiche. */
export const IMPORTED_CONTACT_LABEL = 'Contact importé';

export type ImportContext = Omit<ImportOptions, 'today'> & {
  /** Dates de la saison active, pour le début des inscriptions (EX-04) ; null sans saison. */
  season: { startDate: string; endDate: string } | null;
};

export type ImportResult = {
  added: number;
  enrolled: number;
  duplicatesIgnored: number;
  invalid: number;
  duplicatesEnrolled: number;
  unarchived: number;
};
export type ImportOutcome = { ok: true; result: ImportResult } | { ok: false; reason: 'STALE' };

export type ImportRequest = {
  /** Lignes lues (en-tête en premier), gardées en mémoire depuis l'aperçu. */
  rows: CsvRow[];
  /** Aperçu montré à l'encadrant. */
  preview: ImportPreview;
  /** Lignes des doublons à importer quand même. */
  kept: readonly number[];
  /** Jour de la confirmation (CONV-11). */
  today: string;
};

type SeasonGroupRow = {
  season_id: number;
  start_date: string;
  end_date: string;
  id: number | null;
  name: string | null;
};

/**
 * EX-30 : membres (archivés compris) et groupes non archivés de la saison active, en deux
 * requêtes (NF-08). Appelé avec `db` pour l'aperçu, avec `tx` à la confirmation.
 */
export const importContext = async (db: Db): Promise<ImportContext> => {
  const members = await db.query<{
    id: number;
    last_name: string;
    first_name: string;
    birth_date: string | null;
    archived_at: string | null;
  }>('SELECT id, last_name, first_name, birth_date, archived_at FROM members ORDER BY id');
  const rows = await db.query<SeasonGroupRow>(
    `SELECT s.id AS season_id, s.start_date, s.end_date, g.id, g.name FROM seasons s
     LEFT JOIN groups g ON g.season_id = s.id AND g.archived_at IS NULL
     WHERE s.is_active = 1 ORDER BY g.id`,
  );
  const existingMembers = members.map(
    (m): ExistingMember => ({
      id: m.id,
      lastName: m.last_name,
      firstName: m.first_name,
      birthDate: m.birth_date,
      archivedAt: m.archived_at,
    }),
  );
  const groups: ImportGroup[] = [];
  for (const r of rows)
    if (r.id !== null && r.name !== null)
      groups.push({ id: r.id, seasonId: r.season_id, name: r.name, archivedAt: null });
  const [first] = rows;
  return {
    existingMembers,
    groups,
    activeSeasonId: first?.season_id ?? null,
    season: first ? { startDate: first.start_date, endDate: first.end_date } : null,
  };
};

/** Doublons de l'appli laissés sur « Ignorer » et au groupe trouvé : membre → groupes distincts. */
const ignoredEnrollments = (preview: ImportPreview, kept: readonly number[]) => {
  const byMember = new Map<number, { archived: boolean; groups: Set<number> }>();
  for (const d of preview.duplicates) {
    if (d.source !== 'app' || kept.includes(d.line) || d.member.groupId === null) continue;
    const entry = byMember.get(d.memberId) ?? { archived: d.archived, groups: new Set<number>() };
    entry.groups.add(d.member.groupId);
    byMember.set(d.memberId, entry);
  }
  return byMember;
};

/**
 * EX-04 : inscrit le doublon aux groupes où il n'a pas d'inscription pas finie (règle de `enroll`) ;
 * désarchivé d'abord, seulement s'il est inscrit quelque part (décision du porteur du 2026-11-28).
 */
const enrollDuplicate = async (
  tx: Db,
  memberId: number,
  { archived, groups }: { archived: boolean; groups: Set<number> },
  startDate: string,
) => {
  const missing: number[] = [];
  for (const groupId of groups) {
    const [taken] = await tx.query<{ id: number }>(
      `SELECT id FROM enrollments e WHERE e.member_id = ?1 AND e.group_id = ?2 AND ${notEnded(3)}`,
      [memberId, groupId, startDate],
    );
    if (!taken) missing.push(groupId);
  }
  if (missing.length === 0) return false;
  if (archived)
    expectChanged(
      await tx.execute('UPDATE members SET archived_at = NULL WHERE id = ?', [memberId]),
    );
  for (const groupId of missing) {
    await expectEnrollable(tx, groupId, memberId, startDate);
    await tx.execute('INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)', [
      memberId,
      groupId,
      startDate,
    ]);
  }
  return true;
};

/** Nouveau membre, son contact (position 0) et son inscription ; rend vrai s'il est inscrit. */
const addMember = async (tx: Db, member: ImportMember, today: string, startDate: string) => {
  const m = validateMember(member, today);
  const { lastInsertRowId: id } = await tx.execute(
    'INSERT INTO members (first_name, last_name, birth_date) VALUES (?, ?, ?)',
    [m.firstName, m.lastName, m.birthDate],
  );
  if (member.phone !== null) {
    const c = validateContact({ label: IMPORTED_CONTACT_LABEL, phone: member.phone });
    await tx.execute(
      'INSERT INTO emergency_contacts (member_id, label, phone, position) VALUES (?, ?, ?, 0)',
      [id, c.label, c.phone],
    );
  }
  if (member.groupId === null) return false;
  await expectEnrollable(tx, member.groupId, id, startDate);
  await tx.execute('INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)', [
    id,
    member.groupId,
    startDate,
  ]);
  return true;
};

/**
 * EX-30 : écrit l'import confirmé, d'un bloc. Rien à écrire : ni transaction. Aperçu recalculé
 * différent de celui montré (classement, membre ou groupe trouvé, doublon) : STALE, rien d'écrit.
 */
export const importMembers = async (db: Db, request: ImportRequest): Promise<ImportOutcome> => {
  const { rows, preview, kept, today } = request;
  const members = membersToWrite(preview, kept);
  const duplicates = ignoredEnrollments(preview, kept);
  const result: ImportResult = {
    added: members.length,
    enrolled: 0,
    duplicatesIgnored: preview.duplicates.filter((d) => !kept.includes(d.line)).length,
    invalid: preview.counts.invalid,
    duplicatesEnrolled: 0,
    unarchived: 0,
  };
  if (members.length === 0 && duplicates.size === 0) return { ok: true, result };
  return db.transaction(async (tx): Promise<ImportOutcome> => {
    const context = await importContext(tx);
    const fresh = previewImport(rows, { ...context, today });
    // Mêmes lignes et même code : un aperçu identique se sérialise à l'identique.
    if (!fresh.ok || JSON.stringify(fresh.preview) !== JSON.stringify(preview))
      return { ok: false, reason: 'STALE' };
    const startDate = startInSeason(today, context.season);
    // Doublons d'abord : un échec plus loin annule aussi leur désarchivage.
    for (const [memberId, entry] of duplicates) {
      if (!(await enrollDuplicate(tx, memberId, entry, startDate))) continue;
      result.duplicatesEnrolled += 1;
      if (entry.archived) result.unarchived += 1;
    }
    for (const member of members)
      if (await addMember(tx, member, today, startDate)) result.enrolled += 1;
    return { ok: true, result };
  });
};
