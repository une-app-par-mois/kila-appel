// Période des statistiques en paramètres de route (EX-27, décision du porteur du 2026-11-27) :
// `periode=saison` ou `periode=mois`, `du` et `au` (AAAA-MM-JJ) seulement pour des dates libres.
// « Saison » se résout donc comme dans l'onglet (séances de la saison active, par `season_id`).
import type { PeriodChoice, StatsPeriod } from '@/domain/statsPeriod';

export type StatsPeriodParams = { periode?: string; du?: string; au?: string };

/** Paramètres de la période affichée, pour ouvrir un écran de statistiques plus détaillé. */
/** Paramètres d'un choix de l'écran, avant même sa lecture (« Saison » et « Ce mois » à résoudre). */
export const choiceParams = (choice: PeriodChoice): StatsPeriodParams =>
  choice.kind === 'custom'
    ? { du: choice.from, au: choice.to }
    : { periode: choice.kind === 'season' ? 'saison' : 'mois' };

/** Paramètres de la période affichée, pour ouvrir un écran de statistiques plus détaillé. */
export const periodParams = ({ kind, from, to }: StatsPeriod): StatsPeriodParams =>
  choiceParams(kind === 'custom' ? { kind, from, to } : { kind });

/** Choix lu dans l'adresse ; rien de reconnu : période par défaut (`null`). */
export const choiceFromParams = ({ periode, du, au }: StatsPeriodParams): PeriodChoice | null => {
  if (du !== undefined && au !== undefined) return { kind: 'custom', from: du, to: au };
  if (periode === 'saison') return { kind: 'season' };
  if (periode === 'mois') return { kind: 'month' };
  return null;
};
