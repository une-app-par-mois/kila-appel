// Textes de l'écran de récupération (tickets 014c et 014f, EX-22) : une maquette « Base illisible », trois
// variantes (réponses du porteur du 2026-11-27). Jamais de message technique.

export const recuperation = {
  recovery: {
    title: 'Vos données ne peuvent pas être ouvertes',
    /** Base abîmée (maquette actuelle). */
    damaged: 'Le fichier de données de l’appli est abîmé. Rien n’a été effacé pour l’instant.',
    damagedChoice: 'Vous pouvez restaurer votre dernière sauvegarde, ou repartir de zéro.',
    /** Bouton principal de la variante abîmée (maquette ; ticket 014f). */
    restore: 'Restaurer une sauvegarde',
    /** Carte de résumé de la confirmation, variante abîmée (réponse du porteur du 2026-11-27). */
    restoreErase: 'Les données abîmées seront effacées définitivement.',
    /**
     * Titre de l'écran après une recopie en échec, ou une base neuve qui ne s'ouvre pas après
     * l'effacement d'une restauration (réponses 1 et 2 du porteur du 2026-11-27).
     */
    restoreFailedTitle: 'La restauration n’a pas abouti',
    /** Recopie en échec après l'effacement : base neuve vide (réponse 2 du porteur). */
    restoreFailed:
      'Les données abîmées ont été effacées. Choisissez un autre fichier, ou repartez de zéro.',
    /**
     * Base abîmée effacée (« Repartir de zéro » ou restauration), mais la base neuve ne s'ouvre
     * pas (réponse 1 du porteur du 2026-11-27) : jamais « Rien n'a été effacé ».
     */
    erasedOpenFailed:
      'Les données abîmées ont été effacées, mais l’appli n’a pas pu préparer un nouveau fichier de données. Réessayez.',
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
