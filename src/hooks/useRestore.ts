// Restauration d'une sauvegarde pour l'écran Restauration (ticket 014e, EX-20, NF-04, SEC-10 ;
// zone sensible). Le sélecteur, les fichiers et l'ouverture brute d'une copie sont passés en
// paramètre (expo dans l'appli, node:fs et node:sqlite dans les tests) : le même cycle est testé
// et livré. ABS-04 : le journal ne reçoit que des codes.
import { useCallback, useEffect, useRef, useState } from 'react';
import { restoreBackup } from '@/data/backup';
import { type BackupSummary, type RejectReason, verifyBackup } from '@/data/backupCheck';
import type { Db } from '@/data/db';
import { type DraftGroup, draftGroupName } from '@/data/draftGroupName';
import type { RestoreDeps } from '@/data/expoFiles';
import { log } from '@/data/log';
import { toIsoDate } from '@/domain/formats';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { useDatabase } from '@/hooks/useDatabase';

type Notice = { summary: BackupSummary; draft: DraftGroup | null };

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

/** Navigation de l'écran : retour (sélecteur annulé) et accueil (après une réussite). */
export type RestoreNav = { onCancel(): void; onDone(): void };

// Vidage des dossiers au montage : le sélecteur attend qu'il soit fini.
let clearing: Promise<void> = Promise.resolve();

/** Copies restées d'un arrêt brutal ; rien pendant une restauration ou un export en cours. */
const clearDirs = (deps: RestoreDeps) => {
  if (fileLock.holder() !== null) return;
  clearing = clearing
    .then(() => Promise.all([deps.files.clear(), deps.clearPicked()]))
    .then(() => undefined)
    .catch(() => log('RESTORE_CLEANUP_FAILED'));
};

type Ui = { show(state: RestoreState): void; decide(): Promise<boolean> };
/**
 * Fin d'une restauration, appliquée une fois les copies effacées et le verrou rendu : sélecteur
 * annulé (retour), confirmation refusée (l'écran part de lui-même), ou état à montrer.
 */
type Outcome = { kind: 'cancelled' } | { kind: 'declined' } | { kind: 'show'; state: RestoreState };

const removePicked = (deps: RestoreDeps, path: string) =>
  deps.removePicked(path).catch(() => log('RESTORE_CLEANUP_FAILED'));

/**
 * Choix, vérification sur une copie à part, confirmation, restauration. La copie du sélecteur est
 * effacée dès la vérification faite, et le sous-dossier de la copie vérifiée (avec ses fichiers
 * `-wal`, `-shm`, `-journal`) dans tous les cas, refus, Annuler et écran fermé compris.
 */
const restoreOnce = async (db: Db, deps: RestoreDeps, ui: Ui): Promise<Outcome> => {
  await clearing;
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
    ui.show({ step: 'verifying' });
    dir = await deps.files.newDir();
    const today = toIsoDate(new Date());
    const check = await verifyBackup(picked, `${dir}/restauration.db`, { ...deps, today });
    const done = picked;
    picked = null;
    await removePicked(deps, done);
    if (!check.ok) return { kind: 'show', state: { step: 'rejected', reason: check.reason } };
    const notice = { summary: check.backup.summary, draft: await draftGroupName(db) };
    ui.show({ step: 'confirm', ...notice });
    if (!(await ui.decide())) {
      log('RESTORE_CANCELLED');
      return { kind: 'declined' };
    }
    ui.show({ step: 'restoring', ...notice });
    // EX-20 : une seule transaction ; un échec laisse la base intacte (RESTORE_FAILED journalisé).
    await restoreBackup(db, check.backup);
    notifyDataChanged();
    return { kind: 'show', state: { step: 'done', ...notice } };
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

/**
 * EX-20 : à l'ouverture de l'écran, vide les dossiers des copies et lance le sélecteur. La
 * décision est une promesse : « non » par Annuler, par le retour ou par la fermeture de l'écran.
 * Une seule opération sur les fichiers à la fois dans l'appli (verrou commun avec l'export). Le
 * refus ou l'échec ne s'affiche qu'une fois les copies effacées et le verrou rendu : « Choisir un
 * fichier… » peut repartir aussitôt. Après une réussite, chaque écran recharge, puis l'accueil si
 * l'écran est encore ouvert, sans message.
 */
export const useRestore = (deps: RestoreDeps, nav: RestoreNav) => {
  const db = useDatabase();
  const [state, setState] = useState<RestoreState>({ step: 'picking' });
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const navRef = useRef(nav);
  navRef.current = nav;
  const mounted = useRef(false);
  // Garde de l'écran : le sélecteur n'est lancé qu'une fois à la fois.
  const busy = useRef(false);
  const started = useRef(false);
  const answer = useRef<((yes: boolean) => void) | null>(null);

  const reply = useCallback((yes: boolean) => {
    const resolve = answer.current;
    answer.current = null;
    resolve?.(yes);
  }, []);

  useEffect(() => {
    mounted.current = true;
    clearDirs(depsRef.current);
    return () => {
      mounted.current = false;
      reply(false);
    };
  }, [reply]);

  const choose = useCallback(async () => {
    if (!db || busy.current) return;
    if (!fileLock.acquire('restore')) {
      // Un export ou une autre restauration est en cours : cet écran n'a rien à faire.
      if (mounted.current) navRef.current.onCancel();
      return;
    }
    busy.current = true;
    const show = (next: RestoreState) => {
      if (mounted.current) setState(next);
    };
    const decide = () =>
      mounted.current
        ? new Promise<boolean>((resolve) => {
            answer.current = resolve;
          })
        : Promise.resolve(false);
    let outcome: Outcome;
    try {
      show({ step: 'picking' });
      outcome = await restoreOnce(db, depsRef.current, { show, decide });
    } finally {
      fileLock.release('restore');
      busy.current = false;
    }
    if (outcome.kind === 'show') show(outcome.state);
    if (outcome.kind === 'cancelled' && mounted.current) navRef.current.onCancel();
  }, [db]);

  useEffect(() => {
    if (db && !started.current) {
      started.current = true;
      void choose();
    }
  }, [db, choose]);

  // Effet passif : il passe après celui qui lève le blocage du retour (usePreventRemove, effet de
  // mise en page), donc l'accueil n'est jamais bloqué.
  useEffect(() => {
    if (state.step === 'done') navRef.current.onDone();
  }, [state.step]);

  return {
    state,
    choose,
    confirm: useCallback(() => reply(true), [reply]),
    cancel: useCallback(() => reply(false), [reply]),
  };
};
