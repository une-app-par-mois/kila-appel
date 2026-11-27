// Base de l'appli : une seule connexion, ouverte et migrée une fois, gardée toute la vie de
// l'appli (ADR-002, ADR-008). Tous les appels partagent la même ouverture : deux connexions
// casseraient la file commune des transactions (src/data/db.ts).
// EX-22 (ticket 014c) : l'état de l'ouverture est partagé ; un échec mène à l'écran de
// récupération (layout racine), qui rouvre (retryDatabase) ou repart de zéro (resetDatabase).
// Les écrans n'accèdent aux données que par les hooks (CONV-10).
import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { Db } from '@/data/db';
import { deleteAppDatabase, openExpoDb } from '@/data/expoDb';
import { log } from '@/data/log';
import { classifyOpenError, type OpenFailure, openAppDatabase } from '@/data/open';

/**
 * Ouverture en cours, base prête, ou échec et sa cause (`pending` : nouvel essai en cours ;
 * `resetFailed` : le dernier effacement de « Repartir de zéro » n'a pas abouti).
 */
export type DatabaseState =
  | { status: 'opening' }
  | { status: 'ready'; db: Db }
  | { status: 'failed'; cause: OpenFailure; pending: boolean; resetFailed: boolean };

// ABS-04 : le journal ne reçoit qu'un code par cause.
const FAILURE_CODES: Record<OpenFailure, string> = {
  damaged: 'DB_OPEN_DAMAGED',
  settings: 'DB_OPEN_SETTINGS',
  newer: 'DB_OPEN_NEWER',
  unavailable: 'DB_OPEN_UNAVAILABLE',
};

const OPENING: DatabaseState = { status: 'opening' };
let state: DatabaseState = OPENING;
let opener: (() => Promise<Db>) | null = null;
const listeners = new Set<() => void>();

const setState = (next: DatabaseState) => {
  state = next;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getState = () => state;

/** Ouvre la base avec l'ouverture retenue ; l'échec est classé et écrit, sans détail. */
const openNow = async (): Promise<void> => {
  try {
    setState({ status: 'ready', db: await openAppDatabase(opener ?? openExpoDb) });
  } catch (error) {
    const cause = classifyOpenError(error);
    log(FAILURE_CODES[cause]);
    setState({ status: 'failed', cause, pending: false, resetFailed: false });
  }
};

/** Première ouverture ; `open` est ignoré ensuite (tests). */
const start = (open: () => Promise<Db>) => {
  if (opener !== null) return;
  opener = open;
  void openNow();
};

/** Échec en cours sans nouvel essai, ou null. */
const idleFailure = () => (state.status === 'failed' && !state.pending ? state : null);

/** « Réessayer » : rouvre sans rien effacer, une fois même après plusieurs appuis. */
export const retryDatabase = (): void => {
  const failed = idleFailure();
  if (failed === null) return;
  setState({ ...failed, pending: true, resetFailed: false });
  void openNow();
};

/**
 * « Repartir de zéro » (base abîmée seulement) : supprime le fichier et ses fichiers `-journal`,
 * `-wal`, `-shm`, puis ouvre une base neuve. Jamais pour une autre cause (réglage refusé, erreur
 * non reconnue, version plus récente) : le fichier est gardé. Une suppression en échec garde
 * l'écran de récupération, avec son message ; un fichier déjà absent compte comme effacé.
 */
export const resetDatabase = async (): Promise<void> => {
  const failed = idleFailure();
  if (failed === null || failed.cause !== 'damaged') return;
  setState({ ...failed, pending: true, resetFailed: false });
  try {
    await deleteAppDatabase();
  } catch {
    log('DB_RESET_FAILED');
    setState({ ...failed, pending: false, resetFailed: true });
    return;
  }
  log('DB_RESET_DONE');
  await openNow();
};

/** Tests seulement : oublie l'ouverture partagée. */
export const resetDatabaseForTests = (): void => {
  opener = null;
  state = OPENING;
};

/**
 * État de l'ouverture (layout racine, écran de récupération). Le premier appel lance l'ouverture ;
 * `open` ne sert qu'à elle (tests).
 */
export const useDatabaseState = (open: () => Promise<Db> = openExpoDb): DatabaseState => {
  const openRef = useRef(open);
  useEffect(() => start(openRef.current), []);
  return useSyncExternalStore(subscribe, getState, getState);
};

/** Rend la base une fois prête, `null` avant et en cas d'échec. */
export const useDatabase = (open: () => Promise<Db> = openExpoDb): Db | null => {
  const current = useDatabaseState(open);
  return current.status === 'ready' ? current.db : null;
};
