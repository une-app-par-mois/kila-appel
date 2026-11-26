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
const GROUP_NOTHING_ELSE = 'Seul le groupe sera effacé : il n’a ni inscription ni lien.';

/** Ce que la suppression d'un groupe effacera (EX-02, ARCHITECTURE §4.1). */
export type GroupDeletionCounts = { enrollments: number; slots: number; sessions: number };

/** Ce que la suppression d'un membre effacera (EX-03, ABS-05). */
export type MemberDeletionCounts = {
  contacts: number;
  attendances: number;
  enrollments: number;
  hasBirthDate: boolean;
};

/** Maquette : la licence seule dans la liste, écrite en entier pour les polices. */
const licenceName = (e: { license: string }) =>
  e.license === 'OFL-1.1' ? 'SIL Open Font License 1.1' : e.license;

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
    groups: 'Groupes',
    about: 'À propos',
    licences: 'Licences',
    groupCount: (n: number) => (n === 0 ? 'Aucun groupe' : plural(n, 'groupe', 'groupes')),
    members: 'Membres',
    memberCount: (n: number) => (n === 0 ? 'Aucun membre' : plural(n, 'membre', 'membres')),
  },
  members: {
    title: 'Membres',
    search: 'Rechercher un membre',
    allGroups: 'Tous les groupes',
    groupFilter: 'Groupe',
    archived: (n: number) => `Archivés (${n})`,
    noGroup: 'Aucun groupe',
    create: 'Nouveau membre',
    empty: 'Aucun membre pour l’instant.',
    emptyArchived: 'Aucun membre archivé.',
    noMatch: 'Aucun membre ne correspond à la recherche.',
  },
  memberForm: {
    createTitle: 'Nouveau membre',
    firstName: 'Prénom',
    lastName: 'Nom',
    birthDate: 'Date de naissance',
    datePlaceholder: 'JJ/MM/AAAA',
    optionalFeminine: 'facultative',
    optionalMasculine: 'facultatif',
    group: 'Groupe',
    noGroup: 'Aucun groupe',
    create: 'Créer le membre',
    contactsLater: 'Les contacts d’urgence s’ajoutent ensuite depuis sa fiche.',
    fullName: (firstName: string, lastName: string) => `${firstName} ${lastName}`,
    archive: 'Archiver',
    unarchive: 'Désarchiver',
    delete: 'Supprimer',
  },
  memberDeletion: {
    title: (name: string) => `Supprimer ${name} ?`,
    message: (c: MemberDeletionCounts) => {
      const parts = [
        c.hasBirthDate ? 'sa fiche et sa date de naissance' : 'sa fiche',
        c.contacts === 1 && 'son contact d’urgence',
        c.contacts > 1 && `ses ${c.contacts} contacts d’urgence`,
        c.attendances === 1 && 'sa présence',
        c.attendances > 1 && `ses ${c.attendances} présences`,
        c.enrollments === 1 && 'son inscription',
        c.enrollments > 1 && `ses ${c.enrollments} inscriptions`,
      ].filter((part): part is string => typeof part === 'string');
      return `Seront effacés définitivement : ${parts.join(' ; ')}.`;
    },
    kept: 'Pour le retirer des listes sans rien effacer, utilisez plutôt « Archiver ».',
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
  enrollment: {
    title: (group: string) => `Ajouter à ${group}`,
    startDate: 'À partir du',
    newMember: 'Nouveau membre',
    submit: (n: number) => (n === 0 ? 'Inscrire' : `Inscrire ${plural(n, 'membre', 'membres')}`),
    noCandidate: 'Tous les membres sont déjà inscrits à ce groupe.',
  },
  memberGroups: {
    title: 'Groupes',
    period: (since: string, until: string | null) =>
      until === null ? `Depuis le ${since}` : `Depuis le ${since}, jusqu’au ${until}`,
    withdraw: 'Retirer',
    /** Inscription à venir : elle s'annule (décision du porteur du 2026-11-26). */
    cancel: 'Annuler',
    add: 'Ajouter à un groupe',
    none: 'Inscrit à aucun groupe de la saison active.',
  },
  withdrawal: {
    title: (member: string, group: string) => `Retirer ${member} de ${group} ?`,
    date: 'Il n’apparaîtra plus dans l’appel de ce groupe à partir du :',
    kept: 'Ses présences passées sont conservées.',
    cancel: 'Annuler',
    confirm: 'Retirer du groupe',
  },
  cancellation: {
    title: (member: string, group: string) => `Annuler l’inscription de ${member} à ${group} ?`,
    message: 'Elle n’a pas encore commencé : elle est effacée.',
    confirm: 'Annuler l’inscription',
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
      return parts.length === 0
        ? GROUP_NOTHING_ELSE
        : `Seront effacés définitivement : ${parts.join(' et ')}.`;
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
    DATE_IN_FUTURE: 'Cette date est dans le futur.',
    END_BEFORE_START: 'La fin doit tomber le jour du début ou après.',
    PHONE_INVALID: 'Numéro à 10 chiffres commençant par 0, ou +33 suivi de 9 chiffres.',
    ALREADY_ENROLLED: 'Un des membres est déjà inscrit à ce groupe.',
    SESSIONS_OUTSIDE_SEASON: 'Des séances ont déjà eu lieu hors de ces dates.',
    NOT_FOUND: 'Cet élément n’existe plus.',
    unknown: 'L’opération a échoué. Réessayez.',
  },
  sessionStates: {
    cancelled: jetons.etatsSeance.cancelled.libelle,
    unscheduled: jetons.etatsSeance.unscheduled.libelle,
  },
} as const;
