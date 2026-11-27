// Libellés communs : statuts, actions, Paramètres, licences, erreurs (CONV-03).
// Les libellés de statut et d'état de séance viennent des jetons de la charte.
import jetons from '../../../design/jetons.json';
import { plural } from './outils';

/** Maquette : la licence seule dans la liste, écrite en entier pour les polices. */
const licenceName = (e: { license: string }) =>
  e.license === 'OFL-1.1' ? 'SIL Open Font License 1.1' : e.license;

export const commun = {
  appName: 'Ki&La',
  statuses: {
    present: jetons.statuts.present.libelle,
    absent: jetons.statuts.absent.libelle,
    late: jetons.statuts.late.libelle,
    excused: jetons.statuts.excused.libelle,
    preparedPresent: jetons.statuts.preparedPresent.libelle,
  },
  /** Libellé lu par le lecteur d'écran pour une ligne de liste à sous-titre. */
  rowAccessibility: (title: string, subtitle: string) => `${title}, ${subtitle}`,
  common: {
    back: 'Retour',
    save: 'Enregistrer',
    keep: 'Garder',
    cancel: 'Annuler',
    deleteForever: 'Supprimer définitivement',
    loadFailed: 'Les données n’ont pas pu être lues. Fermez puis rouvrez l’appli.',
  },
  settings: {
    title: 'Paramètres',
    organisation: 'Organisation',
    seasons: 'Saisons',
    activeSeason: (name: string) => `Active : ${name}`,
    noActiveSeason: 'Aucune saison active',
    groups: 'Groupes',
    about: 'À propos',
    licences: 'Licences',
    groupCount: (n: number) => (n === 0 ? 'Aucun groupe' : plural(n, 'groupe', 'groupes')),
    members: 'Membres',
    memberCount: (n: number) => (n === 0 ? 'Aucun membre' : plural(n, 'membre', 'membres')),
    slots: 'Créneaux',
  },
  licences: {
    title: 'Licences',
    generated: 'Liste générée depuis les dépendances réellement embarquées',
    subtitle: licenceName,
    detailSubtitle: (e: { license: string; version: string }) =>
      e.version === '' ? licenceName(e) : `${licenceName(e)} · ${e.version}`,
    missingText: (license: string, author?: string) =>
      `Ce paquet ne fournit pas le texte de sa licence. Licence : ${license}${author ? ` · ${author}` : ''}.`,
  },
  /** Erreurs attendues, sans terme technique (CONV-15). */
  errors: {
    NAME_REQUIRED: 'Indiquez un nom.',
    DATE_INVALID: 'Date à écrire sous la forme JJ/MM/AAAA.',
    DATE_IN_FUTURE: 'Cette date est dans le futur.',
    DATE_OUTSIDE_SEASON: 'Cette date est en dehors de la saison.',
    END_BEFORE_START: 'La fin doit tomber le jour du début ou après.',
    WEEKDAY_INVALID: 'Choisissez un jour.',
    TIME_INVALID: 'Heure à écrire sous la forme HH:MM.',
    DURATION_INVALID: 'Durée de 1 min à 24 h, sous la forme « 1 h 30 » ou en minutes.',
    GROUP_REQUIRED: 'Choisissez un groupe.',
    STATUS_INVALID: 'Statut de présence inconnu.',
    COMMENT_TOO_LONG: '500 caractères au plus.',
    ALREADY_RECORDED: 'L’appel de cette séance est déjà enregistré.',
    SLOT_INVALID: 'Créneau introuvable.',
    NOT_A_SLOT_SESSION: 'Ce créneau n’a pas lieu à cette date et à cette heure.',
    DRAFT_IN_PROGRESS: 'Un autre appel est en cours.',
    NOT_ENROLLED: 'Un membre de la liste n’est pas inscrit au groupe à cette date.',
    PHONE_INVALID: 'Numéro à 10 chiffres commençant par 0, ou +33 suivi de 9 chiffres.',
    ALREADY_ENROLLED: 'Un des membres est déjà inscrit à ce groupe.',
    SESSIONS_OUTSIDE_SEASON: 'Des séances ont déjà eu lieu hors de ces dates.',
    ENROLLMENTS_OUTSIDE_SEASON: 'Des inscriptions commencent hors de ces dates.',
    NOT_FOUND: 'Cet élément n’existe plus.',
    unknown: 'L’opération a échoué. Réessayez.',
  },
  sessionStates: {
    cancelled: jetons.etatsSeance.cancelled.libelle,
    unscheduled: jetons.etatsSeance.unscheduled.libelle,
  },
} as const;
