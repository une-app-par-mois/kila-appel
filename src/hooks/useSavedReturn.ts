// Après l'enregistrement d'un appel (EX-15) : « Appel enregistré » reste affiché un instant, puis
// retour à l'Historique, où la séance apparaît (note de la maquette Appel, ticket 013). Après le
// premier appel, l'invitation à sauvegarder s'ouvre par-dessus l'Historique (EX-21, ticket 014d) :
// son retour, comme celui de l'écran Sauvegarde qu'elle ouvre, ramène à l'Historique.
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import type { Db } from '@/data/db';
import { log } from '@/data/log';
import { needsBackupInvite } from '@/hooks/useBackupReminder';
import { useDatabase } from '@/hooks/useDatabase';

/** Durée d'affichage de « Appel enregistré » avant le retour (maquette : 1,2 s). */
const SAVED_DELAY_MS = 1200;

/**
 * EX-21 : faut-il l'invitation ? Base pas encore ouverte ou réglages illisibles : non (jamais de
 * blocage après un appel). `answer` reste `undefined` tant que la lecture n'est pas finie.
 */
const startInviteCheck = (db: Db | null) => {
  const state: { answer?: boolean } = {};
  if (!db) state.answer = false;
  else
    needsBackupInvite(db)
      .then((needed) => {
        state.answer = needed;
      })
      .catch(() => {
        log('BACKUP_INVITE_LOAD_FAILED');
        state.answer = false;
      });
  return state;
};

export const useSavedReturn = (saved: boolean) => {
  const router = useRouter();
  const db = useDatabase();
  useEffect(() => {
    if (!saved) return;
    // Lue pendant les 1,2 s ; le retour ne l'attend jamais (revue du 014d) : pas finie à temps,
    // pas d'invitation cette fois-ci (elle viendra après un prochain appel).
    const check = startInviteCheck(db);
    const timer = setTimeout(() => {
      if (check.answer === undefined) log('BACKUP_INVITE_LOAD_SLOW');
      // Historique, même depuis l'appel sans créneau (pile : onglets → choix → appel).
      if (router.canDismiss()) router.dismissTo('/historique');
      else router.replace('/historique');
      if (check.answer === true) router.push('/invitation-sauvegarde');
    }, SAVED_DELAY_MS);
    // Écran quitté pendant l'attente : ni retour ni invitation.
    return () => clearTimeout(timer);
  }, [saved, router, db]);
};
