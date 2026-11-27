// Cycle d'une restauration (ticket 014e, sorti de useRestore au ticket 014f ; EX-20, SEC-10 ; zone
// sensible) : vidage des dossiers, sélecteur, vérification sur une copie à part, confirmation,
// étape finale, copies effacées. Partagé par l'écran Restauration (useRestore) et l'écran de
// récupération (useRecovery). L'appelant tient le verrou commun (fileLock) pendant tout le cycle.
// EX-14 : l'appel en cours n'est lu que par l'appelant (rappel `draft`) ; ce module n'importe pas
// sa lecture. ABS-04 : le journal ne reçoit que des codes.
import {
  type BackupSummary,
  type RejectReason,
  type VerifiedBackup,
  verifyBackup,
} from '@/data/backupCheck';
import type { RestoreDeps } from '@/data/expoFiles';
import { log } from '@/data/log';
import { toIsoDate } from '@/domain/formats';

/** Appel en cours annoncé à la confirmation : `groupName` nul si son groupe a été supprimé. */
export type DraftNotice = { groupName: string | null } | null;
export type Notice = { summary: BackupSummary; draft: DraftNotice };

export type RestoreState =
  | { step: 'picking' }
  | { step: 'verifying' }
  | ({ step: 'confirm' } & Notice)
  | ({ step: 'restoring' } & Notice)
  /** Réussite : l'écran part vers l'accueil (le retour n'est plus bloqué). */
  | ({ step: 'done' } & Notice)
  | { step: 'rejected'; reason: RejectReason }
  /** Sélecteur en échec, ou restauration qui n'a pas abouti : rien n'a été modifié. */
  | { step: 'failed' };

/**
 * Fin d'un cycle, appliquée par l'appelant une fois les copies effacées et le verrou rendu :
 * sélecteur annulé, confirmation refusée, ou état à montrer.
 */
export type Outcome<Final = RestoreState> =
  | { kind: 'cancelled' }
  | { kind: 'declined' }
  | { kind: 'show'; state: RestoreState | Final };

/** `Final` : état propre à l'appelant que l'étape finale peut rendre (récupération : `idle`). */
export type RestoreSteps<Final = RestoreState> = {
  show(state: RestoreState): void;
  /** Décision de l'encadrant : « non » par Annuler, le retour ou la fermeture de l'écran. */
  decide(): Promise<boolean>;
  /** Appel en cours remplacé, lu par l'appelant (EX-14) ; null : rien à annoncer. */
  draft(): Promise<DraftNotice>;
  /** Étape finale, après la confirmation : remplace les données, rend l'état à montrer. */
  apply(backup: VerifiedBackup, notice: Notice): Promise<RestoreState | Final>;
};

/**
 * Copies restées d'un arrêt brutal, vidées sous le verrou de la restauration, avant le sélecteur
 * (revue de sécurité du 014c ; le nettoyage au démarrage le fait aussi, ticket 014c).
 */
const clearDirs = (deps: RestoreDeps) =>
  Promise.all([deps.files.clear(), deps.clearPicked()]).then(
    () => undefined,
    () => log('RESTORE_CLEANUP_FAILED'),
  );

const removePicked = (deps: RestoreDeps, path: string) =>
  deps.removePicked(path).catch(() => log('RESTORE_CLEANUP_FAILED'));

/**
 * Choix, vérification sur une copie à part (sans la base de l'appli : `deps.open` et le schéma de
 * référence), confirmation, étape finale. La copie du sélecteur est effacée dès la vérification
 * faite, et le sous-dossier de la copie vérifiée (avec ses fichiers `-wal`, `-shm`, `-journal`)
 * dans tous les cas, refus, Annuler et écran fermé compris.
 */
export const restoreOnce = async <Final = RestoreState>(
  deps: RestoreDeps,
  steps: RestoreSteps<Final>,
): Promise<Outcome<Final>> => {
  await clearDirs(deps);
  let picked: string | null = null;
  try {
    const result = await deps.pick();
    if (result === null) {
      log('RESTORE_CANCELLED');
      return { kind: 'cancelled' };
    }
    if ('reason' in result) return { kind: 'show', state: { step: 'rejected', ...result } };
    picked = result.path;
  } catch {
    log('RESTORE_PICK_FAILED');
    return { kind: 'show', state: { step: 'failed' } };
  }
  log('RESTORE_PICKED');
  let dir: string | null = null;
  try {
    steps.show({ step: 'verifying' });
    dir = await deps.files.newDir();
    const today = toIsoDate(new Date());
    const check = await verifyBackup(picked, `${dir}/restauration.db`, { ...deps, today });
    const done = picked;
    picked = null;
    await removePicked(deps, done);
    if (!check.ok) return { kind: 'show', state: { step: 'rejected', reason: check.reason } };
    const notice = { summary: check.backup.summary, draft: await steps.draft() };
    steps.show({ step: 'confirm', ...notice });
    if (!(await steps.decide())) {
      log('RESTORE_CANCELLED');
      return { kind: 'declined' };
    }
    steps.show({ step: 'restoring', ...notice });
    return { kind: 'show', state: await steps.apply(check.backup, notice) };
  } catch {
    log('RESTORE_UNEXPECTED');
    return { kind: 'show', state: { step: 'failed' } };
  } finally {
    if (picked !== null) await removePicked(deps, picked);
    if (dir !== null) {
      await deps.files.removeDir(dir).catch(() => log('RESTORE_CLEANUP_FAILED'));
    }
  }
};
