// Historique pour les écrans (EX-16 à EX-18, CONV-10) : lignes filtrées, groupes du filtre,
// détail d'une séance, correction et suppression. Même contrat que les autres hooks de données.
import { useCallback, useMemo } from 'react';
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import { groupsRepo, type HistoryGroup } from '@/data/groupsRepo';
import { seasonsRepo } from '@/data/seasonsRepo';
import {
  type Correction,
  type HistorySession,
  type SessionDetail,
  sessionsRepo,
} from '@/data/sessionsRepo';
import { slotsRepo } from '@/data/slotsRepo';
import { type HistoryPeriod, newestFirst, periodStart } from '@/domain/history';
import { type LocalNow, slotDates, type WeeklySlot } from '@/domain/occurrences';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';
import { loadMissingRollCalls, type MissingRollCall } from '@/hooks/useRollCall';

/** Ligne de l'Historique : appel manquant (EX-17) ou séance enregistrée (EX-16). */
export type HistoryRow =
  | ({ kind: 'missing' } & MissingRollCall)
  | ({ kind: 'session' } & HistorySession);

export type HistoryChoice = { groupId: number | null; period: HistoryPeriod };

export type History = {
  /** Filtre de cette lecture : seules ses lignes s'affichent (jamais celles d'un autre filtre). */
  key: string;
  rows: HistoryRow[];
  /** Groupes proposés pour chaque période : un groupe absent de la nouvelle période est retiré aussitôt. */
  groups: Record<HistoryPeriod, HistoryGroup[]>;
  /** Au moins un appel enregistré ou manquant, sans filtre (état vide, P1). */
  anything: boolean;
};

const keyOf = ({ groupId, period }: HistoryChoice) => `${groupId ?? ''}|${period}`;

/**
 * EX-16, EX-17 (décisions du 2026-11-27) : « 30 derniers jours » sur toutes les saisons (changement
 * de saison, aucune saison active), « Saison active » sur l'active, « Toutes les saisons » sur
 * toutes. Appels manquants mêlés par date, soumis aux filtres, de la saison active seulement,
 * séance de « Maintenant » comprise.
 */
export const useHistory = (now: LocalNow, choice: HistoryChoice) => {
  const db = useDatabase();
  const { date, time } = now;
  const { groupId, period } = choice;
  const load = useMemo(
    () =>
      db
        ? async (): Promise<History> => {
            const repo = sessionsRepo(db, date);
            const groups = groupsRepo(db);
            const season = await seasonsRepo(db).getActive();
            const last30 = periodStart(date);
            const missing = await loadMissingRollCalls(db, { date, time }, { keepShown: true });
            const recentGroups = [
              ...new Set(missing.filter((m) => m.date >= last30).map((m) => m.groupId)),
            ];
            const seasonId = period === 'season' ? (season?.id ?? null) : null;
            const from = period === 'last30Days' ? last30 : null;
            const sessions =
              period === 'season' && !season ? [] : await repo.history({ seasonId, groupId, from });
            const shownMissing = missing.filter(
              (m) =>
                (groupId === null || m.groupId === groupId) && (from === null || m.date >= from),
            );
            return {
              key: keyOf({ groupId, period }),
              rows: newestFirst<HistoryRow>([
                ...shownMissing.map((m) => ({ kind: 'missing' as const, ...m })),
                ...sessions.map((x) => ({ kind: 'session' as const, ...x })),
              ]),
              groups: {
                last30Days: await groups.listForHistory({
                  seasonId: null,
                  from: last30,
                  include: recentGroups,
                }),
                season: season
                  ? await groups.listForHistory({ seasonId: season.id, from: null })
                  : [],
                allSeasons: await groups.listForHistory({ seasonId: null, from: null }),
              },
              anything: missing.length > 0 || (await repo.hasRecorded()),
            };
          }
        : null,
    [db, date, time, groupId, period],
  );
  // L'heure avance : la liste reste affichée pendant la relecture. Un autre filtre, non : ses
  // lignes seules s'affichent, même si sa lecture échoue (`rows` nul).
  const { value, loaded, loadFailed } = useLoaded(load, 'HISTORY_LOAD_FAILED', {}, true);
  const rows = value?.key === keyOf(choice) ? value.rows : null;
  return { history: value, rows, loaded, loadFailed };
};

/**
 * EX-18 : la date redeviendrait un appel manquant si la séance était supprimée : séance d'un
 * créneau qui existe encore avec un groupe actif, saison active, date du créneau aujourd'hui ou
 * avant. Un créneau du jour pas encore fini compte : la date reviendra à sa fin (revue du 013).
 */
const wouldReappear = async (db: Db, s: SessionDetail, today: string): Promise<boolean> => {
  if (s.slotId === null) return false;
  const season = await seasonsRepo(db).getActive();
  if (season?.id !== s.seasonId) return false;
  const slot = await slotsRepo(db).get(s.slotId);
  const active = new Set((await groupsRepo(db).listBySeason(season.id)).map((g) => g.id));
  if (!slot?.groups.some((g) => active.has(g.id))) return false;
  return s.date <= today && slotDates(slot as WeeklySlot, season, s.date, s.date)[0] === s.date;
};

/** EX-18 : détail d'une séance enregistrée ; `session` nul si elle n'existe pas (ou plus). */
export const useSessionDetail = (id: number, now: LocalNow) => {
  const db = useDatabase();
  const { date } = now;
  const load = useMemo(
    () =>
      db
        ? async () => {
            const session = await sessionsRepo(db, date).get(id);
            if (!session) return null;
            return { session, reappears: await wouldReappear(db, session, date) };
          }
        : null,
    [db, id, date],
  );
  const { value, loaded, loadFailed } = useLoaded(load, 'SESSION_LOAD_FAILED', { id }, true);
  const repo = useCallback(() => {
    if (!db) throw new DataError('DB_NOT_READY');
    return sessionsRepo(db, date);
  }, [db, date]);
  const correct = useCallback(
    async (correction: Correction) => {
      await repo().correct(id, correction);
      notifyDataChanged();
    },
    [repo, id],
  );
  const remove = useCallback(async () => {
    await repo().remove(id);
    notifyDataChanged();
  }, [repo, id]);
  return {
    session: value?.session ?? null,
    reappears: value?.reappears ?? false,
    loaded,
    loadFailed,
    correct,
    remove,
  };
};
