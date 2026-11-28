// Verrou commun à l'export (ticket 014b) et à la restauration (ticket 014e), au niveau du module :
// les deux attachent une copie à la base de l'appli sous le même alias et travaillent dans le
// cache, ils ne tournent donc jamais en même temps (revue du 014e). La purge (ticket 015b) le
// prend aussi : une copie ne se fait jamais pendant un effacement. Les écrans s'y abonnent pour
// désactiver leurs boutons pendant l'autre opération. Ticket 033 : l'import, l'export CSV et le
// rapport PDF le prennent aussi, jamais pendant une restauration, une purge, Tout effacer ou le
// nettoyage du démarrage.
import { useSyncExternalStore } from 'react';

// 'cleanup' : nettoyage des dossiers temporaires au démarrage (ticket 014c). 'import' : du
// sélecteur à la fin de la lecture, jamais pendant l'aperçu ; 'csv' et 'report' : de l'écriture à
// la fermeture de la feuille de partage (ticket 033).
export type FileTask = 'export' | 'restore' | 'cleanup' | 'erase' | 'import' | 'csv' | 'report';

/** Résultat de `fileLock.run` : `ran` faux si une autre opération tenait le verrou. */
export type LockedRun<T> = { ran: true; value: T } | { ran: false };

let holder: FileTask | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const fileLock = {
  holder: (): FileTask | null => holder,
  /** Prend le verrou ; faux s'il est déjà pris (par l'autre opération ou par la même). */
  acquire: (task: FileTask): boolean => {
    if (holder !== null) return false;
    holder = task;
    for (const listener of listeners) listener();
    return true;
  },
  /** Rend le verrou, s'il est tenu par cette opération. */
  release: (task: FileTask): void => {
    if (holder !== task) return;
    holder = null;
    for (const listener of listeners) listener();
  },
  /**
   * Lance `work` sous le verrou, rendu à la fin, même après une erreur (qui remonte). Rien n'est
   * lancé si le verrou est déjà pris (ticket 033).
   */
  run: async <T>(task: FileTask, work: () => Promise<T>): Promise<LockedRun<T>> => {
    if (!fileLock.acquire(task)) return { ran: false };
    try {
      return { ran: true, value: await work() };
    } finally {
      fileLock.release(task);
    }
  },
};

/** Opération en cours sur les fichiers, ou null ; l'écran se redessine quand elle change. */
export const useFileLock = (): FileTask | null =>
  useSyncExternalStore(subscribe, fileLock.holder, fileLock.holder);
