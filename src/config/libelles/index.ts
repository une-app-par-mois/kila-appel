// Tous les textes de l'interface (CONV-03) : aucun texte en dur dans un écran. Un fichier par
// domaine, 300 lignes au plus chacun (décision du porteur du 2026-11-27), rassemblés ici.
import { appel } from './appel';
import { commun } from './commun';
import { creneaux } from './creneaux';
import { membres } from './membres';
import { organisation } from './organisation';

export type { MemberDeletionCounts } from './membres';
export type { GroupDeletionCounts, SeasonDeletionCounts } from './organisation';

export const labels = { ...commun, ...organisation, ...membres, ...creneaux, ...appel } as const;
