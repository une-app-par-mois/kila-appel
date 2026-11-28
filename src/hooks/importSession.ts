// Session d'un import CSV (ticket 034, EX-30, SEC-10) : lignes lues et aperçu gardés entre l'écran
// de choix et l'écran d'aperçu, au niveau du module (comme fileLock), en mémoire seulement :
// jamais sur le disque, perdus si l'appli est fermée (on recommence). Un Tout effacer survenu
// depuis la lecture rend la session périmée (compte `erasedCount()` noté à la lecture).
import { useSyncExternalStore } from 'react';
import type { CsvRow } from '@/domain/csvParse';
import type { ImportPreview } from '@/domain/memberImport';
import { erasedCount, onDataChanged } from '@/hooks/dataChanged';

export type ImportSessionData = { rows: CsvRow[]; preview: ImportPreview };

let stored: (ImportSessionData & { erased: number }) | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  // Tout effacer prévient par dataChanged : la session lue devient périmée.
  const off = onDataChanged(listener);
  return () => {
    listeners.delete(listener);
    off();
  };
};

/** La session, si aucun Tout effacer n'est survenu depuis la lecture ; sinon null. */
const snapshot = (): ImportSessionData | null =>
  stored !== null && stored.erased === erasedCount() ? stored : null;

export const importSession = {
  /** Session valide, ou null ; une session périmée est vidée. */
  get: (): ImportSessionData | null => {
    const current = snapshot();
    if (current === null && stored !== null) importSession.clear();
    return current;
  },
  /** `erased` : `erasedCount()` lu avant la lecture du contexte de l'aperçu. */
  set: (data: ImportSessionData, erased: number): void => {
    stored = { ...data, erased };
    emit();
  },
  clear: (): void => {
    if (stored === null) return;
    stored = null;
    emit();
  },
};

/** Session en cours, ou null ; l'écran se redessine quand elle change. */
export const useImportSession = (): ImportSessionData | null =>
  useSyncExternalStore(subscribe, snapshot, snapshot);
