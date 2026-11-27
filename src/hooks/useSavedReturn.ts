// Après l'enregistrement d'un appel (EX-15) : « Appel enregistré » reste affiché un instant, puis
// retour à l'Historique, où la séance apparaît (note de la maquette Appel, ticket 013). Après le
// premier appel, l'invitation à sauvegarder s'ouvre par-dessus l'Historique (EX-21, ticket 014d) :
// son retour, comme celui de l'écran Sauvegarde qu'elle ouvre, ramène à l'Historique.
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { log } from '@/data/log';
import { needsBackupInvite } from '@/hooks/useBackupReminder';
import { useDatabase } from '@/hooks/useDatabase';

/** Durée d'affichage de « Appel enregistré » avant le retour (maquette : 1,2 s). */
const SAVED_DELAY_MS = 1200;

/** EX-21 : réglages illisibles = pas d'invitation (jamais de blocage après un appel). */
const inviteNeeded = (check: Promise<boolean>) =>
  check.catch(() => {
    log('BACKUP_INVITE_LOAD_FAILED');
    return false;
  });

export const useSavedReturn = (saved: boolean) => {
  const router = useRouter();
  const db = useDatabase();
  useEffect(() => {
    if (!saved || !db) return;
    let left = false;
    // Lue pendant les 1,2 s, pour ne pas retarder le retour.
    const invite = inviteNeeded(needsBackupInvite(db));
    const timer = setTimeout(async () => {
      const showInvite = await invite;
      // Écran quitté pendant l'attente : rien.
      if (left) return;
      // Historique, même depuis l'appel sans créneau (pile : onglets → choix → appel).
      if (router.canDismiss()) router.dismissTo('/historique');
      else router.replace('/historique');
      if (showInvite) router.push('/invitation-sauvegarde');
    }, SAVED_DELAY_MS);
    return () => {
      left = true;
      clearTimeout(timer);
    };
  }, [saved, router, db]);
};
