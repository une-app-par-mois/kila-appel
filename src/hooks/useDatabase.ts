// Base de l'appli : une seule connexion, ouverte et migrée une fois, gardée toute la vie de
// l'appli (ADR-002, ADR-008). Tous les appels partagent la même ouverture : deux connexions
// casseraient la file commune des transactions (src/data/db.ts).
// EX-22 (ticket 014c) : l'état de l'ouverture est partagé ; un échec mène à l'écran de
// récupération (layout racine), qui rouvre (retryDatabase), repart de zéro (resetDatabase) ou
// restaure une sauvegarde (replaceDamagedDatabase, ticket 014f).
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
  | { status: 'failed'; cause: OpenFailure; pending: boolean; resetFailed: boolean }
  /**
   * Ticket 014f : la recopie d'une sauvegarde a échoué après l'effacement de la base abîmée. La
   * base neuve, vide, est ouverte mais pas publiée (`pending` : nouvelle recopie en cours).
   */
  | { status: 'restoreFailed'; db: Db; pending: boolean }
  /**
   * Base abîmée effacée, mais la base neuve ne s'ouvre pas (réponse 1 du porteur du 2026-11-27) :
   * après « Repartir de zéro » (`startOver`) ou une restauration (`restore`). « Réessayer » rouvre
   * une base neuve ; jamais « rien n'a été effacé ».
   */
  | { status: 'erased'; after: ErasedBy; pending: boolean };

export type ErasedBy = 'startOver' | 'restore';

/**
 * Issue de `replaceDamagedDatabase` ; `filled` : base remplie, à publier par
 * `publishRestoredDatabase` ; `ignored` : rien n'a été fait (garde).
 */
export type ReplaceResult = 'filled' | 'restoreFailed' | 'resetFailed' | 'openFailed' | 'ignored';

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
// Base restaurée, pas encore publiée (ticket 014f) : l'appelant efface d'abord ses copies.
let filled: Db | null = null;
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

/** Échec d'ouverture : classé et écrit, sans détail. */
const failWith = (error: unknown) => {
  const cause = classifyOpenError(error);
  log(FAILURE_CODES[cause]);
  setState({ status: 'failed', cause, pending: false, resetFailed: false });
};

/** Base neuve qui ne s'ouvre pas après un effacement : code de la cause, puis `erased`. */
const erasedFailure = (error: unknown, after: ErasedBy) => {
  log(FAILURE_CODES[classifyOpenError(error)]);
  setState({ status: 'erased', after, pending: false });
};

/**
 * Ouvre la base avec l'ouverture retenue. `erasedBy` : la base abîmée vient d'être effacée ; un
 * échec mène alors à l'état `erased` (le code de la cause est écrit aussi).
 */
const openNow = async (erasedBy?: ErasedBy): Promise<void> => {
  try {
    setState({ status: 'ready', db: await openAppDatabase(opener ?? openExpoDb) });
  } catch (error) {
    if (erasedBy === undefined) failWith(error);
    else erasedFailure(error, erasedBy);
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

/**
 * « Réessayer » : rouvre sans rien effacer, une fois même après plusieurs appuis. Après un
 * effacement (`erased`) : ouvre une base neuve, vide (puis Bienvenue).
 */
export const retryDatabase = (): void => {
  if (state.status === 'erased') {
    if (state.pending) return;
    const { after } = state;
    setState({ ...state, pending: true });
    void openNow(after);
    return;
  }
  const failed = idleFailure();
  if (failed === null) return;
  setState({ ...failed, pending: true, resetFailed: false });
  void openNow();
};

/**
 * « Repartir de zéro » (base abîmée seulement) : supprime le fichier et ses fichiers `-journal`,
 * `-wal`, `-shm`, puis ouvre une base neuve. Jamais pour une autre cause (réglage refusé, erreur
 * non reconnue, version plus récente) : le fichier est gardé. Une suppression en échec garde
 * l'écran de récupération, avec son message ; un fichier déjà absent compte comme effacé. Une
 * base neuve qui ne s'ouvre pas après l'effacement mène à l'état `erased` (ticket 014f).
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
  await openNow('startOver');
};

/**
 * Remplit la base neuve, sans la publier : `publishRestoredDatabase` le fait. Un échec la garde
 * ouverte, vide (`restoreFailed`) : `fill` est une seule transaction (restoreBackup), annulée en
 * entier.
 */
const fillOnly = async (db: Db, fill: (db: Db) => Promise<void>): Promise<ReplaceResult> => {
  if (state.status === 'restoreFailed') setState({ status: 'restoreFailed', db, pending: true });
  try {
    await fill(db);
  } catch {
    // ABS-04 : un code seul, jamais le message de l'erreur.
    log('RECOVERY_RESTORE_FAILED');
    setState({ status: 'restoreFailed', db, pending: false });
    return 'restoreFailed';
  }
  filled = db;
  return 'filled';
};

/**
 * EX-22, EX-20 (ticket 014f) : « Restaurer une sauvegarde » depuis l'écran de récupération, une
 * fois la sauvegarde vérifiée et la confirmation donnée. Base abîmée seulement (même garde que
 * resetDatabase) : supprime le fichier, ouvre une base neuve sans la publier et la remplit par
 * `fill` ; l'écran reste en attente jusqu'à `publishRestoredDatabase`. Une suppression en échec
 * ne touche à rien d'autre (l'écran montre l'échec de la restauration, réponse 3 du porteur) ;
 * une base neuve qui ne s'ouvre pas mène à l'état `erased`. Après une recopie en échec
 * (`restoreFailed`), une nouvelle recopie remplit la même base vide, sans nouvel effacement. Rien
 * n'est fait pendant une séquence en cours. Ne rejette jamais.
 */
export const replaceDamagedDatabase = async (
  fill: (db: Db) => Promise<void>,
): Promise<ReplaceResult> => {
  if (state.status === 'restoreFailed') {
    return state.pending ? 'ignored' : fillOnly(state.db, fill);
  }
  const failed = idleFailure();
  if (failed === null || failed.cause !== 'damaged') return 'ignored';
  setState({ ...failed, pending: true, resetFailed: false });
  try {
    await deleteAppDatabase();
  } catch {
    log('DB_RESET_FAILED');
    setState({ ...failed, pending: false });
    return 'resetFailed';
  }
  log('DB_RESET_DONE');
  let db: Db;
  try {
    db = await openAppDatabase(opener ?? openExpoDb);
  } catch (error) {
    erasedFailure(error, 'restore');
    return 'openFailed';
  }
  return fillOnly(db, fill);
};

/**
 * Publie la base remplie par `replaceDamagedDatabase` (`ready`, puis la pile et l'accueil), une
 * fois les copies effacées, le verrou rendu et le retour Android libéré (revue du 014f). Faux :
 * aucune base remplie à publier.
 */
export const publishRestoredDatabase = (): boolean => {
  if (filled === null) return false;
  const db = filled;
  filled = null;
  log('RECOVERY_RESTORE_DONE');
  setState({ status: 'ready', db });
  return true;
};

/** « Repartir de zéro » après une recopie en échec (ticket 014f) : publie la base vide. */
export const acceptEmptyDatabase = (): void => {
  if (state.status !== 'restoreFailed' || state.pending) return;
  setState({ status: 'ready', db: state.db });
};

/** Tests seulement : oublie l'ouverture partagée. */
export const resetDatabaseForTests = (): void => {
  opener = null;
  filled = null;
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
