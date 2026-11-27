// Appui sur une relance (ticket 028c, F-06, EX-28, SEC-11 ; zone sensible ; plan validé par le
// porteur le 2026-11-27) : ouvre l'appel du créneau à la date de la séance. Monté par le layout
// racine, qui ne se démonte pas.
// - Démarrage à froid : la dernière réponse du module n'est lue qu'une fois par lancement (B1) ;
//   sinon elle rouvrirait un appel périmé après Tout effacer ou une restauration.
// - Appli ouverte : l'événement d'appui du module.
// La cible attend que la pile soit montée (base prête, nettoyage du démarrage fini) ; elle est
// abandonnée si l'écran de récupération s'affiche. Un appui est ignoré pendant un effacement, une
// restauration ou un export (verrou commun), ou sur l'écran de récupération. Une cible hors format
// ou étrangère (CONV-14, SEC-12, validée par l'adaptateur) ne mène nulle part. Revue du 028c : une
// relance déjà traitée ne rouvre rien (double événement, double appui) ; un autre appel remplace
// celui qui est affiché, jamais deux écrans d'appel empilés.
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  lastReminderTarget,
  onReminderTarget,
  type ReminderTarget,
} from '@/data/expoNotifications';
import { type FileTask, fileLock } from '@/hooks/fileLock';

/** Ce que montre le layout racine : démarrage, écran de récupération, ou pile montée. */
export type TapStage = 'starting' | 'recovery' | 'ready';

let coldRead = false;
/** Dernière relance traitée (`slotId|date`, comme son identifiant) : jamais rouverte. */
let lastHandled: string | null = null;
// Le nettoyage du démarrage (`cleanup`) met l'appui en attente, comme la cible lue au démarrage.
const BLOCKING: readonly (FileTask | null)[] = ['erase', 'restore', 'export'];
const keyOf = (t: ReminderTarget) => `${t.slotId}|${t.date}`;

/** B1 : la cible du démarrage à froid, rendue au premier appel seulement. */
const coldTarget = (): ReminderTarget | null => {
  if (coldRead) return null;
  coldRead = true;
  return lastReminderTarget();
};

/** Tests seulement : un nouveau lancement de l'appli. */
export const resetReminderTapForTests = (): void => {
  coldRead = false;
  lastHandled = null;
};

export const useReminderTap = (stage: TapStage): void => {
  const [pending, setPending] = useState<ReminderTarget | null>(null);

  useEffect(() => {
    const cold = coldTarget();
    if (cold !== null) setPending(cold);
    return onReminderTarget((target) => {
      // Écran de récupération : la cible est abandonnée par l'effet qui suit.
      if (target !== null && !BLOCKING.includes(fileLock.holder())) setPending(target);
    });
  }, []);

  const onRollCall = usePathname() === '/appel';
  const { creneau, date } = useGlobalSearchParams<{ creneau?: string; date?: string }>();
  const shown = onRollCall ? `${creneau}|${date}` : null;
  useEffect(() => {
    if (pending === null || stage === 'starting') return;
    setPending(null);
    if (stage === 'recovery' || fileLock.holder() !== null) return;
    const key = keyOf(pending);
    if (key === lastHandled || key === shown) return;
    lastHandled = key;
    const url = `/appel?creneau=${pending.slotId}&date=${pending.date}` as const;
    if (onRollCall) router.replace(url);
    else router.push(url);
  }, [pending, stage, onRollCall, shown]);
};
