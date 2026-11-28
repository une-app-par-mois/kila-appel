// Textes et couleurs du rapport PDF (tickets 039 et 039b ; EX-32, RM-01, NF-06, NF-07). Passés au
// générateur `src/domain/reportHtml.ts`, qui échappe chacun (SEC-08) : le domaine n'importe pas
// la configuration. Couleurs tirées du thème et noms des statuts de `commun`, aucune valeur
// recopiée (CONV-16, NF-07).
import { SHARE_ORDER } from '@/domain/attendanceRate';
import { theme } from '../theme';
import { commun } from './commun';
import { plural } from './outils';

const letters = { present: 'P', late: 'R', excused: 'E', absent: 'A' } as const;

/** « P : présent · R : retard · E : excusé · A : absent » (CONV-16 : aucune recopie). */
const gridKeys = SHARE_ORDER.map(
  (s) => `${letters[s]} : ${commun.statuses[s].toLocaleLowerCase('fr-FR')}`,
).join(' · ');

export const rapport = {
  report: {
    title: 'Ki&La · Rapport de présence',
    /** Période affichée : « 01/09/2026 – 26/11/2026 » (maquette « Rapport PDF »). */
    period: (from: string, to: string) => `${from} – ${to}`,
    createdOn: (date: string) => `Créé le ${date}`,
    rate: 'Taux de présence',
    sessions: 'Séances',
    byGroup: 'Par groupe',
    group: 'Groupe',
    lastName: 'Nom',
    firstName: 'Prénom',
    /** Groupe archivé ou d'une autre saison, membre archivé (mêmes mots que les statistiques). */
    archived: 'Archivé',
    statuses: commun.statuses,
    /** Colonnes du tableau des membres ; la légende les écrit en entier (NF-06). */
    letters,
    legend: 'P : présent · R : retard · E : excusé · A : absent. « — » : aucune séance comptée.',
    /** « 13 séances · taux de présence 88 % ». */
    groupSummary: (sessions: number, rate: string) =>
      `${plural(sessions, 'séance', 'séances')} · taux de présence ${rate}`,
    noSession: 'Aucune séance sur la période.',
    /** Séances sans présence comptée (rapport filtré, RM-03) : le taux « — » s'explique. */
    noAttendance: 'Aucune présence comptée sur la période.',
    noMember: 'Aucun membre sur la période.',
    /** Titre d'un bloc de la grille (039b) : « Poussins · séances du 02/09/2026 au 17/02/2027 ». */
    gridTitle: (group: string, from: string, to: string) =>
      `${group} · séances du ${from} au ${to}`,
    /** Légende sous chaque bloc de la grille (maquette), tirée des lettres et des statuts. */
    gridLegend: `${gridKeys}. Case vide : hors inscription ou sans statut.`,
  },
} as const;

/** Couleurs du rapport : texte, texte secondaire, filets et fond de chaque statut (charte). */
export const rapportPalette = {
  text: theme.colors.texte,
  muted: theme.colors.texteSecondaire,
  rule: theme.colors.quadrillage,
  statuses: {
    present: theme.statuses.present.fond,
    late: theme.statuses.late.fond,
    excused: theme.statuses.excused.fond,
    absent: theme.statuses.absent.fond,
  },
} as const;
