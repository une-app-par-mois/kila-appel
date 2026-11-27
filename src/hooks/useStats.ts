// Statistiques pour les écrans (F-05, EX-27, CONV-10) : période résolue avec la saison active et
// le jour de l'appareil (useLocalNow), puis une requête d'agrégats par écran (NF-08). Rechargées
// après toute modification (dataChanged, par useLoaded).
import { useCallback, useMemo } from 'react';
import type { Db } from '@/data/db';
import { type Season, seasonsRepo } from '@/data/seasonsRepo';
import { type GroupStats, type MemberStats, type StatsOverview, statsRepo } from '@/data/statsRepo';
import { type PeriodChoice, resolvePeriod, type StatsPeriod } from '@/domain/statsPeriod';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';
import { useLocalNow } from '@/hooks/useLocalNow';

/** Contexte commun : saison active (`null` sans saison) et période réellement lue. */
export type StatsContext = { season: Season | null; period: StatsPeriod };

/**
 * Lecture commune : `readStats` reçoit la période résolue. `choice` nul = période par défaut (saison
 * active ; sans saison, « Ce mois », file du porteur du 2026-11-27).
 */
const useStatsLoad = <T>(
  choice: PeriodChoice | null,
  /** Stable entre deux rendus (useCallback) : la lecture ne repart que si elle change. */
  readStats: (db: Db, period: StatsPeriod) => Promise<T>,
  failureCode: string,
  details: Record<string, number>,
) => {
  const db = useDatabase();
  const { date } = useLocalNow();
  const kind = choice?.kind ?? null;
  const from = choice?.kind === 'custom' ? choice.from : null;
  const to = choice?.kind === 'custom' ? choice.to : null;
  // Choix aplati : un nouvel objet au même contenu ne relance pas la lecture.
  const load = useMemo(
    () =>
      db
        ? async (): Promise<StatsContext & T> => {
            const season = await seasonsRepo(db).getActive();
            const wanted: PeriodChoice | null =
              kind === 'custom'
                ? { kind, from: from ?? '', to: to ?? '' }
                : kind === null
                  ? null
                  : { kind };
            const period = resolvePeriod(wanted, season, date);
            return { season, period, ...(await readStats(db, period)) };
          }
        : null,
    [db, date, kind, from, to, readStats],
  );
  const { value, loaded, loadFailed } = useLoaded(load, failureCode, details);
  return { stats: value, loaded, loadFailed };
};

const readOverview = async (db: Db, period: StatsPeriod): Promise<{ overview: StatsOverview }> => ({
  overview: await statsRepo(db).overview(period),
});

/** EX-27 : écran « Statistiques » (synthèse et ligne par groupe). */
export const useStats = (choice: PeriodChoice | null) =>
  useStatsLoad(choice, readOverview, 'STATS_LOAD_FAILED', {});

/** EX-27 : écran « Statistiques d'un groupe » ; `group` nul si le groupe n'existe pas (ou plus). */
export const useGroupStats = (groupId: number, choice: PeriodChoice | null) => {
  const readStats = useCallback(
    async (db: Db, period: StatsPeriod): Promise<{ group: GroupStats | null }> => ({
      group: await statsRepo(db).group(groupId, period),
    }),
    [groupId],
  );
  return useStatsLoad(choice, readStats, 'GROUP_STATS_LOAD_FAILED', { groupId });
};

/** EX-27 : écran « Statistiques d'un membre » dans un groupe ; `member` nul s'il est introuvable. */
export const useMemberStats = (memberId: number, groupId: number, choice: PeriodChoice | null) => {
  const readStats = useCallback(
    async (db: Db, period: StatsPeriod): Promise<{ member: MemberStats | null }> => ({
      member: await statsRepo(db).member(memberId, groupId, period),
    }),
    [memberId, groupId],
  );
  return useStatsLoad(choice, readStats, 'MEMBER_STATS_LOAD_FAILED', { memberId, groupId });
};
