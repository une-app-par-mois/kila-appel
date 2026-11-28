// Rapport PDF, synthèse et taux (ticket 039 ; EX-32, RM-01, NF-06, SEC-08) : page HTML générée
// à partir d'un rapport fictif écrit à la main (SEC-13 : aucune donnée réelle).
import { commun } from '@/config/libelles/commun';
import { rapport, rapportPalette } from '@/config/libelles/rapport';
import { theme } from '@/config/theme';
import { NBSP, type StatusCounts } from '@/domain/attendanceRate';
import { REPORT_CSP, type Report, reportCss, reportHtml, SUMMARY_PAGE } from '@/domain/reportHtml';
import { html } from '@/domain/safeHtml';

const c = (present: number, late: number, excused: number, absent: number): StatusCounts => ({
  present,
  late,
  excused,
  absent,
});
const member = (memberId: number, lastName: string, firstName: string, counts: StatusCounts) => ({
  memberId,
  lastName,
  firstName,
  archived: false,
  counts,
});

const REPORT: Report = {
  from: '2026-09-01',
  to: '2026-11-26',
  createdOn: '2026-11-27',
  sessions: 21,
  counts: c(45, 2, 3, 7),
  groups: [
    {
      groupId: 3,
      name: 'Adultes',
      archived: false,
      sessions: 0,
      counts: c(0, 0, 0, 0),
      members: [],
    },
    {
      groupId: 1,
      name: 'Poussins',
      archived: false,
      sessions: 13,
      counts: c(37, 1, 3, 5),
      members: [
        member(10, 'Blanc', 'Zoé', c(13, 0, 0, 0)),
        member(11, 'Durand', 'Emma', c(0, 0, 2, 0)),
        { ...member(12, 'Lefebvre', 'Jules', c(11, 0, 0, 1)), archived: true },
        member(13, 'Moreau', 'Hugo', c(6, 1, 1, 4)),
      ],
    },
    {
      groupId: 4,
      name: 'Vétérans',
      archived: true,
      sessions: 1,
      counts: c(0, 1, 0, 0),
      members: [],
    },
  ],
};
const render = (report: Report = REPORT, grids?: Parameters<typeof reportHtml>[3]) =>
  reportHtml(report, rapport.report, rapportPalette, grids);
const pct = (n: number) => `${n}${NBSP}%`;
/** Texte de la page « groupe » : de son titre au saut de page suivant. */
const groupPage = (doc: string, name: string) => {
  const start = doc.indexOf(`<h2>${name}`);
  const end = doc.indexOf('<section', start);
  return doc.slice(start, end === -1 ? undefined : end);
};

describe('Rapport PDF : HTML de la synthèse et des taux (EX-32, SEC-08)', () => {
  it('SEC-08 CSP exacte, première balise de <head>', () => {
    expect(REPORT_CSP).toBe("default-src 'none'; style-src 'unsafe-inline'; img-src data:");
    const doc = render();
    expect(doc.startsWith('<!DOCTYPE html><html lang="fr"><head>')).toBe(true);
    const head = doc.slice(doc.indexOf('<head>') + '<head>'.length);
    expect(
      head.startsWith(`<meta http-equiv="Content-Security-Policy" content="${REPORT_CSP}">`),
    ).toBe(true);
  });

  it('SEC-08 aucun script, lien, formulaire, image, ressource ni adresse', () => {
    const doc = render();
    const withoutCsp = doc.replace('http-equiv="Content-Security-Policy"', '');
    for (const forbidden of [
      '<script',
      '<a ',
      '<a>',
      '<link',
      '<base',
      '<form',
      '<iframe',
      '<img',
      '<object',
      '<embed',
      '<svg',
      'refresh',
      '@import',
      '@font-face',
      'url(',
      'http',
      '//',
      'javascript:',
    ]) {
      expect(withoutCsp.toLowerCase()).not.toContain(forbidden);
    }
    expect(doc.toLowerCase()).not.toMatch(/\son[a-z]+=/);
  });

  it('SEC-08 nom de membre et de groupe hostiles : échappés, jamais interprétés', () => {
    const hostile: Report = {
      ...REPORT,
      groups: [
        {
          ...(REPORT.groups[1] as Report['groups'][number]),
          name: '</style><script>alert(1)</script>',
          members: [member(20, '<img src=http://x>', `O'Brien & "fils"`, c(1, 0, 0, 0))],
        },
      ],
    };
    const doc = render(hostile);
    expect(doc).toContain('&lt;/style&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(doc).toContain('&lt;img src=http://x&gt;');
    expect(doc).toContain('O&#39;Brien &amp; &quot;fils&quot;');
    expect(doc).not.toContain('<script');
    expect(doc).not.toContain('<img');
    expect(doc.match(/<\/style>/g)).toHaveLength(1);
  });

  it('SEC-08 libellés échappés eux aussi', () => {
    const doc = reportHtml(
      REPORT,
      { ...rapport.report, sessions: '<b>Séances</b>' },
      rapportPalette,
    );
    expect(doc).toContain('Ki&amp;La · Rapport de présence');
    expect(doc).toContain('&lt;b&gt;Séances&lt;/b&gt;');
  });

  it('SEC-08 style : seules des largeurs entières en % et des couleurs vérifiées', () => {
    const doc = render();
    const styles = [...doc.matchAll(/style="([^"]*)"/g)].map((m) => m[1]);
    expect(styles.length).toBeGreaterThan(0);
    for (const s of styles) expect(s).toMatch(/^width:\d{1,3}%$/);
    const css = doc.slice(doc.indexOf('<style>'), doc.indexOf('</style>'));
    expect(css).not.toMatch(/Poussins|Blanc|Zoé/);
    expect(() =>
      reportHtml(REPORT, rapport.report, {
        ...rapportPalette,
        statuses: { ...rapportPalette.statuses, late: 'red;}body{x:y' },
      }),
    ).toThrow('SEC-08');
  });

  it('SEC-08 feuille de style dans l’en-tête de confiance, sans « < » ni « </style »', () => {
    const css = reportCss(rapportPalette);
    expect(css).not.toContain('<');
    expect(css.toLowerCase()).not.toContain('</style');
    const doc = render();
    expect(doc).toContain(`<meta charset="utf-8"><style>${css}</style><title>`);
  });

  it('CONV-16 NF-07 couleurs tirées du thème, noms des statuts tirés de commun', () => {
    expect(rapportPalette).toEqual({
      text: theme.colors.texte,
      muted: theme.colors.texteSecondaire,
      rule: theme.colors.quadrillage,
      statuses: {
        present: theme.statuses.present.fond,
        late: theme.statuses.late.fond,
        excused: theme.statuses.excused.fond,
        absent: theme.statuses.absent.fond,
      },
    });
    expect(rapport.report.statuses).toBe(commun.statuses);
  });

  it('NF-06 légende : le carré de couleur reste collé à son libellé', () => {
    const css = reportCss(rapportPalette);
    expect(css).toContain('.legend > span { margin-right: 5mm');
    expect(css).not.toMatch(/\.legend span\b/);
  });

  it('RM-01 RM-03 séances sans présence comptée : texte clair, synthèse et page du groupe', () => {
    const empty = {
      ...(REPORT.groups[1] as Report['groups'][number]),
      counts: c(0, 0, 0, 0),
      members: [member(30, 'Petit', 'Lou', c(0, 0, 0, 0))],
    };
    const doc = render({ ...REPORT, sessions: 4, counts: c(0, 0, 0, 0), groups: [empty] });
    expect(doc.split(rapport.report.noAttendance)).toHaveLength(3);
    expect(render()).not.toContain(rapport.report.noAttendance);
  });

  it('SEC-08 compte invalide (non entier) refusé avant tout rendu', () => {
    expect(() => render({ ...REPORT, counts: c(1.5, 0, 0, 0) })).toThrow();
  });

  it('EX-32 page A4 portrait, orientation dans une seule constante, police du système', () => {
    const doc = render();
    expect(SUMMARY_PAGE).toEqual({ name: 'portrait', size: 'A4 portrait' });
    expect(doc).toContain('@page { size: A4 portrait; margin: 15mm }');
    expect(doc).toContain('@page portrait { size: A4 portrait; margin: 15mm }');
    expect(doc).toContain('font-family: system-ui, sans-serif');
    expect(doc).toContain('font-variant-numeric: tabular-nums');
    expect(doc).toContain('print-color-adjust: exact');
  });

  it('EX-32 RM-01 synthèse : titre, période, date de création, taux, séances, tableau des groupes', () => {
    const doc = render();
    expect(doc).toContain('<title>Ki&amp;La · Rapport de présence</title>');
    expect(doc).toContain('01/09/2026 – 26/11/2026');
    expect(doc).toContain('Créé le 27/11/2026');
    expect(doc).toContain(pct(87));
    expect(doc).toMatch(/Séances<\/[a-z]+><[^>]+>21</);
    expect(doc).toContain(`<tr><td>Adultes</td><td>0</td><td>—</td></tr>`);
    expect(doc).toContain(`<tr><td>Poussins</td><td>13</td><td>${pct(88)}</td></tr>`);
    expect(doc).toContain(
      `<tr><td>Vétérans <span class="muted">Archivé</span></td><td>1</td><td>${pct(100)}</td></tr>`,
    );
  });

  it('NF-06 barre par statut : chaque statut a son libellé et son compte écrits', () => {
    const doc = render();
    for (const text of ['Présent 45', 'Retard 2', 'Excusé 3', 'Absent 7']) {
      expect(doc).toContain(text);
    }
    const widths = [...doc.matchAll(/class="s-[a-z]+" style="width:(\d+)%"/g)].map((m) =>
      Number(m[1]),
    );
    expect(widths.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('EX-32 une page par groupe qui a des séances, membres dans l’ordre reçu, « — » sans séance comptée', () => {
    const doc = render();
    expect(doc).not.toContain('<h2>Adultes');
    expect(doc).toContain('break-before: page');
    const page = groupPage(doc, 'Poussins');
    expect(page).toContain(`13 séances · taux de présence ${pct(88)}`);
    const rows = [
      ...page.matchAll(/<tr><td>([^<]+)(?:<span[^>]*>[^<]*<\/span>)?<\/td><td>([^<]+)<\/td>/g),
    ];
    expect(rows.map((m) => m[1]?.trim())).toEqual(['Blanc', 'Durand', 'Lefebvre', 'Moreau']);
    expect(page).toContain(
      `<td>Moreau</td><td>Hugo</td><td>6</td><td>1</td><td>1</td><td>4</td><td>${pct(64)}</td>`,
    );
    expect(page).toContain(
      '<td>Durand</td><td>Emma</td><td>0</td><td>0</td><td>2</td><td>0</td><td>—</td>',
    );
    expect(page).toContain('Lefebvre <span class="muted">Archivé</span>');
    expect(page).toContain(rapport.report.legend.replace(/"/g, '&quot;'));
    expect(groupPage(doc, 'Vétérans')).toContain(rapport.report.noMember);
  });

  it('EX-32 pages de grille (039b) placées après la page de leur groupe ; sans grille, rapport complet', () => {
    const grids = new Map([
      [1, [html`<section class="grid">G1a</section>`, html`<section class="grid">G1b</section>`]],
    ]);
    const doc = render(REPORT, grids);
    const poussins = doc.indexOf('<h2>Poussins');
    const a = doc.indexOf('G1a');
    const b = doc.indexOf('G1b');
    expect(poussins).toBeLessThan(a);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(doc.indexOf('<h2>Vétérans'));
    expect(render()).toContain('</html>');
  });

  it('EX-32 RM-01 période sans séance : page valide, « — », aucune page de groupe', () => {
    const doc = render({
      ...REPORT,
      sessions: 0,
      counts: c(0, 0, 0, 0),
      groups: [{ ...(REPORT.groups[0] as Report['groups'][number]) }],
    });
    expect(doc).toContain(rapport.report.noSession);
    expect(doc).not.toContain('<h2>');
    expect(doc).not.toMatch(/class="s-[a-z]+" style=/);
    expect(doc).toContain('Présent 0');
    expect(doc.endsWith('</body></html>')).toBe(true);
  });
});
