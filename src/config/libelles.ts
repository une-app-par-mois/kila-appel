// Tous les textes de l'interface (CONV-03) : aucun texte en dur dans un écran.
// Les libellés de statut et d'état de séance viennent des jetons de la charte.
import jetons from '../../design/jetons.json';

/** « a », « a et b », « a, b et c ». */
const joinFr = (parts: string[]): string =>
  parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}`;
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Ce que la cascade effacera, tel que le dépôt le compte (EX-01). */
export type SeasonDeletionCounts = {
  groups: number;
  enrollments: number;
  slots: number;
  sessions: number;
  attendances: number;
  rollCallDraft: boolean;
};

const NOTHING_ELSE = 'Seule la saison sera effacée : elle ne contient aucune donnée.';

export const labels = {
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
    deleteForever: 'Supprimer définitivement',
    loadFailed: 'Les données n’ont pas pu être lues. Fermez puis rouvrez l’appli.',
  },
  settings: {
    title: 'Paramètres',
    organisation: 'Organisation',
    seasons: 'Saisons',
    activeSeason: (name: string) => `Active : ${name}`,
    noActiveSeason: 'Aucune saison active',
  },
  seasons: {
    title: 'Saisons',
    active: 'Active',
    activate: 'Activer',
    create: 'Nouvelle saison',
    empty: 'Aucune saison. Créez-en une pour y ranger vos groupes et vos appels.',
    period: (start: string, end: string) => `${start} – ${end}`,
  },
  seasonForm: {
    title: 'Saison',
    name: 'Nom',
    start: 'Début',
    end: 'Fin',
    datePlaceholder: 'JJ/MM/AAAA',
    delete: 'Supprimer la saison',
  },
  seasonDeletion: {
    title: (name: string) => `Supprimer ${name} ?`,
    message: (c: SeasonDeletionCounts) => {
      const parts = [
        c.groups > 0 && plural(c.groups, 'groupe', 'groupes'),
        c.enrollments > 0 && plural(c.enrollments, 'inscription', 'inscriptions'),
        c.slots > 0 && plural(c.slots, 'créneau', 'créneaux'),
        c.sessions > 0 && plural(c.sessions, 'séance', 'séances'),
        c.attendances > 0 && plural(c.attendances, 'présence', 'présences'),
        c.rollCallDraft && 'l’appel en cours',
      ].filter((part): part is string => typeof part === 'string');
      return parts.length === 0
        ? NOTHING_ELSE
        : `Seront effacés définitivement : ${joinFr(parts)}.`;
    },
    nothingElse: NOTHING_ELSE,
    kept: 'Les membres sont conservés.',
  },
  /** Erreurs attendues, sans terme technique (CONV-15). */
  errors: {
    NAME_REQUIRED: 'Indiquez un nom.',
    DATE_INVALID: 'Date à écrire sous la forme JJ/MM/AAAA.',
    END_BEFORE_START: 'La fin doit tomber le jour du début ou après.',
    SESSIONS_OUTSIDE_SEASON: 'Des séances ont déjà eu lieu hors de ces dates.',
    NOT_FOUND: 'Cet élément n’existe plus.',
    unknown: 'L’opération a échoué. Réessayez.',
  },
  sessionStates: {
    cancelled: jetons.etatsSeance.cancelled.libelle,
    unscheduled: jetons.etatsSeance.unscheduled.libelle,
  },
} as const;
