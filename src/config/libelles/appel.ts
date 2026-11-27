// Textes de l'appel (tickets 010b, EX-09 à EX-15).

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export const appel = {
  /** EX-10 : libellé de chaque statut, toujours affiché avec son icône. */
  statuses: { present: 'Présent', absent: 'Absent', late: 'Retard', excused: 'Excusé' },
  /** En-tête de l'appel : « Mer. 18/11/2026 ». */
  weekdaysAbbr: ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'],
  rollCall: {
    entry: 'Nouvel appel',
    /** Accueil : séance proposée (EX-09). */
    proposed: (group: string, day: string, date: string, time: string) =>
      `${group} · ${day} ${date} ${time}`,
    proposedRecorded: (group: string, day: string, date: string, time: string) =>
      `${group} · ${day} ${date} ${time} · appel enregistré`,
    noSession: 'Aucune séance à proposer.',
    subtitle: (day: string, date: string, time: string, place: string | null) =>
      [`${day} ${date}`, time, place].filter(Boolean).join(' · '),
    /** Lecteur d'écran : nom et statut, puis ce que fait un appui. */
    row: (name: string, status: string) => `${name}, ${status}`,
    rowHint: 'Touchez pour passer au statut suivant',
    counter: {
      present: (n: number) => plural(n, 'présent', 'présents'),
      absent: (n: number) => plural(n, 'absent', 'absents'),
      late: (n: number) => plural(n, 'retard', 'retards'),
      excused: (n: number) => plural(n, 'excusé', 'excusés'),
    },
    search: 'Rechercher un membre',
    searchPlaceholder: 'Rechercher',
    noMember: 'Aucun membre inscrit à ce groupe à cette date.',
    noMatch: 'Aucun membre ne correspond.',
    comment: 'Commentaire de la séance',
    optional: 'facultatif',
    save: 'Enregistrer l’appel',
    saved: 'Appel enregistré',
  },
} as const;
