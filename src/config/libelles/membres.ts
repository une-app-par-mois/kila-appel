// Libellés des membres, inscriptions et contacts d'urgence (EX-03 à EX-06, CONV-03).
import { plural } from './outils';

/** Ce que la suppression d'un membre effacera (EX-03, ABS-05). */
export type MemberDeletionCounts = {
  contacts: number;
  attendances: number;
  enrollments: number;
  rollCallDraft: boolean;
  hasBirthDate: boolean;
};

export const membres = {
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
    /** Recherche sans résultat (maquette « États vides »). */
    noMatch: (query: string) => `Aucun membre ne correspond à « ${query} ».`,
    noMatchHint: 'Vérifiez l’orthographe, ou cherchez par le prénom.',
    /** Filtre de groupe sans recherche saisie : la maquette n'a pas ce cas. */
    noMatchGroup: 'Aucun membre dans ce groupe.',
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
    /** Ajout pendant l'appel (EX-12) : inscrit à la date de la séance, `null` = aujourd'hui. */
    rollCallNote: (group: string, date: string | null) =>
      `Il sera inscrit à « ${group} » à partir ${date === null ? 'd’aujourd’hui' : `du ${date}`}.`,
    rollCallCreate: 'Ajouter et revenir à l’appel',
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
        c.rollCallDraft && 'son statut dans l’appel en cours',
      ].filter((part): part is string => typeof part === 'string');
      return `Seront effacés définitivement : ${parts.join(' ; ')}.`;
    },
    kept: 'Pour le retirer des listes sans rien effacer, utilisez plutôt « Archiver ».',
  },
  enrollment: {
    title: (group: string) => `Ajouter à ${group}`,
    startDate: 'À partir du',
    newMember: 'Nouveau membre',
    submit: (n: number) => (n === 0 ? 'Inscrire' : `Inscrire ${plural(n, 'membre', 'membres')}`),
    noCandidate: 'Tous les membres sont déjà inscrits à ce groupe.',
  },
  contacts: {
    title: 'Contacts d’urgence',
    none: (member: string) => `Aucun contact d’urgence pour ${member}.`,
    add: 'Ajouter un contact',
    /** Poignée ≡ : glisser, ou actions du lecteur d'écran. */
    handle: (contact: string) => `Déplacer ${contact}`,
    moveUp: 'Monter',
    moveDown: 'Descendre',
  },
  contactForm: {
    title: 'Contact d’urgence',
    label: 'Qui est-ce ?',
    phone: 'Téléphone',
    delete: 'Supprimer ce contact',
  },
  emergency: {
    title: 'Contact d’urgence',
    entry: 'Contact d’urgence : rechercher un membre',
    search: 'Rechercher un membre',
    call: 'Appeler',
    callLabel: (contact: string) => `Appeler ${contact}`,
    callFailed: 'L’appel n’a pas pu s’ouvrir sur cet appareil.',
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
} as const;
