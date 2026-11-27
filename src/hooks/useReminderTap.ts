// Appui sur une relance (ticket 028c, F-06, EX-28, SEC-11 ; zone sensible ; plan validé par le
// porteur le 2026-11-27) : ouvre l'appel du créneau à la date de la séance. Monté par le layout
// racine, qui ne se démonte pas.
// - Démarrage à froid : la dernière réponse du module n'est lue qu'une fois par lancement (B1) ;
//   sinon elle rouvrirait un appel périmé après Tout effacer ou une restauration.
// - Appli ouverte : l'événement d'appui du module.
// La cible attend que la pile soit montée (base prête, nettoyage fini) ; elle est abandonnée si
// l'écran de récupération s'affiche. Un appui est ignoré pendant un effacement, une restauration
// ou un export (verrou commun), ou sur l'écran de récupération. Une cible hors format (CONV-14,
// type de `slotId` compris, validée par l'adaptateur) ne mène nulle part.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  lastReminderTarget,
  onReminderTarget,
  type ReminderTarget,
} from '@/data/expoNotifications';
import { fileLock } from '@/hooks/fileLock';

/** Ce que montre le layout racine : démarrage, écran de récupération, ou pile montée. */
export type TapStage = 'starting' | 'recovery' | 'ready';

let coldRead = false;

/** B1 : la cible du démarrage à froid, rendue au premier appel seulement. */
const coldTarget = (): ReminderTarget | null => {
  if (coldRead) return null;
  coldRead = true;
  return lastReminderTarget();
};

/** Tests seulement : un nouveau lancement de l'appli. */
export const resetReminderTapForTests = (): void => {
  coldRead = false;
};

export const useReminderTap = (stage: TapStage): void => {
  const [pending, setPending] = useState<ReminderTarget | null>(null);

  useEffect(() => {
    const cold = coldTarget();
    if (cold !== null) setPending(cold);
    return onReminderTarget((target) => {
      // Écran de récupération : la cible est abandonnée par l'effet qui suit.
      if (target !== null && fileLock.holder() === null) setPending(target);
    });
  }, []);

  useEffect(() => {
    if (pending === null || stage === 'starting') return;
    setPending(null);
    if (stage === 'recovery' || fileLock.holder() !== null) return;
    router.push(`/appel?creneau=${pending.slotId}&date=${pending.date}`);
  }, [pending, stage]);
};
