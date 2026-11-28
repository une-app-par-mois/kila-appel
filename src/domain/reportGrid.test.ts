// Rapport PDF, grille séance par séance (ticket 039b ; EX-32, NF-06, SEC-08) : pages de grille
// générées à partir d'un groupe fictif écrit à la main (SEC-13 : aucune donnée réelle).

import { commun } from '@/config/libelles/commun';
import { rapport, rapportPalette } from '@/config/libelles/rapport';
import { SHARE_ORDER, type StatusCounts } from '@/domain/attendanceRate';
import {
  GRID_MAX_COLUMNS,
  type GroupGrid,
  gridBlocks,
  gridPages,
  reportGrids,
} from '@/domain/reportGrid';
import {
  GRID_NAMES_MM,
  GRID_PAGE,
  GRID_USABLE_MM,
  lightTint,
  named,
  type Report,
  type ReportGroup,
  reportCss,
  reportHtml,
} from '@/domain/reportHtml';
import { safeHtmlText } from '@/domain/safeHtml';
import type { AttendanceStatus } from '@/domain/validation';

const ZERO: StatusCounts = { present: 0, late: 0, excused: 0, absent: 0 };
const member = (memberId: number, lastName: string, firstName: string, archived = false) => ({
  memberId,
  lastName,
  firstName,
  archived,
  counts: ZERO,
});

const group = (members: ReportGroup['members'], extra: Partial<ReportGroup> = {}): ReportGroup => ({
  groupId: 1,
  name: 'Poussins',
  archived: false,
  sessions: 0,
  counts: ZERO,
  members,
  ...extra,
});

/** `n` séances hebdomadaires à partir du mercredi 02/09/2026, à 17:30. */
const weekly = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2026, 8, 2 + 7 * i));
    return { sessionId: 100 + i, date: d.toISOString().slice(0, 10), startTime: '17:30' };
  });

const grid = (
  sessions: GroupGrid['sessions'],
  cells: [number, number, AttendanceStatus][] = [],
): GroupGrid => {
  const statuses = new Map<number, Map<number, AttendanceStatus>>();
  for (const [memberId, sessionId, status] of cells) {
    const row = statuses.get(memberId) ?? new Map<number, AttendanceStatus>();
    row.set(sessionId, status);
    statuses.set(memberId, row);
  }
  return { sessions, statuses };
};

const texts = (pages: ReturnType<typeof gridPages>) => pages.map(safeHtmlText);
const labels = rapport.report;

describe('Rapport PDF : grille séance par séance (EX-32, NF-06, SEC-08)', () => {
  it.each([
    [60, [25, 25, 10]],
    [26, [26]],
    [30, [25, 5]],
    [29, [29]],
    [50, [25, 25]],
    [4, [4]],
    [0, []],
  ])('EX-32 découpage : %i séances en blocs %j', (n, sizes) => {
    expect(gridBlocks(weekly(n)).map((b) => b.length)).toEqual(sizes);
  });

  it('EX-32 une page paysage par bloc, noms répétés, en-tête des dates dans thead, titre daté', () => {
    const sessions = weekly(60);
    const pages = texts(
      gridPages(
        group([member(1, 'Blanc', 'Zoé'), member(2, 'Moreau', 'Hugo')]),
        grid(sessions),
        labels,
      ),
    );
    expect(pages).toHaveLength(3);
    for (const page of pages) {
      expect(page.startsWith('<section class="grid">')).toBe(true);
      expect(page).toContain('<tr><th class="who">Blanc Zoé</th><td class="c');
      expect(page).toContain('<tr><th class="who">Moreau Hugo</th><td class="c');
      expect(page).toContain('<thead><tr><th class="who"></th><th class="c">');
    }
    expect(pages[0]).toContain('<h2>Poussins · séances du 02/09/2026 au 17/02/2027</h2>');
    expect(pages[2]).toContain('<h2>Poussins · séances du 18/08/2027 au 20/10/2027</h2>');
    expect(pages[0]).toContain('<th class="c">02/09</th><th class="c">09/09</th>');
    expect(pages[0]?.match(/<th class="c">/g)).toHaveLength(25);
    expect(pages[2]?.match(/<th class="c">/g)).toHaveLength(10);
  });

  it('NF-06 cases : lettre du statut, classe de couleur en plus, case vide hors inscription', () => {
    const sessions = weekly(5);
    const [page] = texts(
      gridPages(
        group([member(1, 'Blanc', 'Zoé')]),
        grid(sessions, [
          [1, 100, 'present'],
          [1, 101, 'late'],
          [1, 102, 'excused'],
          [1, 104, 'absent'],
        ]),
        labels,
      ),
    );
    expect(page).toContain(
      '<td class="c g-present">P</td><td class="c g-late">R</td><td class="c g-excused">E</td><td class="c"></td><td class="c g-absent">A</td>',
    );
  });

  it('NF-06 CONV-16 légende de la maquette, construite à partir des lettres et des statuts', () => {
    expect(labels.gridLegend).toBe(
      'P : présent · R : retard · E : excusé · A : absent. Case vide : hors inscription ou sans statut.',
    );
    const built = SHARE_ORDER.map(
      (s) => `${labels.letters[s]} : ${commun.statuses[s].toLocaleLowerCase('fr-FR')}`,
    ).join(' · ');
    expect(labels.gridLegend.startsWith(`${built}.`)).toBe(true);
    const pages = texts(gridPages(group([member(1, 'Blanc', 'Zoé')]), grid(weekly(60)), labels));
    for (const page of pages)
      expect(page).toContain(`<p class="muted">${labels.gridLegend}</p></section>`);
  });

  it('EX-32 heure ajoutée sous la date seulement si deux séances tombent le même jour', () => {
    const sessions = [
      { sessionId: 1, date: '2026-10-24', startTime: '10:00' },
      { sessionId: 2, date: '2026-10-24', startTime: '17:00' },
      { sessionId: 3, date: '2026-10-26', startTime: '17:00' },
    ];
    const [page] = texts(gridPages(group([member(1, 'Blanc', 'Zoé')]), grid(sessions), labels));
    expect(page).toContain(
      '<th class="c">24/10<br>10:00</th><th class="c">24/10<br>17:00</th><th class="c">26/10</th>',
    );
  });

  it('EX-32 même JJ/MM sur deux années dans un bloc : année (AA) sous la date', () => {
    const sessions = [
      { sessionId: 1, date: '2025-06-10', startTime: '17:00' },
      { sessionId: 2, date: '2025-06-17', startTime: '17:00' },
      { sessionId: 3, date: '2026-06-10', startTime: '17:00' },
    ];
    const [page] = texts(gridPages(group([member(1, 'Blanc', 'Zoé')]), grid(sessions), labels));
    expect(page).toContain(
      '<th class="c">10/06<br>25</th><th class="c">17/06</th><th class="c">10/06<br>26</th>',
    );
  });

  it('EX-32 aide « Archivé » unique, partagée avec le rapport', () => {
    expect(safeHtmlText(named('Lou', true, { archived: 'Archivé' }))).toBe(
      'Lou <span class="muted">Archivé</span>',
    );
    expect(safeHtmlText(named('<b>', false, { archived: 'Archivé' }))).toBe('&lt;b&gt;');
  });

  it('EX-32 groupe archivé : mention sur chaque bloc ; membre archivé : mention sur sa ligne', () => {
    const pages = texts(
      gridPages(
        group([member(1, 'Lefebvre', 'Jules', true)], { archived: true }),
        grid(weekly(30)),
        labels,
      ),
    );
    expect(pages).toHaveLength(2);
    for (const page of pages) {
      expect(page).toMatch(/<h2>Poussins · séances du [^<]+ <span class="muted">Archivé<\/span>/);
      expect(page).toContain(
        '<th class="who">Lefebvre Jules <span class="muted">Archivé</span></th>',
      );
    }
  });

  it('EX-32 sans membre ou sans séance : aucune page de grille', () => {
    expect(gridPages(group([]), grid(weekly(3)), labels)).toEqual([]);
    expect(gridPages(group([member(1, 'Blanc', 'Zoé')]), grid([]), labels)).toEqual([]);
    expect(gridPages(group([member(1, 'Blanc', 'Zoé')]), undefined, labels)).toEqual([]);
  });

  it('EX-32 table groupe → pages, branchable dans reportHtml après la page du groupe', () => {
    const report: Report = {
      from: '2026-09-01',
      to: '2026-11-27',
      createdOn: '2026-11-27',
      sessions: 3,
      counts: ZERO,
      groups: [
        group([member(1, 'Blanc', 'Zoé')], { sessions: 3 }),
        group([], { groupId: 2, name: 'Adultes', sessions: 3 }),
      ],
    };
    const grids = reportGrids(report, new Map([[1, grid(weekly(3))]]), labels);
    expect([...grids.keys()]).toEqual([1]);
    const doc = reportHtml(report, labels, rapportPalette, grids);
    expect(doc.indexOf('<section class="grid">')).toBeGreaterThan(doc.indexOf('<h2>Poussins'));
  });

  it('SEC-08 nom fictif <script> échappé ; aucun <script, http, url( ni style en ligne', () => {
    const evil = '<script>alert(1)</script>';
    const report: Report = {
      from: '2026-09-01',
      to: '2026-11-27',
      createdOn: '2026-11-27',
      sessions: 1,
      counts: ZERO,
      groups: [group([member(1, evil, `"${evil}'`)], { name: evil, sessions: 1 })],
    };
    const grids = reportGrids(report, new Map([[1, grid(weekly(1), [[1, 100, 'late']])]]), labels);
    const page = texts(grids.get(1) ?? []).join('');
    expect(page).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(page).toContain('&quot;&lt;script&gt;');
    expect(page).not.toContain('style=');
    const doc = reportHtml(report, labels, rapportPalette, grids)
      .replace('http-equiv="Content-Security-Policy"', '')
      .toLowerCase();
    expect(doc).not.toContain('<script');
    expect(doc).not.toContain('http');
    expect(doc).not.toContain('url(');
  });
});

/** Luminance relative (WCAG 2.x) d'une couleur #RRGGBB. */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

describe('Rapport PDF : styles de la grille (SEC-08, NF-06, charte)', () => {
  it('SEC-08 page paysage nommée dans une seule constante, styles dans l’en-tête de confiance', () => {
    expect(GRID_PAGE).toEqual({ name: 'paysage', size: 'A4 landscape' });
    const css = reportCss(rapportPalette);
    expect(css).toContain('@page paysage { size: A4 landscape; margin: 10mm }');
    expect(css).toContain('.grid { page: paysage; break-before: page; page-break-before: always }');
    expect(css).toContain('.grid table { font-size: 8pt }');
    expect(css).toContain(
      `.grid .who { width: ${GRID_NAMES_MM}mm; text-align: left; font-weight: normal }`,
    );
    expect(css).toContain('.grid .c { text-align: center; padding: 1mm 0; overflow-wrap: normal }');
    expect(css).toContain('.grid th.c { font-weight: normal }');
    expect(css).not.toContain('<');
  });

  it('NF-06 charte : teinte claire calculée du fond de chaque statut, lettre en texte foncé', () => {
    const css = reportCss(rapportPalette);
    for (const [status, color] of Object.entries(rapportPalette.statuses)) {
      const tint = lightTint(color);
      expect(tint).toMatch(/^#[0-9A-F]{6}$/);
      expect(css).toContain(`.g-${status} { background: ${tint}; color: ${rapportPalette.text} }`);
      expect(contrast(tint, rapportPalette.text)).toBeGreaterThanOrEqual(7);
      expect(luminance(tint)).toBeGreaterThan(luminance(color));
    }
    expect(lightTint('#1F3A93')).toBe('#C7CEE4');
  });

  it('EX-32 29 colonnes de dates : au moins 8 mm par case pour « JJ/MM » en 8 pt', () => {
    expect(GRID_MAX_COLUMNS).toBe(29);
    expect(GRID_USABLE_MM).toBe(277);
    expect(GRID_NAMES_MM).toBe(40);
    expect((GRID_USABLE_MM - GRID_NAMES_MM) / GRID_MAX_COLUMNS).toBeGreaterThanOrEqual(8);
  });

  it('SEC-08 couleur hors #RRGGBB refusée par la teinte', () => {
    expect(() => lightTint('red;}body{x:y')).toThrow('SEC-08');
  });
});
