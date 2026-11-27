// Textes de l'Historique et du détail d'une séance (ticket 013, EX-16 à EX-18).

export const historique = {
  history: {
    title: 'Historique',
    groupFilter: 'Groupe',
    allGroups: 'Tous les groupes',
    /** Groupe d'une saison passée (« Toutes les saisons ») : sa saison le distingue. */
    groupOfSeason: (group: string, season: string) => `${group} · ${season}`,
    periodFilter: 'Période',
    /** Décision du porteur du 2026-11-27. */
    periods: {
      last30Days: '30 derniers jours',
      season: 'Saison active',
      allSeasons: 'Toutes les saisons',
    },
    /** Jour d'une ligne : « Lun. 24/11 ». */
    day: (weekday: string, date: string) => `${weekday} ${date}`,
    missingRow: (group: string) => `Appel manquant · ${group}`,
    /** « Lun. 24/11 · 18:00 ». */
    missingWhen: (day: string, time: string) => `${day} · ${time}`,
    /** « Mer. 19/11 · 19/22 présents » (RM-01 : Présent + Retard sur le total). */
    sessionWhen: (day: string, present: number, total: number) =>
      `${day} · ${present}/${total} ${present > 1 ? 'présents' : 'présent'}`,
    /** Groupe supprimé depuis la séance (EX-02). */
    removedGroup: 'Groupe supprimé',
    /** État vide (maquette « États vides », P1). */
    empty: 'Aucun appel enregistré. Votre premier appel apparaîtra ici.',
    start: 'Faire l’appel',
    noMatch: 'Aucun appel pour ces filtres.',
  },
  /** Détail d'une séance (maquettes Détail d'une séance, Suppression d'une séance, EX-18). */
  session: {
    /** « Mer. 19/11/2026 · 14:00 · enregistrée ». */
    subtitle: (day: string, date: string, time: string) => `${day} ${date} · ${time} · enregistrée`,
    help: 'Touchez un statut pour le corriger.',
    save: 'Enregistrer les corrections',
    delete: 'Supprimer la séance',
    deleteTitle: 'Supprimer cette séance ?',
    deleteMessage: (group: string | null, date: string, attendances: number) => {
      const call = group === null ? `L’appel du ${date}` : `L’appel de ${group} du ${date}`;
      if (attendances === 0) return `${call} sera effacé définitivement.`;
      const what = attendances === 1 ? 'sa présence' : `ses ${attendances} présences`;
      return `${call} et ${what} seront effacés définitivement.`;
    },
    /** Seulement si c'est vrai (décision du 2026-11-27). */
    reappears: 'La date réapparaîtra comme appel manquant.',
    keep: 'Garder',
    deleteConfirm: 'Supprimer définitivement',
  },
} as const;
