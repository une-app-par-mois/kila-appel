// Restauration d'une sauvegarde pour l'écran Restauration (ticket 014e, EX-20, NF-04, SEC-10 ;
// zone sensible). Le sélecteur, les fichiers et l'ouverture brute d'une copie sont passés en
// paramètre (expo dans l'appli, node:fs et node:sqlite dans les tests) : le même cycle est testé
// et livré. Le cycle est partagé avec l'écran de récupération (src/hooks/restoreFlow.ts, ticket
// 014f). ABS-04 : le journal ne reçoit que des codes.
import { useCallback, useEffect, useRef, useState } from 'react';
import { restoreBackup } from '@/data/backup';
import { draftGroupName } from '@/data/draftGroupName';
import type { RestoreDeps } from '@/data/expoFiles';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { type Outcome, type RestoreState, restoreOnce } from '@/hooks/restoreFlow';
import { useDatabase } from '@/hooks/useDatabase';

export type { RestoreState } from '@/hooks/restoreFlow';

/** Navigation de l'écran : retour (sélecteur annulé) et accueil (après une réussite). */
export type RestoreNav = { onCancel(): void; onDone(): void };

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
      outcome = await restoreOnce(depsRef.current, {
        show,
        decide,
        // EX-14 : seule lecture de l'appel en cours par la restauration.
        draft: () => draftGroupName(db),
        apply: async (backup, notice) => {
          // EX-20 : une seule transaction ; un échec laisse la base intacte (RESTORE_FAILED).
          await restoreBackup(db, backup);
          notifyDataChanged();
          return { step: 'done', ...notice };
        },
      });
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
