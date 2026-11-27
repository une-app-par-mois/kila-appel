// Textes de la barre d'onglets et de l'accueil (ticket 012, EX-09, EX-17), rappels de sauvegarde
// (ticket 014d, EX-21).

export const accueil = {
  /** Barre d'onglets (maquette) : seulement les écrans existants (décision du 2026-11-27). */
  tabs: {
    label: 'Navigation',
    home: 'Accueil',
    stats: 'Stats',
    newRollCall: 'Nouvel appel',
    history: 'Historique',
    settings: 'Paramètres',
  },
  /** Bienvenue (maquette, P1, ticket 012b) : un seul bouton, sur la première étape qui reste. */
  welcome: {
    title: 'Bienvenue',
    intro: 'Quatre étapes avant votre premier appel.',
    season: 'Créer la saison',
    seasonCreated: (name: string) => `Saison ${name}, créée automatiquement`,
    noSeason: 'Aucune saison',
    noActiveSeason: 'Aucune saison active',
    chooseSeason: 'Choisir la saison active',
    createSeason: 'Créer la saison',
    group: 'Créer un groupe',
    groupHint: 'Par exemple « Poussins mercredi »',
    createGroup: 'Créer un groupe',
    members: 'Ajouter les membres',
    addMembers: 'Ajouter des membres',
    slots: 'Déclarer les créneaux',
    addSlots: 'Déclarer les créneaux',
    done: 'Fait',
  },
  home: {
    months: [
      'janv.',
      'févr.',
      'mars',
      'avr.',
      'mai',
      'juin',
      'juil.',
      'août',
      'sept.',
      'oct.',
      'nov.',
      'déc.',
    ],
    /** Titre : « Mercredi 26 nov. ». */
    title: (weekday: string, day: number, month: string) => `${weekday} ${day} ${month}`,
    now: 'Maintenant',
    /** « 17:30 – 19:00 · Gymnase · 22 membres ». */
    session: (start: string, end: string, place: string | null, members: number) =>
      [`${start} – ${end}`, place, members === 1 ? '1 membre' : `${members} membres`]
        .filter(Boolean)
        .join(' · '),
    start: 'Faire l’appel',
    recorded: 'Appel enregistré',
    missing: 'Appels manquants',
    /** « Lundi 24 nov. · 18:00 ». */
    missingRow: (weekday: string, day: number, month: string, time: string) =>
      `${weekday} ${day} ${month} · ${time}`,
    /** Au-delà des 5 plus récents (décision du 2026-11-27). */
    more: (n: number) => (n === 1 ? 'et 1 autre' : `et ${n} autres`),
    /** Bandeau (maquette Accueil) : au moins 30 jours, toujours au pluriel. */
    backupBanner: (days: number) => `Pas de sauvegarde depuis ${days} jours`,
    backupBannerText: 'Vos données ne vivent que sur cet appareil.',
    backupNow: 'Sauvegarder maintenant',
  },
  /** Invitation à sauvegarder (maquette), une seule fois, après le premier appel enregistré. */
  backupInvite: {
    title: 'Premier appel enregistré',
    cardTitle: 'Pensez à sauvegarder',
    text:
      'Vos données ne vivent que sur cet appareil. Si vous le perdez ou le changez, seule une ' +
      'sauvegarde permet de les retrouver.',
    saveNow: 'Sauvegarder maintenant',
    later: 'Plus tard',
  },
} as const;
