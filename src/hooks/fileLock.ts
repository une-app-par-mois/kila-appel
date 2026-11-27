// Verrou commun à l'export (ticket 014b) et à la restauration (ticket 014e), au niveau du module :
// les deux attachent une copie à la base de l'appli sous le même alias et travaillent dans le
// cache, ils ne tournent donc jamais en même temps (revue du 014e). La purge (ticket 015b) le
// prend aussi : une copie ne se fait jamais pendant un effacement. Les écrans s'y abonnent pour
// désactiver leurs boutons pendant l'autre opération.
import { useSyncExternalStore } from 'react';

export type FileTask = 'export' | 'restore' | 'erase';

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
};

/** Opération en cours sur les fichiers, ou null ; l'écran se redessine quand elle change. */
export const useFileLock = (): FileTask | null =>
  useSyncExternalStore(subscribe, fileLock.holder, fileLock.holder);
