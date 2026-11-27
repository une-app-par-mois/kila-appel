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
import { toIsoDate } from '@/domain/formats';
import { type HistoryPeriod, newestFirst, periodStart } from '@/domain/history';
import { type LocalNow, missingRollCalls, type WeeklySlot } from '@/domain/occurrences';
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
  rows: HistoryRow[];
  /** Groupes proposés au filtre pour cette période. */
  groups: HistoryGroup[];
  /** Au moins un appel enregistré ou manquant, sans filtre (état vide, P1). */
  anything: boolean;
};

/**
 * EX-16, EX-17 (décisions du 2026-11-27) : « 30 derniers jours » et « Saison active » portent sur la
 * saison active ; « Toutes les saisons » sur toutes. Appels manquants mêlés par date, soumis aux
 * filtres, de la saison active seulement, séance de « Maintenant » comprise.
 */
export const useHistory = (now: LocalNow, { groupId, period }: HistoryChoice) => {
  const db = useDatabase();
  const { date, time } = now;
  const load = useMemo(
    () =>
      db
        ? async (): Promise<History> => {
            const repo = sessionsRepo(db, date);
            const season = await seasonsRepo(db).getActive();
            const allSeasons = period === 'allSeasons';
            const seasonId = allSeasons ? null : (season?.id ?? null);
            const from = period === 'last30Days' ? periodStart(date) : null;
            const inScope = allSeasons || seasonId !== null;
            const sessions = inScope ? await repo.history({ seasonId, groupId, from }) : [];
            const missing = await loadMissingRollCalls(db, { date, time }, { keepShown: true });
            const shownMissing = missing.filter(
              (m) =>
                (groupId === null || m.groupId === groupId) && (from === null || m.date >= from),
            );
            return {
              rows: newestFirst<HistoryRow>([
                ...shownMissing.map((m) => ({ kind: 'missing' as const, ...m })),
                ...sessions.map((x) => ({ kind: 'session' as const, ...x })),
              ]),
              groups: inScope ? await groupsRepo(db).listForHistory(seasonId) : [],
              anything: missing.length > 0 || (await repo.hasRecorded()),
            };
          }
        : null,
    [db, date, time, groupId, period],
  );
  // L'heure avance : la liste reste affichée pendant la relecture.
  const { value, loaded, loadFailed } = useLoaded(load, 'HISTORY_LOAD_FAILED', {}, true);
  return { history: value, loaded, loadFailed };
};

/**
 * EX-18 : la date redeviendrait un appel manquant si la séance était supprimée : séance d'un
 * créneau qui existe encore avec un groupe actif, saison active, date du créneau déjà finie.
 */
const wouldReappear = async (db: Db, s: SessionDetail, now: LocalNow): Promise<boolean> => {
  if (s.slotId === null) return false;
  const season = await seasonsRepo(db).getActive();
  if (season?.id !== s.seasonId) return false;
  const slot = await slotsRepo(db).get(s.slotId);
  const active = new Set((await groupsRepo(db).listBySeason(season.id)).map((g) => g.id));
  if (!slot?.groups.some((g) => active.has(g.id))) return false;
  return missingRollCalls([slot as WeeklySlot], season, [], now).some((o) => o.date === s.date);
};

/** EX-18 : détail d'une séance enregistrée ; `session` nul si elle n'existe pas (ou plus). */
export const useSessionDetail = (id: number, now: LocalNow) => {
  const db = useDatabase();
  const { date, time } = now;
  const load = useMemo(
    () =>
      db
        ? async () => {
            const session = await sessionsRepo(db, date).get(id);
            if (!session) return null;
            return { session, reappears: await wouldReappear(db, session, { date, time }) };
          }
        : null,
    [db, id, date, time],
  );
  const { value, loaded, loadFailed } = useLoaded(load, 'SESSION_LOAD_FAILED', { id }, true);
  const repo = useCallback(() => {
    if (!db) throw new DataError('DB_NOT_READY');
    return sessionsRepo(db, toIsoDate(new Date()));
  }, [db]);
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
