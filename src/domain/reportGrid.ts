// Rapport PDF, grille séance par séance (ticket 039b ; EX-32, NF-06, SEC-08) : pour chaque groupe,
// une page A4 paysage par bloc d'environ 25 séances, noms répétés sur chaque bloc. Tout texte passe
// par le gabarit `html` (échappement) ; les styles sont dans `reportCss` (aucun style en ligne).
// Domaine pur : données lues par `src/data/reportGridRepo.ts`, textes de `rapport.ts`.
import { toDisplayDate } from '@/domain/formats';
import type { Report, ReportGroup, ReportLabels, ReportMember } from '@/domain/reportHtml';
import { html, type SafeHtml } from '@/domain/safeHtml';
import type { AttendanceStatus } from '@/domain/validation';

/** Séance enregistrée d'un groupe sur la période ; dates stockées AAAA-MM-JJ (RM-04). */
export type GridSession = { sessionId: number; date: string; startTime: string };

/**
 * Grille d'un groupe : ses séances triées par date, heure, identifiant, et le statut compté pour
 * le groupe (RM-03, `credits`) par membre puis par séance. Pas de statut : case vide.
 */
export type GroupGrid = {
  sessions: readonly GridSession[];
  statuses: ReadonlyMap<number, ReadonlyMap<number, AttendanceStatus>>;
};

/** Grilles par groupe (groupes qui ont au moins une séance enregistrée sur la période). */
export type ReportGrid = ReadonlyMap<number, GroupGrid>;

export type GridLabels = Pick<ReportLabels, 'lastName' | 'firstName' | 'archived' | 'letters'> & {
  gridTitle: (group: string, from: string, to: string) => string;
  gridLegend: string;
};

const BLOCK = 25;
/** Un dernier bloc plus court est fusionné avec le précédent (29 colonnes au plus). */
const MIN_LAST_BLOCK = 5;

/** EX-32 : blocs de 25 ; 60 → 25, 25, 10 ; 26 → 26 ; 30 → 25, 5. */
export const gridBlocks = <T>(items: readonly T[]): T[][] => {
  const blocks: T[][] = [];
  for (let i = 0; i < items.length; i += BLOCK) blocks.push(items.slice(i, i + BLOCK));
  const last = blocks[blocks.length - 1];
  if (blocks.length > 1 && last && last.length < MIN_LAST_BLOCK) {
    blocks.pop();
    blocks[blocks.length - 1]?.push(...last);
  }
  return blocks;
};

const named = (name: string, archived: boolean, l: GridLabels) =>
  archived ? html`${name} <span class="muted">${l.archived}</span>` : html`${name}`;

/** « JJ/MM » ; l'heure en dessous seulement si une autre séance du groupe tombe le même jour. */
const columnHead = (s: GridSession, sameDay: ReadonlySet<string>) => {
  const day = toDisplayDate(s.date).slice(0, 5);
  return sameDay.has(s.date)
    ? html`<th class="c">${day}<br>${s.startTime}</th>`
    : html`<th class="c">${day}</th>`;
};

/** NF-06 : la lettre du statut est toujours écrite ; la teinte n'est qu'un signe en plus. */
const cell = (status: AttendanceStatus | undefined, l: GridLabels) =>
  status ? html`<td class="c g-${status}">${l.letters[status]}</td>` : html`<td class="c"></td>`;

const block = (
  g: ReportGroup,
  grid: GroupGrid,
  sessions: readonly GridSession[],
  sameDay: ReadonlySet<string>,
  l: GridLabels,
) => {
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const title = l.gridTitle(
    g.name,
    toDisplayDate(first?.date ?? ''),
    toDisplayDate(last?.date ?? ''),
  );
  const row = (m: ReportMember) =>
    html`<tr><td>${named(m.lastName, m.archived, l)}</td><td>${m.firstName}</td>${sessions.map(
      (s) => cell(grid.statuses.get(m.memberId)?.get(s.sessionId), l),
    )}</tr>`;
  return html`<section class="grid"><h2>${named(title, g.archived, l)}</h2><table><thead><tr><th class="who">${
    l.lastName
  }</th><th class="who">${l.firstName}</th>${sessions.map((s) =>
    columnHead(s, sameDay),
  )}</tr></thead><tbody>${g.members.map(row)}</tbody></table><p class="muted">${l.gridLegend}</p></section>`;
};

/** Pages de grille d'un groupe : aucune sans membre ou sans séance (pas de page vide). */
export const gridPages = (
  g: ReportGroup,
  grid: GroupGrid | undefined,
  l: GridLabels,
): SafeHtml[] => {
  if (!grid || grid.sessions.length === 0 || g.members.length === 0) return [];
  const seen = new Set<string>();
  const sameDay = new Set<string>();
  for (const { date } of grid.sessions) (seen.has(date) ? sameDay : seen).add(date);
  return gridBlocks(grid.sessions).map((sessions) => block(g, grid, sessions, sameDay, l));
};

/** EX-32 : table groupe → pages de grille, à passer à `reportHtml` (branchement au 040). */
export const reportGrids = (
  report: Report,
  grids: ReportGrid,
  l: GridLabels,
): Map<number, SafeHtml[]> => {
  const pages = new Map<number, SafeHtml[]>();
  for (const g of report.groups) {
    const groupPages = gridPages(g, grids.get(g.groupId), l);
    if (groupPages.length > 0) pages.set(g.groupId, groupPages);
  }
  return pages;
};
