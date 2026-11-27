// Textes de l'écran de récupération (ticket 014c, EX-22) : une maquette « Base illisible », trois
// variantes (réponses du porteur du 2026-11-27). Jamais de message technique.

export const recuperation = {
  recovery: {
    title: 'Vos données ne peuvent pas être ouvertes',
    /** Base abîmée (maquette actuelle). */
    damaged: 'Le fichier de données de l’appli est abîmé. Rien n’a été effacé pour l’instant.',
    damagedChoice: 'Vous pouvez restaurer votre dernière sauvegarde, ou repartir de zéro.',
    startOver: 'Repartir de zéro',
    confirmTitle: 'Repartir de zéro ?',
    confirmMessage: 'Les données abîmées seront effacées définitivement.',
    confirmCancel: 'Garder',
    confirm: 'Effacer et repartir de zéro',
    /** Effacement en échec, sous les boutons (réponse du porteur du 2026-11-27). */
    resetFailed: 'L’effacement n’a pas abouti. Réessayez.',
    /**
     * Réglage refusé (FOREIGN_KEYS_OFF, SECURE_DELETE_OFF, JOURNAL_MODE_OFF) ou erreur non reconnue :
     * fichier gardé.
     */
    settings: 'L’appli n’a pas pu préparer le fichier de données. Rien n’a été effacé.',
    /** Variantes abîmée, réglage refusé et erreur non reconnue. */
    retry: 'Réessayer',
    /** Version plus récente que l'appli : le message seul, sans aucune action. */
    newer:
      'Vos données viennent d’une version plus récente de l’appli : mettez l’appli à jour. Rien n’a été effacé.',
  },
} as const;
