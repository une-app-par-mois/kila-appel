// Textes de l'écran Sauvegarde (ticket 014b, EX-19, EX-21, SEC-09, ABS-06).

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
};
