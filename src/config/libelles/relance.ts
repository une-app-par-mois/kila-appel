// Texte des relances (ticket 027, EX-28) : maquette « Relance sur l'écran verrouillé ».
// ABS-04, SEC-12 : le groupe seul, jamais un nom de membre ; aucune autre donnée.
// Réglage de la relance et demande de permission (ticket 029, EX-29) : maquettes « Réglage de la
// relance », « Demande de permission de notification » et ligne « Relance » de Paramètres.
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
  reminderSetting: {
    title: 'Relance',
    toggle: 'Me relancer si l’appel n’est pas fait',
    onDevice: 'Notification sur cet appareil, jamais envoyée ailleurs',
    /** Écart de maquette accepté par le porteur le 2026-11-27. */
    lockScreen: 'Le nom du groupe s’affiche sur l’écran verrouillé.',
    after: 'Après',
    afterStart: 'le début du créneau',
    delay: (n: number) => `${n} min`,
    delayTitle: 'Délai après le début du créneau',
    delayAccessibility: (n: number) => `Après ${n} min le début du créneau. Modifier`,
    deniedTitle: 'Notifications refusées dans les réglages du téléphone',
    deniedBody: 'La relance est activée ici mais ne peut pas s’afficher.',
    openSettings: 'Ouvrir les réglages du téléphone',
    /** Ligne « Relance » de Paramètres. */
    rowEnabled: (n: number) => `Activée · ${n} min`,
    rowDisabled: 'Désactivée',
    rowDenied: 'Refusée par le téléphone',
  },
  notificationPermission: {
    title: 'Autoriser les notifications ?',
    why: 'Pour vous relancer quand un appel n’est pas fait, l’appli doit afficher des notifications.',
    privacy: 'Elles nomment le groupe, jamais un membre. Rien n’est envoyé hors de l’appareil.',
    continue: 'Continuer',
    notNow: 'Pas maintenant',
  },
} as const;
