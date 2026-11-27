// Conservation et purge des anciennes saisons pour l'écran Sauvegarde (ticket 015b, EX-24, SEC-11,
// ABS-05 ; zone sensible). La conservation est un réglage (1 à 3 saisons, 3 par défaut) : la
// changer ne purge rien. Les candidates sont calculées au jour de l'horloge partagée ; la purge
// prend le verrou commun (aucun export ni aucune restauration pendant, ni l'inverse) et revérifie
// la liste au jour où elle part. Tout effacer (ticket 015f, EX-23, SEC-10) : même verrou, puis
// vidage des copies du cache. ABS-04 : le journal ne reçoit que des codes.
import { useCallback, useMemo, useRef, useState } from 'react';
import { eraseAll } from '@/data/eraseAll';
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
  // Valeur précédente gardée pendant une relecture (nouveau jour à minuit, donnée modifiée) : la
  // section, et une confirmation ouverte, ne disparaissent pas le temps de relire.
  const { value, loadFailed } = useLoaded(load, 'RETENTION_LOAD_FAILED', {}, true);
  // Durée en vigueur au moment de l'appui sur « Purger », pas forcément celle qui a produit la
  // liste confirmée (relecture en cours, durée changée ailleurs) : la transaction de `purge` exige
  // que les saisons visées soient exactement les candidates pour cette durée, sinon rien n'est
  // effacé (`NOT_PURGEABLE`).
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

/** Ce dont Tout effacer a besoin hors de la base : vider les copies du cache (SEC-10). */
export type EraseAllDeps = { clearCopies: () => Promise<void> };

/**
 * EX-23, SEC-11, ABS-05 : Tout effacer, sur la base ouverte (jamais la suppression du fichier,
 * réservée à une base abîmée). Sous le verrou commun ; seulement si l'effacement réussit, les
 * copies du cache sont vidées sous le même verrou (SEC-10) ; un échec du vidage ne bloque rien.
 */
export const useEraseAll = (deps: EraseAllDeps) => {
  const db = useDatabase();
  const [erasing, setErasing] = useState(false);
  const depsRef = useRef(deps);
  depsRef.current = deps;

  /** Vrai si tout est effacé ; faux si rien ne l'a été (verrou pris, base absente, échec). */
  const eraseNow = useCallback(async (): Promise<boolean> => {
    if (!db || !fileLock.acquire('erase')) {
      log('ERASE_ALL_FAILED');
      return false;
    }
    setErasing(true);
    try {
      try {
        await eraseAll(db);
      } catch {
        log('ERASE_ALL_FAILED');
        return false;
      }
      try {
        await depsRef.current.clearCopies();
      } catch {
        log('ERASE_COPIES_FAILED');
      }
    } finally {
      fileLock.release('erase');
      setErasing(false);
    }
    notifyDataChanged();
    return true;
  }, [db]);

  return { erasing, eraseNow };
};
