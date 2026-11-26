// Tous les textes de l'interface (CONV-03) : aucun texte en dur dans un écran.
// Les libellés de statut et d'état de séance viennent des jetons de la charte.
import jetons from '../../design/jetons.json';

export const labels = {
  appName: 'Ki&La',
  statuses: {
    present: jetons.statuts.present.libelle,
    absent: jetons.statuts.absent.libelle,
    late: jetons.statuts.late.libelle,
    excused: jetons.statuts.excused.libelle,
    preparedPresent: jetons.statuts.preparedPresent.libelle,
  },
  sessionStates: {
    cancelled: jetons.etatsSeance.cancelled.libelle,
    unscheduled: jetons.etatsSeance.unscheduled.libelle,
  },
} as const;
