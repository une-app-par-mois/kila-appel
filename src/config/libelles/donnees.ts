// Textes des écrans Sauvegarde et Restauration (tickets 014b et 014e, EX-19, EX-20, EX-21, SEC-09,
// ABS-06).
import { plural } from './outils';

/** Dernière sauvegarde : jours écoulés et date affichée (JJ/MM/AAAA), ou null si aucune. */
export type LastBackup = { days: number; date: string } | null;

/** « aujourd'hui », « hier », « il y a 34 jours » ; une date à venir (horloge changée) : « le … ». */
const since = ({ days, date }: { days: number; date: string }) => {
  if (days === 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  return days > 1 ? `il y a ${days} jours` : `le ${date}`;
};

export const donnees = {
  backup: {
    title: 'Sauvegarde',
    /**
     * SEC-09, ABS-06 : avertissement de la maquette, au caractère près, jamais réduit. « en clair »
     * est en gras ; le texte se lit d'un bloc.
     */
    warningTitle: 'Ce fichier n’est pas protégé',
    warningBefore:
      'Il contient les noms, dates de naissance et contacts d’urgence de vos membres, et toutes leurs présences, ',
    warningStrong: 'en clair',
    warningAfter:
      '. Toute personne qui l’obtient peut les lire. Gardez-le en lieu sûr : sa garde vous revient.',
    export: 'Exporter une sauvegarde',
    last: (last: LastBackup) =>
      last === null ? 'Aucune sauvegarde pour l’instant.' : `Dernière sauvegarde : ${since(last)}.`,
    /** Ligne de Paramètres (maquette : « Dernière : il y a 34 jours »). */
    settingsRow: (last: LastBackup) =>
      last === null ? 'Aucune sauvegarde' : `Dernière : ${since(last)}`,
    exportFailed: 'La sauvegarde n’a pas pu être exportée. Réessayez.',
  },
  restore: {
    /** Section de l'écran Sauvegarde (maquette « Sauvegarde et données »). */
    section: 'Restaurer',
    introBefore: 'Remplace ',
    introStrong: 'toutes',
    introAfter:
      ' les données de l’appareil par celles du fichier. Le fichier est vérifié avant tout changement.',
    choose: 'Choisir un fichier…',
    /** Écran Restauration (maquette « Restaurer ? »). */
    title: 'Restaurer ?',
    /** Pendant la vérification du fichier (réponse du porteur du 2026-11-27). */
    verifying: 'Vérification du fichier…',
    /** Date de la sauvegarde (JJ/MM/AAAA), ou null si le fichier n'en porte pas. */
    backupOf: (date: string | null) => (date === null ? 'Sauvegarde' : `Sauvegarde du ${date}`),
    counts: (members: number, groups: number, sessions: number) =>
      [
        plural(members, 'membre', 'membres'),
        plural(groups, 'groupe', 'groupes'),
        plural(sessions, 'séance', 'séances'),
      ].join(' · '),
    replaceBefore: 'Toutes les données actuelles de l’appareil seront ',
    replaceStrong: 'remplacées',
    replaceAfter: ' par celles de ce fichier.',
    /** Appel en cours sur l'appareil, remplacé lui aussi ; groupe inconnu : sans nom. */
    draft: (group: string | null) =>
      group === null
        ? 'L’appel en cours sera aussi remplacé.'
        : `L’appel en cours (${group}) sera aussi remplacé.`,
    cancel: 'Annuler',
    confirm: 'Remplacer mes données',
    /** Messages d'un refus ou d'un échec (décision du porteur du 2026-11-27). */
    notABackup: 'Ce fichier n’est pas une sauvegarde Ki&La',
    damaged: 'Cette sauvegarde est abîmée ou a été modifiée',
    newerVersion:
      'Cette sauvegarde vient d’une version plus récente de l’appli : mettez l’appli à jour',
    failed: 'La restauration n’a pas abouti',
    nothingChanged: 'Rien n’a été modifié. Choisissez un autre fichier.',
  },
};
