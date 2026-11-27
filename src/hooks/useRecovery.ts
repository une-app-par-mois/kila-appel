// « Restaurer une sauvegarde » depuis l'écran de récupération (EX-22, EX-20, SEC-10, SEC-11 ;
// ticket 014f ; zone sensible). Même cycle que l'écran Restauration (src/hooks/restoreFlow.ts) :
// choix, vérification sur une copie à part sans la base de l'appli, confirmation. Le fichier
// abîmé n'est touché qu'après la confirmation : effacement, base neuve, recopie en une transaction
// (replaceDamagedDatabase). Utilisé par le layout racine, qui ne se démonte pas : l'état survit au
// passage de la variante abîmée à la variante « recopie en échec ». ABS-04 : codes seuls. B2
// (ticket 028c) : après une restauration réussie, les relances affichées sont retirées.
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { restoreBackup } from '@/data/backup';
import type { RestoreDeps } from '@/data/expoFiles';
import { dismissAllReminders } from '@/data/expoNotifications';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { type Outcome, type RestoreState, restoreOnce } from '@/hooks/restoreFlow';
import {
  type DatabaseState,
  publishRestoredDatabase,
  replaceDamagedDatabase,
} from '@/hooks/useDatabase';
import { cleanupAtStartup } from '@/hooks/useStartupCleanup';

/** Statut de la base vu par l'écran de récupération. */
export type RecoveryStatus = DatabaseState['status'];

/**
 * `idle` : aucune restauration en cours, l'écran montre sa variante. `erase` (confirmation et
 * recopie) : la base abîmée sera effacée, décidé à l'entrée dans la confirmation.
 */
export type RecoveryState = { step: 'idle' } | (RestoreState & { erase?: boolean });

const IDLE: RecoveryState = { step: 'idle' };
const isRefusal = (state: RecoveryState) => state.step === 'rejected' || state.step === 'failed';

type Subscription = { remove(): void };

/**
 * Restauration depuis l'écran de récupération. Le sélecteur ne s'ouvre qu'après le nettoyage du
 * démarrage ; le verrou commun est tenu du choix du fichier à la fin de la recopie et de
 * l'effacement des copies. Sélecteur fermé ou Annuler : retour à la variante, sans message ; refus
 * ou échec : sa carte, effacée par `dismiss` (« Réessayer », « Repartir de zéro ») ou quand le
 * statut de la base change. Après une réussite : copies effacées, verrou rendu et retour Android
 * libéré, puis seulement la base publiée (accueil) et chaque écran prévenu. Après une recopie en
 * échec, la base neuve vide reste ouverte (variante « recopie en échec »), et un nouveau choix la
 * remplit sans nouvel effacement. Le retour Android est sans effet pendant la recopie.
 */
export const useRecovery = (deps: RestoreDeps, status: RecoveryStatus) => {
  const [state, setState] = useState<RecoveryState>(IDLE);
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const statusRef = useRef(status);
  statusRef.current = status;
  const mounted = useRef(true);
  const answer = useRef<((yes: boolean) => void) | null>(null);
  const backBlock = useRef<Subscription | null>(null);

  /** Bloque ou libère le retour Android, tout de suite (pas au rendu suivant). */
  const blockBack = useCallback((on: boolean) => {
    if (on && backBlock.current === null) {
      backBlock.current = BackHandler.addEventListener('hardwareBackPress', () => true);
    }
    if (!on && backBlock.current !== null) {
      backBlock.current.remove();
      backBlock.current = null;
    }
  }, []);

  const reply = useCallback((yes: boolean) => {
    const resolve = answer.current;
    answer.current = null;
    resolve?.(yes);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      reply(false);
      blockBack(false);
    };
  }, [reply, blockBack]);

  const dismiss = useCallback(() => {
    setState((current) => (isRefusal(current) ? IDLE : current));
  }, []);

  // Revue du 014f : un refus affiché ne survit pas à un changement de la base.
  // biome-ignore lint/correctness/useExhaustiveDependencies: relancé à chaque changement de statut.
  useEffect(dismiss, [status, dismiss]);

  const choose = useCallback(async () => {
    let erase = false;
    const show = (next: RecoveryState) => {
      // Revue du 014f : la phrase des données abîmées est fixée en entrant dans la confirmation.
      if (next.step === 'confirm') erase = statusRef.current === 'failed';
      blockBack(next.step === 'restoring');
      const shown =
        next.step === 'confirm' || next.step === 'restoring' ? { ...next, erase } : next;
      if (mounted.current) setState(shown);
    };
    // SEC-10 : jamais pendant le nettoyage du démarrage (même promesse, déjà finie en général).
    await cleanupAtStartup();
    // Garde du double appui : le verrou commun, pris par le premier appel seul.
    if (!fileLock.acquire('restore')) return;
    let outcome: Outcome<RecoveryState>;
    try {
      show({ step: 'picking' });
      outcome = await restoreOnce<RecoveryState>(depsRef.current, {
        show,
        decide: () =>
          mounted.current
            ? new Promise<boolean>((resolve) => {
                answer.current = resolve;
              })
            : Promise.resolve(false),
        // La base abîmée n'est pas lisible, la base vide n'a pas d'appel en cours.
        draft: async () => null,
        apply: async (backup) => {
          const result = await replaceDamagedDatabase((db) => restoreBackup(db, backup));
          // Effacement en échec (réponse 3 du porteur) ou base qui n'est plus abîmée : rien n'a
          // été modifié, carte « La restauration n'a pas abouti ».
          if (result === 'resetFailed' || result === 'ignored') return { step: 'failed' };
          // Recopie en échec ou base neuve qui ne s'ouvre pas : montré par l'état de la base.
          return IDLE;
        },
      });
    } finally {
      fileLock.release('restore');
    }
    show(outcome.kind === 'show' ? outcome.state : IDLE);
    // Copies effacées, verrou rendu, retour libéré : la base remplie peut être publiée. Les écrans
    // déjà abonnés (aucun en général, la pile se monte ensuite) rechargent leurs données.
    if (publishRestoredDatabase()) {
      await dismissAllReminders();
      notifyDataChanged();
    }
  }, [blockBack]);

  return {
    state,
    choose,
    dismiss,
    confirm: useCallback(() => reply(true), [reply]),
    cancel: useCallback(() => reply(false), [reply]),
  };
};

export type RecoveryControls = ReturnType<typeof useRecovery>;
