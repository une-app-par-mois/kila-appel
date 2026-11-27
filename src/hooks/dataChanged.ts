// Notification commune aux hooks de données : chaque écran a son propre état et une pile native
// garde les écrans précédents montés. Après toute modification, chaque écran ouvert recharge
// (une saison supprimée emporte ses groupes : la liste des groupes doit le voir).
import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

/** Abonne un rechargement ; rend la fonction de désabonnement. */
export const onDataChanged = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const notifyDataChanged = (): void => {
  for (const listener of listeners) listener();
};

// Nombre de « Tout effacer » depuis le lancement (ticket 015f) : une valeur lue avant un
// effacement ne doit plus s'afficher, même le temps de relire (accueil qui garde sa valeur).
let erased = 0;

/** Compte des effacements, à joindre à une valeur lue. */
export const erasedCount = (): number => erased;

/** Après Tout effacer : les valeurs lues avant deviennent périmées, puis chaque écran recharge. */
export const notifyDataErased = (): void => {
  erased += 1;
  notifyDataChanged();
};

/** Compte des effacements ; l'écran se redessine quand il change. */
export const useErasedCount = (): number =>
  useSyncExternalStore(onDataChanged, erasedCount, erasedCount);
