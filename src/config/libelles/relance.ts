// Texte des relances (ticket 027, EX-28) : maquette « Relance sur l'écran verrouillé ».
// ABS-04, SEC-12 : le groupe seul, jamais un nom de membre ; aucune autre donnée.
import { joinFr } from './outils';

export const relance = {
  reminder: {
    /** Canal Android des relances (ticket 028b), visible dans les réglages du téléphone. */
    channel: 'Relances',
    /** « Appel non fait : Poussins mercredi » ; plusieurs groupes joints (F-11). */
    title: (groupNames: string[]) => `Appel non fait : ${joinFr(groupNames)}`,
    /** « Le créneau a commencé à 14:00. » */
    body: (startTime: string) => `Le créneau a commencé à ${startTime}.`,
  },
} as const;
