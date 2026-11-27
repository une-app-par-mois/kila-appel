// « Restaurer une sauvegarde » depuis l'écran de récupération (EX-22, EX-20, SEC-10, SEC-11 ;
// ticket 014f ; zone sensible). Même cycle que l'écran Restauration (src/hooks/restoreFlow.ts) :
// choix, vérification sur une copie à part sans la base de l'appli, confirmation. Le fichier
// abîmé n'est touché qu'après la confirmation : effacement, base neuve, recopie en une transaction
// (replaceDamagedDatabase). Utilisé par le layout racine, qui ne se démonte pas : l'état survit au
// passage de la variante abîmée à la variante « recopie en échec ». ABS-04 : codes seuls.
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { restoreBackup } from '@/data/backup';
import type { RestoreDeps } from '@/data/expoFiles';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { type Outcome, type RestoreState, restoreOnce } from '@/hooks/restoreFlow';
import { replaceDamagedDatabase } from '@/hooks/useDatabase';
import { cleanupAtStartup } from '@/hooks/useStartupCleanup';

/** `idle` : aucune restauration en cours, l'écran montre sa variante. */
export type RecoveryState = { step: 'idle' } | RestoreState;

const IDLE: RecoveryState = { step: 'idle' };

/**
 * Restauration depuis l'écran de récupération. Le sélecteur ne s'ouvre qu'après le nettoyage du
 * démarrage ; le verrou commun est tenu du choix du fichier à la fin de la recopie. Sélecteur
 * fermé, Annuler ou refus : aucun fichier touché, retour à la variante (refus : son message).
 * Après une réussite, chaque écran recharge et la pile s'affiche (accueil) ; après une recopie en
 * échec, la base neuve vide reste ouverte (variante « recopie en échec »), et un nouveau choix la
 * remplit sans nouvel effacement. Le retour Android est sans effet pendant la recopie.
 */
export const useRecovery = (deps: RestoreDeps) => {
  const [state, setState] = useState<RecoveryState>(IDLE);
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const mounted = useRef(true);
  const answer = useRef<((yes: boolean) => void) | null>(null);

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
    };
  }, [reply]);

  const choose = useCallback(async () => {
    const show = (next: RecoveryState) => {
      if (mounted.current) setState(next);
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
          if (result === 'ready') notifyDataChanged();
          // Toute autre issue est montrée par l'état de la base (useDatabaseState).
          return IDLE;
        },
      });
    } finally {
      fileLock.release('restore');
    }
    show(outcome.kind === 'show' ? outcome.state : IDLE);
  }, []);

  const restoring = state.step === 'restoring';
  useEffect(() => {
    if (!restoring) return;
    // Effacement et recopie : l'appli ne se ferme pas par le retour Android.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [restoring]);

  return {
    state,
    choose,
    confirm: useCallback(() => reply(true), [reply]),
    cancel: useCallback(() => reply(false), [reply]),
  };
};

export type RecoveryControls = ReturnType<typeof useRecovery>;
