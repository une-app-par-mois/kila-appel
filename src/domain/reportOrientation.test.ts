// Rapport PDF, orientation des pages (ticket 040b, décision du porteur du 2026-11-28 ; EX-32,
// SEC-08) : Android garde les pages mélangées (synthèse en portrait, grille en paysage) ; iOS passe
// tout le rapport en paysage d'office. Rapport fictif écrit à la main (SEC-13).
import { rapport, rapportPalette } from '@/config/libelles/rapport';
import { reportGrids } from '@/domain/reportGrid';
import {
  GRID_PAGE,
  type Report,
  reportCss,
  reportHtml,
  SUMMARY_PAGE,
  SUMMARY_PAGE_LANDSCAPE,
} from '@/domain/reportHtml';

const ZERO = { present: 0, late: 0, excused: 0, absent: 0 };
const REPORT: Report = {
  from: '2026-09-01',
  to: '2026-11-27',
  createdOn: '2026-11-27',
  sessions: 1,
  counts: { ...ZERO, present: 1 },
  groups: [
    {
      groupId: 1,
      name: 'Poussins',
      archived: false,
      sessions: 1,
      counts: { ...ZERO, present: 1 },
      members: [
        { memberId: 10, lastName: 'Blanc', firstName: 'Zoé', archived: false, counts: ZERO },
      ],
    },
  ],
};
const GRID = new Map([
  [
    1,
    {
      sessions: [{ sessionId: 100, date: '2026-09-02', startTime: '17:30' }],
      statuses: new Map([[10, new Map([[100, 'present' as const]])]]),
    },
  ],
]);
const grids = reportGrids(REPORT, GRID, rapport.report);

describe('EX-32 orientation des pages du rapport (décision du porteur du 2026-11-28)', () => {
  it('constantes : synthèse en portrait ou en paysage, grille en paysage', () => {
    expect(SUMMARY_PAGE).toEqual({ name: 'portrait', size: 'A4 portrait' });
    expect(SUMMARY_PAGE_LANDSCAPE).toEqual({ name: 'synthese', size: 'A4 landscape' });
    expect(GRID_PAGE).toEqual({ name: 'paysage', size: 'A4 landscape' });
  });

  it('Android (par défaut) : pages mélangées, synthèse en portrait, grille en paysage', () => {
    const doc = reportHtml(REPORT, rapport.report, rapportPalette, grids);
    expect(doc).toBe(reportHtml(REPORT, rapport.report, rapportPalette, grids, 'portrait'));
    expect(doc).toContain('@page { size: A4 portrait; margin: 15mm }');
    expect(doc).toContain('.page { page: portrait }');
    expect(doc).toContain('@page paysage { size: A4 landscape; margin: 10mm }');
    expect(doc).toContain('<section class="grid">');
  });

  it('iOS : tout en paysage, aucune page portrait ; grille et SEC-08 inchangés', () => {
    const doc = reportHtml(REPORT, rapport.report, rapportPalette, grids, 'landscape');
    expect(doc).not.toContain('portrait');
    expect(doc).toContain('@page { size: A4 landscape; margin: 15mm }');
    expect(doc).toContain('@page synthese { size: A4 landscape; margin: 15mm }');
    expect(doc).toContain('.page { page: synthese }');
    expect(doc).toContain('@page paysage { size: A4 landscape; margin: 10mm }');
    expect(doc).toContain('.grid { page: paysage; break-before: page; page-break-before: always }');
    expect(doc.indexOf('<section class="grid">')).toBeGreaterThan(doc.indexOf('<h2>Poussins'));
    const css = reportCss(rapportPalette, 'landscape');
    expect(css).not.toContain('<');
    expect(doc).toContain(`<style>${css}</style>`);
  });
});
