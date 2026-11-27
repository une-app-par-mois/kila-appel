// Restauration d'une sauvegarde pour l'écran Restauration (ticket 014e, EX-20, NF-04, SEC-10 ;
// zone sensible). Le sélecteur, les fichiers et l'ouverture brute d'une copie sont passés en
// paramètre (expo dans l'appli, node:fs et node:sqlite dans les tests) : le même cycle est testé
// et livré. ABS-04 : le journal ne reçoit que des codes.
import { useCallback, useEffect, useRef, useState } from 'react';
import { restoreBackup } from '@/data/backup';
import { type BackupSummary, type RejectReason, verifyBackup } from '@/data/backupCheck';
import type { Db } from '@/data/db';
import { draftsRepo } from '@/data/draftsRepo';
import type { RestoreDeps } from '@/data/expoFiles';
import { log } from '@/data/log';
import { toIsoDate } from '@/domain/formats';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useDatabase } from '@/hooks/useDatabase';

/** Appel en cours sur l'appareil, remplacé lui aussi ; `groupName` nul : groupe supprimé. */
export type DraftNotice = { groupName: string | null } | null;

export type RestoreState =
  | { step: 'picking' }
  | { step: 'verifying' }
  | { step: 'confirm'; summary: BackupSummary; draft: DraftNotice }
  | { step: 'restoring'; summary: BackupSummary; draft: DraftNotice }
  | { step: 'rejected'; reason: RejectReason }
  /** Sélecteur en échec, ou restauration qui n'a pas abouti : rien n'a été modifié. */
  | { step: 'failed' };

/** Navigation de l'écran : retour (sélecteur annulé) et accueil (après une réussite). */
export type RestoreNav = { onCancel(): void; onDone(): void };

// Une seule restauration à la fois dans l'appli, du choix du fichier à l'effacement des copies :
// un second écran ne vide pas les dossiers et ne lance pas de sélecteur.
let running = false;
// Vidage des dossiers au montage : le sélecteur attend qu'il soit fini.
let clearing: Promise<void> = Promise.resolve();

/** Copies restées d'un arrêt brutal ; rien pendant une restauration en cours. */
const clearDirs = (deps: RestoreDeps) => {
  if (running) return;
  clearing = clearing
    .then(() => Promise.all([deps.files.clear(), deps.clearPicked()]))
    .then(() => undefined)
    .catch(() => log('RESTORE_CLEANUP_FAILED'));
};

type Ui = { show(state: RestoreState): void; decide(): Promise<boolean> };
type Outcome = 'cancelled' | 'stopped' | 'done';

const removePicked = (deps: RestoreDeps, path: string) =>
  deps.removePicked(path).catch(() => log('RESTORE_CLEANUP_FAILED'));

/**
 * Choix, vérification sur une copie à part, confirmation, restauration. La copie du sélecteur est
 * effacée dès la vérification faite, et le sous-dossier de la copie vérifiée (avec ses fichiers
 * `-wal`, `-shm`, `-journal`) dans tous les cas, refus, Annuler et écran fermé compris.
 */
const restoreOnce = async (db: Db, deps: RestoreDeps, ui: Ui): Promise<Outcome> => {
  await clearing;
  let picked: string | null;
  try {
    picked = await deps.pick();
  } catch {
    log('RESTORE_PICK_FAILED');
    ui.show({ step: 'failed' });
    return 'stopped';
  }
  if (picked === null) {
    log('RESTORE_CANCELLED');
    return 'cancelled';
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
    if (!check.ok) {
      ui.show({ step: 'rejected', reason: check.reason });
      return 'stopped';
    }
    const current = await draftsRepo(db).get();
    const notice = {
      summary: check.backup.summary,
      draft: current && { groupName: current.groupName },
    };
    ui.show({ step: 'confirm', ...notice });
    if (!(await ui.decide())) {
      log('RESTORE_CANCELLED');
      return 'stopped';
    }
    ui.show({ step: 'restoring', ...notice });
    // EX-20 : une seule transaction ; un échec laisse la base intacte (RESTORE_FAILED journalisé).
    await restoreBackup(db, check.backup);
    return 'done';
  } catch {
    ui.show({ step: 'failed' });
    return 'stopped';
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
 * Après une réussite, chaque écran recharge (notifyDataChanged), puis l'accueil si l'écran est
 * encore ouvert, sans message.
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
    if (running) {
      // Une restauration est déjà en cours ailleurs : cet écran n'a rien à faire.
      if (mounted.current) navRef.current.onCancel();
      return;
    }
    busy.current = true;
    running = true;
    const ui: Ui = {
      show: (next) => {
        if (mounted.current) setState(next);
      },
      decide: () =>
        mounted.current
          ? new Promise<boolean>((resolve) => {
              answer.current = resolve;
            })
          : Promise.resolve(false),
    };
    let outcome: Outcome;
    try {
      ui.show({ step: 'picking' });
      outcome = await restoreOnce(db, depsRef.current, ui);
    } finally {
      running = false;
      busy.current = false;
    }
    if (outcome === 'done') notifyDataChanged();
    if (!mounted.current) return;
    if (outcome === 'done') navRef.current.onDone();
    if (outcome === 'cancelled') navRef.current.onCancel();
  }, [db]);

  useEffect(() => {
    if (db && !started.current) {
      started.current = true;
      void choose();
    }
  }, [db, choose]);

  return {
    state,
    choose,
    confirm: useCallback(() => reply(true), [reply]),
    cancel: useCallback(() => reply(false), [reply]),
  };
};
