// Textes de l'onglet Statistiques, du choix d'une période (ticket 024) et des statistiques d'un
// groupe et d'un membre (ticket 025), du fichier CSV des présences (ticket 036) ; EX-27, EX-31,
// RM-01, RM-03.
import { plural } from './outils';

type Counts = { present: number; late: number; excused: number; absent: number };

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
    /** Cases « Séance par séance » sans statut (RM-03, NF-06) : lues avec la date. */
    notEnrolled: (date: string) => `Hors inscription, ${date}`,
    noStatus: (date: string) => `Sans statut, ${date}`,
    groupScreen: {
      /** « Saison 2026-2027 · 13 séances » ou « Du 01/11/2026 au 27/11/2026 · 4 séances ». */
      subtitle: (period: string, sessions: number) =>
        `${period} · ${plural(sessions, 'séance', 'séances')}`,
      byMember: 'Par membre',
      sorted: (n: number) => `Triés par nom ; ${plural(n, 'membre', 'membres')}.`,
      noMember: 'Aucun membre sur la période.',
    },
    memberScreen: {
      /** « Poussins mercredi · saison 2026-2027 » ou « Poussins mercredi · du … au … ». */
      subtitle: (group: string, period: string) => `${group} · ${period}`,
      /** Nom de saison en milieu de phrase : « Saison 2026-2027 » devient « saison 2026-2027 ». */
      season: (name: string) => name.replace(/^Saison\b/, 'saison'),
      range: (from: string, to: string) => `du ${from} au ${to}`,
      /** Quatre statuts toujours affichés, accordés (décision du porteur du 2026-11-27). */
      counts: (c: Counts) =>
        [
          plural(c.present, 'présent', 'présents'),
          plural(c.late, 'retard', 'retards'),
          plural(c.excused, 'excusé', 'excusés'),
          plural(c.absent, 'absent', 'absents'),
        ].join(' · '),
      bySession: 'Séance par séance',
      legend: 'Case vide : séance hors inscription ou sans statut.',
      noSession: 'Aucune séance sur la période.',
    },
    periodScreen: {
      title: 'Période',
      from: 'Du',
      to: 'Au',
      placeholder: 'JJ/MM/AAAA',
      apply: 'Appliquer',
    },
    /** Fichier CSV des présences (ticket 036, EX-31) : en-tête, séance sans créneau, sans groupe. */
    csv: {
      header: ['Date', 'Créneau', 'Groupe', 'Nom', 'Prénom', 'Statut'],
      noSlot: 'Sans créneau',
      noGroup: 'Sans groupe',
    },
  },
} as const;
