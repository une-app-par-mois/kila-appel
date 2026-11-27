// Libellés des saisons et des groupes (EX-01, EX-02, CONV-03).
import { joinFr, plural } from './outils';

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
const GROUP_NOTHING_ELSE = 'Seul le groupe sera effacé : il n’a ni inscription ni lien.';
/** Nom de l'appel en cours dans les confirmations de suppression (décision du 2026-11-27). */
export const ROLL_CALL_DRAFT = 'l’appel en cours (non enregistré)';

/** Ce que la suppression d'un groupe effacera (EX-02, ARCHITECTURE §4.1). */
export type GroupDeletionCounts = {
  enrollments: number;
  slots: number;
  sessions: number;
  rollCallDraft: boolean;
};

export const organisation = {
  groups: {
    title: 'Groupes',
    archivedTitle: 'Groupes archivés',
    create: 'Nouveau groupe',
    createFirst: 'Créer un groupe',
    empty: 'Aucun groupe dans cette saison.',
    emptyArchived: 'Aucun groupe archivé.',
    showArchived: (n: number) => `Voir les groupes archivés (${n})`,
    noActiveSeason: 'Aucune saison active. Activez ou créez une saison pour y ranger vos groupes.',
    toSeasons: 'Voir les saisons',
  },
  groupForm: {
    newTitle: 'Nouveau groupe',
    editTitle: 'Modifier le groupe',
    name: 'Nom du groupe',
    attachedTo: (season: string) => `Rattaché à la saison active : ${season}.`,
    next: 'Ensuite : ajouter ses membres, puis déclarer son créneau.',
    create: 'Créer le groupe',
    delete: 'Supprimer le groupe',
  },
  group: {
    edit: 'Renommer ou supprimer',
    /** Saison suivie du séparateur, avant le lien « Renommer ou supprimer ». */
    seasonOf: (season: string) => `${season} · `,
    noMember: 'Personne n’est encore inscrit à ce groupe.',
    archive: 'Archiver',
    unarchive: 'Désarchiver',
    /** Suivi du séparateur, avant le lien « Renommer ou supprimer ». */
    memberCount: (n: number) => `${plural(n, 'membre inscrit', 'membres inscrits')} · `,
    /** « Inscrit depuis le …, jusqu’au … » quand un retrait est prévu. */
    period: (since: string, until: string | null) =>
      until === null
        ? `Inscrit depuis le ${since}`
        : `Inscrit depuis le ${since}, jusqu’au ${until}`,
    upcoming: 'À venir',
    from: (date: string) => `À partir du ${date}`,
    addMembers: 'Ajouter des membres',
  },
  groupDeletion: {
    title: (name: string) => `Supprimer ${name} ?`,
    message: (c: GroupDeletionCounts) => {
      const links = [
        c.slots > 0 && `à ${plural(c.slots, 'créneau', 'créneaux')}`,
        c.sessions > 0 && `à ${plural(c.sessions, 'séance', 'séances')}`,
      ].filter((part): part is string => typeof part === 'string');
      const parts = [
        c.enrollments === 1 && 'son inscription',
        c.enrollments > 1 && `ses ${c.enrollments} inscriptions`,
        links.length > 0 && `ses liens ${links.join(' et ')}`,
      ].filter((part): part is string => typeof part === 'string');
      const main =
        parts.length === 0
          ? GROUP_NOTHING_ELSE
          : `Seront effacés définitivement : ${parts.join(' et ')}.`;
      // Phrase à part : la liste des liens contient déjà « et » (décision du 2026-11-27).
      return c.rollCallDraft
        ? `${main} L’appel en cours (non enregistré) sera aussi effacé.`
        : main;
    },
    nothingElse: GROUP_NOTHING_ELSE,
    kept: 'Les séances, leurs présences et les membres sont conservés. Pour le retirer des écrans sans rien effacer, utilisez plutôt « Archiver ».',
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
        c.rollCallDraft && ROLL_CALL_DRAFT,
      ].filter((part): part is string => typeof part === 'string');
      return parts.length === 0
        ? NOTHING_ELSE
        : `Seront effacés définitivement : ${joinFr(parts)}.`;
    },
    nothingElse: NOTHING_ELSE,
    kept: 'Les membres sont conservés.',
  },
} as const;
