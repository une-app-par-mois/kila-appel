// Alertes d'assiduité pour les écrans (F-04, EX-25, EX-26, CONV-10). Même contrat que les autres
// hooks de données : une action qui échoue est relayée à l'écran ; après une action réussie, tous
// les écrans ouverts rechargent (dataChanged). ABS-04 : les journaux portent un code et un id.
import { useCallback, useMemo } from 'react';
import { type AttendanceAlert, alertsRepo, type RecentStatus } from '@/data/alertsRepo';
import { DataError } from '@/data/errors';
import { settingsRepo } from '@/data/settingsRepo';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';

/** EX-26 : « Marquer comme traitée » enregistre la longueur de la série au jour `today`. */
const useAcknowledge = (today: string) => {
  const db = useDatabase();
  return useCallback(
    async (memberId: number, streakLength: number): Promise<void> => {
      if (!db) throw new DataError('DB_NOT_READY');
      await alertsRepo(db).acknowledge(memberId, streakLength, today);
      notifyDataChanged();
    },
    [db, today],
  );
};

/** EX-25 : alertes du jour, au seuil réglé. */
export const useAlerts = (today: string) => {
  const db = useDatabase();
  const load = useMemo(
    () =>
      db
        ? async (): Promise<AttendanceAlert[]> =>
            alertsRepo(db).list(today, await settingsRepo(db).alertThreshold())
        : null,
    [db, today],
  );
  const { value: alerts, loaded, loadFailed } = useLoaded(load, 'ALERTS_LOAD_FAILED');
  const acknowledge = useAcknowledge(today);
  return { alerts, loaded, loadFailed, acknowledge };
};

/** Écran de l'alerte (ticket 022) : l'alerte du membre (null s'il n'en a plus) et ses dernières séances. */
export const useAlert = (memberId: number, today: string) => {
  const db = useDatabase();
  const load = useMemo(
    () =>
      db
        ? async (): Promise<{ alert: AttendanceAlert | null; recent: RecentStatus[] }> => {
            const threshold = await settingsRepo(db).alertThreshold();
            const repo = alertsRepo(db);
            return {
              alert: await repo.get(memberId, today, threshold),
              recent: await repo.recentStatuses(memberId),
            };
          }
        : null,
    [db, memberId, today],
  );
  const { value, loaded, loadFailed } = useLoaded(load, 'ALERT_LOAD_FAILED', { memberId });
  const acknowledge = useAcknowledge(today);
  return {
    alert: value?.alert ?? null,
    recent: value?.recent ?? [],
    loaded,
    loadFailed,
    acknowledge,
  };
};

/** EX-25 : seuil des alertes (réglage, ticket 022). */
export const useAlertThreshold = () => {
  const db = useDatabase();
  const load = useMemo(() => (db ? () => settingsRepo(db).alertThreshold() : null), [db]);
  const { value: threshold, loaded, loadFailed } = useLoaded(load, 'ALERT_THRESHOLD_LOAD_FAILED');
  const setThreshold = useCallback(
    async (value: number): Promise<void> => {
      if (!db) throw new DataError('DB_NOT_READY');
      await settingsRepo(db).setAlertThreshold(value);
      notifyDataChanged();
    },
    [db],
  );
  return { threshold, loaded, loadFailed, setThreshold };
};
