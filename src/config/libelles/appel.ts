// Textes de l'appel (tickets 010b, EX-09 à EX-15).

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export const appel = {
  /** EX-10 : libellé de chaque statut, toujours affiché avec son icône. */
  statuses: { present: 'Présent', absent: 'Absent', late: 'Retard', excused: 'Excusé' },
  /** En-tête de l'appel : « Mer. 18/11/2026 ». */
  weekdaysAbbr: ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'],
  rollCall: {
    entry: 'Nouvel appel',
    noSession: 'Aucune séance à proposer.',
    subtitle: (day: string, date: string, time: string, place: string | null) =>
      [`${day} ${date}`, time, place].filter(Boolean).join(' · '),
    /** Lecteur d'écran : nom et statut, puis ce que fait un appui. */
    row: (name: string, status: string) => `${name}, ${status}`,
    rowHint: 'Touchez pour passer au statut suivant',
    counter: {
      /**
       * RM-01 (décision du porteur du 2026-11-27) : « 19 présents dont 2 retards », retards compris
       * dans les présents, comme la ligne « 19/22 présents » de l'Historique ; sans retard,
       * « 19 présents ».
       */
      attending: (present: number, late: number) =>
        late === 0
          ? plural(present, 'présent', 'présents')
          : `${plural(present, 'présent', 'présents')} dont ${plural(late, 'retard', 'retards')}`,
      absent: (n: number) => plural(n, 'absent', 'absents'),
      excused: (n: number) => plural(n, 'excusé', 'excusés'),
    },
    search: 'Rechercher un membre',
    searchPlaceholder: 'Rechercher',
    noMember: 'Ce groupe n’a aucun membre à appeler.',
    comment: 'Commentaire de la séance',
    optional: 'facultatif',
    addMember: 'Ajouter un membre',
    save: 'Enregistrer l’appel',
    saved: 'Appel enregistré',
  },
  /** Brouillon d'appel (maquettes Accueil avec un appel interrompu, Abandon, EX-14, ticket 011). */
  draft: {
    title: 'Appel en cours',
    summary: (group: string, startedAt: string, absents: string) =>
      `${group} · commencé à ${startedAt} · ${absents}`,
    absents: (n: number) =>
      n === 0 ? 'aucun absent noté' : n === 1 ? '1 absent noté' : `${n} absents notés`,
    /** Groupe supprimé depuis : le brouillon peut seulement être abandonné. */
    removedGroup: 'groupe supprimé',
    unresumable:
      'Ce groupe n’est plus actif : cet appel ne peut plus être repris, seulement abandonné.',
    resume: 'Reprendre l’appel',
    abandon: 'Abandonner',
    abandonTitle: 'Abandonner l’appel en cours ?',
    abandonMessage: (group: string) =>
      `Les statuts déjà notés pour ${group} seront perdus. Aucune séance ne sera enregistrée.`,
    keep: 'Revenir',
    abandonConfirm: 'Abandonner',
    savedOnEachTap: 'Brouillon enregistré à chaque appui',
    writeFailed:
      'Le brouillon n’a pas pu être enregistré : l’appel continue, enregistrez-le avant de quitter.',
    inProgress: (group: string, date: string) =>
      `Un appel est en cours : ${group}, ${date}. Reprenez-le ou abandonnez-le depuis l’accueil.`,
  },
  /** Appel sans créneau (maquette, EX-39, ticket 010c). */
  freeRollCall: {
    title: 'Nouvel appel',
    help: 'Aucun créneau en cours. Choisissez le groupe et la date.',
    group: 'Groupe',
    date: 'Date',
    noSeason: 'Aucune saison active : créez-en une dans Saisons.',
    noGroup: 'Aucun groupe dans la saison active.',
    /** Un appel du groupe existe déjà ce jour-là : prévenir, laisser choisir (décision du 2026-11-27). */
    duplicateTitle: 'Appel déjà fait ce jour-là',
    duplicateMessage: (group: string, date: string) =>
      `Un appel de ${group} est déjà enregistré le ${date}. En faire un autre ?`,
    duplicateConfirm: 'Faire un autre appel',
  },
} as const;
