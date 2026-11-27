// Après l'enregistrement d'un appel (EX-15) : « Appel enregistré » reste affiché un instant, puis
// retour à l'Historique, où la séance apparaît (note de la maquette Appel, ticket 013).
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/** Durée d'affichage de « Appel enregistré » avant le retour (maquette : 1,2 s). */
const SAVED_DELAY_MS = 1200;

export const useSavedReturn = (saved: boolean) => {
  const router = useRouter();
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(
      // Historique, même depuis l'appel sans créneau (pile : onglets → choix → appel).
      () => (router.canDismiss() ? router.dismissTo('/historique') : router.replace('/historique')),
      SAVED_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [saved, router]);
};
