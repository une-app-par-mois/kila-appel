// Session d'un import CSV (ticket 034, EX-30, SEC-10) : lignes lues (réduites aux colonnes
// reconnues, ABS-03) et aperçu gardés entre l'écran de choix et l'écran d'aperçu, au niveau du
// module (comme fileLock), en mémoire seulement : jamais sur le disque, perdus si l'appli est
// fermée (on recommence). Un Tout effacer survenu depuis la lecture libère aussitôt les lignes.
// Chaque `clear` change la génération : une lecture commencée avant n'écrit plus sa session.
import { useSyncExternalStore } from 'react';
import type { CsvRow } from '@/domain/csvParse';
import type { ImportPreview } from '@/domain/memberImport';
import { erasedCount, onDataChanged } from '@/hooks/dataChanged';

export type ImportSessionData = { rows: CsvRow[]; preview: ImportPreview };

let stored: (ImportSessionData & { erased: number }) | null = null;
let generation = 0;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const snapshot = (): ImportSessionData | null => stored;

export const importSession = {
  get: (): ImportSessionData | null => stored,
  /** Vrai si des lignes lues sont en mémoire (contrôle de SEC-10). */
  held: (): boolean => stored !== null,
  /** Génération en cours, à repasser à `set` : un `clear` survenu entre-temps l'invalide. */
  generation: (): number => generation,
  /** Garde la session si la génération n'a pas changé ; rend faux sinon. */
  set: (data: ImportSessionData, erased: number, from: number): boolean => {
    if (from !== generation || erased !== erasedCount()) return false;
    stored = { ...data, erased };
    emit();
    return true;
  },
  /** Vide la session (abandon, fin du parcours, Tout effacer) et annule une lecture en cours. */
  clear: (): void => {
    generation += 1;
    if (stored === null) return;
    stored = null;
    emit();
  },
};

// Tout effacer prévient par dataChanged, au niveau du module : les lignes sont libérées aussitôt,
// même si aucun écran n'est abonné.
onDataChanged(() => {
  if (stored !== null && stored.erased !== erasedCount()) importSession.clear();
});

/** Session en cours, ou null ; l'écran se redessine quand elle change. */
export const useImportSession = (): ImportSessionData | null =>
  useSyncExternalStore(subscribe, snapshot, snapshot);
