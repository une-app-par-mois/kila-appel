// Conservation et purge des anciennes saisons pour l'écran Sauvegarde (ticket 015b, EX-24, SEC-11,
// ABS-05 ; zone sensible). La conservation est un réglage (1 à 3 saisons, 3 par défaut) : la
// changer ne purge rien. Les candidates sont calculées au jour de l'horloge partagée ; la purge
// prend le verrou commun (aucun export ni aucune restauration pendant, ni l'inverse) et revérifie
// la liste au jour où elle part. ABS-04 : le journal ne reçoit que des codes.
import { useCallback, useMemo, useRef, useState } from 'react';
import { DataError } from '@/data/errors';
import { log } from '@/data/log';
import { type PurgeImpact, purge, purgeCandidates, purgeImpact } from '@/data/purge';
import { settingsRepo } from '@/data/settingsRepo';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';
import { useLocalNow } from '@/hooks/useLocalNow';

export const useErase = () => {
  const db = useDatabase();
  const today = useLocalNow().date;
  // Le jour où la purge part : s'il a changé la liste depuis la confirmation, elle est refusée.
  const todayRef = useRef(today);
  todayRef.current = today;
  const [purging, setPurging] = useState(false);

  const load = useMemo(
    () =>
      db
        ? async () => {
            const retention = await settingsRepo(db).retentionSeasons();
            return { retention, candidates: await purgeCandidates(db, retention, today) };
          }
        : null,
    [db, today],
  );
  const { value, loadFailed } = useLoaded(load, 'RETENTION_LOAD_FAILED');
  // La purge vise la durée qui a produit les candidates affichées.
  const retentionRef = useRef<number | null>(null);
  retentionRef.current = value?.retention ?? null;

  /** EX-24 : enregistre la conservation, sans aucune purge ; faux si refusée ou en échec. */
  const setRetention = useCallback(
    async (seasons: number): Promise<boolean> => {
      try {
        if (!db) throw new DataError('DB_NOT_READY');
        await settingsRepo(db).setRetentionSeasons(seasons);
      } catch {
        log('RETENTION_SAVE_FAILED');
        return false;
      }
      notifyDataChanged();
      return true;
    },
    [db],
  );

  /** EX-24 : ce que la purge effacera, pour la confirmation. */
  const impact = useCallback(
    (ids: readonly number[]): Promise<PurgeImpact> => {
      if (!db) return Promise.reject(new DataError('DB_NOT_READY'));
      return purgeImpact(db, ids);
    },
    [db],
  );

  /** EX-24, ABS-05 : purge confirmée ; faux si rien n'a été effacé (verrou pris, refus, échec). */
  const purgeNow = useCallback(
    async (ids: readonly number[]): Promise<boolean> => {
      const retention = retentionRef.current;
      if (!db || retention === null || !fileLock.acquire('erase')) {
        log('PURGE_FAILED');
        return false;
      }
      setPurging(true);
      try {
        await purge(db, ids, retention, todayRef.current);
      } catch {
        log('PURGE_FAILED');
        return false;
      } finally {
        fileLock.release('erase');
        setPurging(false);
      }
      notifyDataChanged();
      return true;
    },
    [db],
  );

  return {
    retention: value?.retention ?? null,
    candidates: value?.candidates ?? null,
    loadFailed,
    purging,
    setRetention,
    impact,
    purgeNow,
  };
};

/** EX-24 : durée de conservation seule, pour la ligne de Paramètres. */
export const useRetention = () => {
  const db = useDatabase();
  const load = useMemo(() => (db ? () => settingsRepo(db).retentionSeasons() : null), [db]);
  const { value, loadFailed } = useLoaded(load, 'RETENTION_LOAD_FAILED');
  return { retention: value, loadFailed };
};
