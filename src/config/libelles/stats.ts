// Textes de l'onglet Statistiques et du choix d'une période (ticket 024, EX-27, RM-01).

export const stats = {
  stats: {
    title: 'Statistiques',
    /** Puces de période (maquette) ; « Saison » masquée sans saison active. */
    periods: { season: 'Saison', month: 'Ce mois', custom: 'Dates…' },
    /** Période appliquée, toujours affichée sous les puces (décision du porteur du 2026-11-27). */
    periodShown: (from: string, to: string) => `Du ${from} au ${to}`,
    rate: 'Taux de présence',
    sessions: 'Séances',
    byGroup: 'Par groupe',
    /** Groupe archivé ou d'une autre saison (décision du porteur du 2026-11-27). */
    archived: 'Archivé',
    noSession: 'Aucune séance sur la période.',
    empty: 'Pas encore de statistiques : elles apparaissent après le premier appel enregistré.',
    start: "Faire l'appel",
    /** Barre par statut, lue par le lecteur d'écran (NF-06) : « 84 % présent, 7 % retard ». */
    share: (rate: string, status: string) => `${rate} ${status.toLocaleLowerCase('fr-FR')}`,
    periodScreen: {
      title: 'Période',
      from: 'Du',
      to: 'Au',
      placeholder: 'JJ/MM/AAAA',
      apply: 'Appliquer',
    },
  },
} as const;
