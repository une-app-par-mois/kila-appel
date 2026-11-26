// Notification commune aux hooks de données : chaque écran a son propre état et une pile native
// garde les écrans précédents montés. Après toute modification, chaque écran ouvert recharge
// (une saison supprimée emporte ses groupes : la liste des groupes doit le voir).
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
