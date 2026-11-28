// Rapport PDF, synthèse et taux (ticket 039 ; EX-32, RM-01, NF-06, SEC-08) : page HTML complète,
// rendue en PDF par expo-print (ticket 040). Tout texte passe par le gabarit `html` (échappement,
// libellés compris) ; le style ne reçoit que des couleurs vérifiées et des largeurs entières en %.
// Domaine pur : textes et couleurs sont passés par l'appelant (`src/config/libelles/rapport.ts`).
import {
  attendanceRate,
  formatRate,
  SHARE_ORDER,
  type StatusCounts,
  statusShares,
} from '@/domain/attendanceRate';
import { toDisplayDate } from '@/domain/formats';
import { html, joinHtml, type SafeHtml, safeHtmlText } from '@/domain/safeHtml';
import type { AttendanceStatus } from '@/domain/validation';

export type ReportMember = {
  memberId: number;
  firstName: string;
  lastName: string;
  archived: boolean;
  counts: StatusCounts;
};

export type ReportGroup = {
  groupId: number;
  name: string;
  /** Groupe archivé ou hors de la saison active. */
  archived: boolean;
  sessions: number;
  counts: StatusCounts;
  /** Triés par nom (ordre gardé tel quel). */
  members: ReportMember[];
};

/** Données du rapport (`src/data/reportRepo.ts`) : dates stockées AAAA-MM-JJ (RM-04). */
export type Report = {
  from: string;
  to: string;
  createdOn: string;
  sessions: number;
  counts: StatusCounts;
  groups: ReportGroup[];
};

export type ReportLabels = {
  title: string;
  period: (from: string, to: string) => string;
  createdOn: (date: string) => string;
  rate: string;
  sessions: string;
  byGroup: string;
  group: string;
  lastName: string;
  firstName: string;
  archived: string;
  statuses: Readonly<Record<AttendanceStatus, string>>;
  letters: Readonly<Record<AttendanceStatus, string>>;
  legend: string;
  groupSummary: (sessions: number, rate: string) => string;
  noSession: string;
  noAttendance: string;
  noMember: string;
};

export type ReportPalette = {
  text: string;
  muted: string;
  rule: string;
  statuses: Readonly<Record<AttendanceStatus, string>>;
};

declare const reportBrand: unique symbol;
/** Document produit par `reportHtml` seul : la seule entrée acceptée par le rendu PDF (040). */
export type ReportHtml = string & { readonly [reportBrand]: true };

/** SEC-08 : CSP du rapport, première balise de `<head>`. */
export const REPORT_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:";

/**
 * Orientation des pages de synthèse et de taux, dans cette seule constante (décision du porteur du
 * 2026-11-28 : A4 portrait ; repli « tout en paysage » si les pages mélangées ne tiennent pas, 040).
 */
export const SUMMARY_PAGE = { name: 'portrait', size: 'A4 portrait' } as const;

/** Orientation des pages de grille (ticket 039b, décision du porteur du 2026-11-28 : A4 paysage). */
export const GRID_PAGE = { name: 'paysage', size: 'A4 landscape' } as const;

const HEAD = `<!DOCTYPE html><html lang="fr"><head><meta http-equiv="Content-Security-Policy" content="${REPORT_CSP}"><meta charset="utf-8">`;

const COLOR = /^#[0-9A-Fa-f]{6}$/;

const checkColor = (color: string): string => {
  if (!COLOR.test(color)) throw new Error('Couleur refusée dans le rapport (SEC-08)');
  return color;
};

/** Part du fond du statut gardée dans la teinte claire des cases de la grille (039b). */
const TINT_SHARE = 0.25;

/**
 * Charte (décision du porteur du 2026-11-28) : teinte claire du fond d'un statut, mêlé de blanc en
 * TypeScript (aucune fonction CSS récente dans la WebView) ; couleur vérifiée avant et après.
 */
export const lightTint = (color: string): string => {
  const channels = [1, 3, 5].map((i) => Number.parseInt(checkColor(color).slice(i, i + 2), 16));
  const mixed = channels.map((c) => Math.round(255 - (255 - c) * TINT_SHARE));
  return checkColor(`#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase());
};

/**
 * Feuille de style de l'en-tête de confiance (hors gabarit, comme la CSP) : texte fixe écrit ici,
 * couleurs vérifiées une à une ; aucune donnée de l'utilisateur. Un « < » la refuse : elle ne
 * peut pas fermer la balise `<style>`.
 */
export const reportCss = (p: ReportPalette): string => {
  const css = [
    `@page { size: ${SUMMARY_PAGE.size}; margin: 15mm }`,
    `@page ${SUMMARY_PAGE.name} { size: ${SUMMARY_PAGE.size}; margin: 15mm }`,
    'html { -webkit-print-color-adjust: exact; print-color-adjust: exact }',
    `body { margin: 0; color: ${checkColor(p.text)}; font-family: system-ui, sans-serif; font-size: 10pt; font-variant-numeric: tabular-nums }`,
    `.page { page: ${SUMMARY_PAGE.name} }`,
    '.group { break-before: page; page-break-before: always }',
    'h1 { font-size: 16pt; margin: 0 0 2mm }',
    'h2 { font-size: 13pt; margin: 0 0 2mm }',
    'h3 { font-size: 11pt; margin: 6mm 0 0 }',
    'p { margin: 1mm 0 }',
    `.muted { color: ${checkColor(p.muted)}; font-weight: normal; font-size: 9pt }`,
    '.figures { display: flex; gap: 12mm; margin: 5mm 0 2mm }',
    '.figures strong { display: block; font-size: 18pt }',
    `.bar { display: flex; height: 4mm; border-radius: 1mm; overflow: hidden; margin: 3mm 0 2mm; background: ${checkColor(p.rule)} }`,
    '.bar i { display: block; height: 100% }',
    '.legend > span { margin-right: 5mm; white-space: nowrap }',
    '.key { display: inline-block; width: 3mm; height: 3mm; margin-right: 1mm; vertical-align: middle }',
    'table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 3mm 0 2mm }',
    `th, td { text-align: left; padding: 1.5mm 1mm; border-bottom: 0.3mm solid ${checkColor(p.rule)}; overflow-wrap: anywhere }`,
    'thead { display: table-header-group }',
    'tr { break-inside: avoid; page-break-inside: avoid }',
    '.groups td:nth-child(n+2), .groups th:nth-child(n+2) { text-align: right }',
    '.members td:nth-child(n+3), .members th:nth-child(n+3) { text-align: right }',
    ...SHARE_ORDER.map((s) => `.s-${s} { background: ${checkColor(p.statuses[s])} }`),
    // Grille séance par séance (039b) : A4 paysage, police réduite, aucun style en ligne.
    `@page ${GRID_PAGE.name} { size: ${GRID_PAGE.size}; margin: 10mm }`,
    `.grid { page: ${GRID_PAGE.name}; break-before: page; page-break-before: always }`,
    '.grid table { font-size: 8pt }',
    '.grid th, .grid td { padding: 1mm 0.5mm }',
    '.grid .who { width: 28mm }',
    '.grid .c { text-align: center; overflow-wrap: normal }',
    ...SHARE_ORDER.map(
      (s) => `.g-${s} { background: ${lightTint(p.statuses[s])}; color: ${checkColor(p.text)} }`,
    ),
  ].join('\n');
  if (css.includes('<')) throw new Error('Feuille de style refusée dans le rapport (SEC-08)');
  return css;
};

/** Largeur en % : entier de 0 à 100 vérifié avant d'entrer dans un attribut de style. */
const width = (percent: number): SafeHtml => {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100)
    throw new Error('Largeur refusée dans le rapport (SEC-08)');
  return html`style="width:${percent}%"`;
};

const cols = (widths: number[]) =>
  html`<colgroup>${widths.map((w) => html`<col ${width(w)}>`)}</colgroup>`;

const rateText = (counts: StatusCounts) => formatRate(attendanceRate(counts));

const named = (name: string, archived: boolean, l: ReportLabels) =>
  archived ? html`${name} <span class="muted">${l.archived}</span>` : html`${name}`;

/** NF-06 : barre par statut, chaque statut avec son libellé et son compte écrits. */
const statusBar = (counts: StatusCounts, l: ReportLabels) => {
  const shares = statusShares(counts);
  const segments = SHARE_ORDER.filter((s) => shares[s] > 0).map(
    (s) => html`<i class="s-${s}" ${width(shares[s])}></i>`,
  );
  const legend = SHARE_ORDER.map(
    (s) => html`<span><span class="key s-${s}"></span>${l.statuses[s]} ${counts[s]}</span>`,
  );
  return html`<div class="bar">${segments}</div><p class="legend">${legend}</p>`;
};

/** Sans séance, ou séances sans aucune présence comptée (rapport filtré, RM-03) : texte clair. */
const notice = (sessions: number, counts: StatusCounts, l: ReportLabels) => {
  if (sessions === 0) return html`<p>${l.noSession}</p>`;
  const total = SHARE_ORDER.reduce((sum, s) => sum + counts[s], 0);
  return total === 0 ? html`<p>${l.noAttendance}</p>` : html``;
};

const summary = (r: Report, l: ReportLabels) => {
  const rows = r.groups.map(
    (g) =>
      html`<tr><td>${named(g.name, g.archived, l)}</td><td>${g.sessions}</td><td>${rateText(g.counts)}</td></tr>`,
  );
  return html`<section class="page summary"><h1>${l.title}</h1><p class="muted">${l.period(
    toDisplayDate(r.from),
    toDisplayDate(r.to),
  )}</p><p class="muted">${l.createdOn(toDisplayDate(r.createdOn))}</p><div class="figures"><div><span class="muted">${
    l.rate
  }</span><strong>${rateText(r.counts)}</strong></div><div><span class="muted">${
    l.sessions
  }</span><strong>${r.sessions}</strong></div></div>${notice(r.sessions, r.counts, l)}${statusBar(
    r.counts,
    l,
  )}<h3>${l.byGroup}</h3><table class="groups">${cols([60, 20, 20])}<thead><tr><th>${l.group}</th><th>${
    l.sessions
  }</th><th>${l.rate}</th></tr></thead><tbody>${rows}</tbody></table></section>`;
};

const memberTable = (members: ReportMember[], l: ReportLabels) => {
  if (members.length === 0) return html`<p>${l.noMember}</p>`;
  const head = SHARE_ORDER.map((s) => html`<th>${l.letters[s]}</th>`);
  const rows = members.map(
    (m) =>
      html`<tr><td>${named(m.lastName, m.archived, l)}</td><td>${m.firstName}</td>${SHARE_ORDER.map(
        (s) => html`<td>${m.counts[s]}</td>`,
      )}<td>${rateText(m.counts)}</td></tr>`,
  );
  return html`<table class="members">${cols([28, 28, 8, 8, 8, 8, 12])}<thead><tr><th>${l.lastName}</th><th>${
    l.firstName
  }</th>${head}<th>${l.rate}</th></tr></thead><tbody>${rows}</tbody></table><p class="muted">${l.legend}</p>`;
};

/** Page d'un groupe (seulement s'il a des séances), suivie de ses pages de grille (039b). */
const groupPage = (g: ReportGroup, l: ReportLabels, grids: readonly SafeHtml[]) =>
  html`<section class="page group"><h2>${named(g.name, g.archived, l)}</h2><p class="muted">${l.groupSummary(
    g.sessions,
    rateText(g.counts),
  )}</p>${notice(g.sessions, g.counts, l)}${memberTable(g.members, l)}</section>${grids}`;

/**
 * EX-32 : synthèse de la période, puis une page par groupe qui a des séances. `grids` : pages de
 * grille déjà rendues par groupe (039b), placées après la page de leur groupe ; facultatives.
 */
export const reportHtml = (
  report: Report,
  labels: ReportLabels,
  palette: ReportPalette,
  grids: ReadonlyMap<number, readonly SafeHtml[]> = new Map(),
): ReportHtml => {
  const head = `${HEAD}<style>${reportCss(palette)}</style>`;
  const pages = report.groups
    .filter((g) => g.sessions > 0)
    .map((g) => groupPage(g, labels, grids.get(g.groupId) ?? []));
  const rest = html`<title>${labels.title}</title></head><body>${summary(
    report,
    labels,
  )}${joinHtml(pages)}</body></html>`;
  return (head + safeHtmlText(rest)) as ReportHtml;
};
