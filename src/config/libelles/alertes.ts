// Textes des alertes d'assiduité (ticket 022, F-04, EX-25, EX-26) : section de l'accueil, écran
// de l'alerte, réglage du seuil et ligne de Paramètres. Le seuil vaut 2 au moins : « absences »
// toujours au pluriel (« 1 absence » n'existe pas).

export const alertes = {
  alerts: {
    section: 'Alertes d’assiduité',
    /** Maquette « États vides du lot 2 », avec le seuil réglé. */
    empty: (threshold: number) =>
      `Aucune alerte : personne n’a manqué ${threshold} séances de suite.`,
    absences: (n: number) => `${n} absences`,
    more: (n: number) => (n === 1 ? 'et 1 autre' : `et ${n} autres`),
    /** Écran de l'alerte (maquette « Alerte d'assiduité »). */
    subtitle: (groupName: string, n: number) =>
      `${groupName} · ${n} absences non excusées de suite`,
    recent: 'Dernières séances',
    recentOrder: 'De la plus récente à la plus ancienne.',
    /** Case d'une séance : statut et date, lus ensemble (NF-06). */
    square: (status: string, date: string) => `${status}, ${date}`,
    contacts: 'Voir ses contacts d’urgence',
    acknowledge: 'Marquer comme traitée',
    /** Réglage (maquette « Réglage des alertes d'assiduité »). */
    settingTitle: 'Alertes d’assiduité',
    alertAfter: 'Alerter après',
    absencesInARow: 'absences de suite',
    onlyUnexcused: 'Seules les absences non excusées comptent.',
    choiceTitle: 'Nombre d’absences de suite',
    choice: (n: number) => `${n} absences`,
    choiceAccessibility: (n: number) => `Alerter après ${n} absences de suite. Modifier`,
    /** Paramètres : section « Réglages » (la ligne Relance arrive au ticket 029). */
    settingsSection: 'Réglages',
    settingsRow: (n: number) => `Après ${n} absences`,
  },
} as const;
