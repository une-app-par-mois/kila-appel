/**
 * @jest-environment node
 */
// Audit des méta-données de la WebView d'Android sur le binaire (ABS-01, SEC-02, ticket 038,
// décision du porteur du 2026-11-28), sur des sorties `aapt2 dump xmltree` fictives.
const { auditWebViewMetadata } = require('./audit-apk');

const ANDROID = 'http://schemas.android.com/apk/res/android';
const METRICS = 'android.webkit.WebView.MetricsOptOut';
const SAFE_BROWSING = 'android.webkit.WebView.EnableSafeBrowsing';

/** Une `meta-data` à la profondeur donnée (2 = enfant direct d'application). */
const meta = (name, value, depth = 2) => {
  const pad = '  '.repeat(depth);
  return [
    `${pad}E: meta-data (line=30)`,
    `${pad}  A: ${ANDROID}:name(0x01010003)=${name}`,
    `${pad}  A: ${ANDROID}:value(0x01010024)=${value}`,
  ];
};
const named = (name) => `"${name}" (Raw: "${name}")`;
const tree = (...lines) =>
  ['E: manifest (line=2)', '  E: application (line=10)', ...lines.flat()].join('\n');
const metrics = meta(named(METRICS), 'true');
const safeBrowsing = meta(named(SAFE_BROWSING), 'false');
const activity = (...lines) => [
  '    E: activity (line=20)',
  `      A: ${ANDROID}:name(0x01010003)="com.jitavision.kila.MainActivity"`,
  ...lines.flat(),
];

describe('ABS-01 méta-données de la WebView dans le binaire', () => {
  it('accepte les deux booléens littéraux sous application', () => {
    expect(auditWebViewMetadata(tree(metrics, safeBrowsing))).toEqual([]);
  });

  it('accepte des méta-données voisines et une activité après elles', () => {
    const other = meta(named('expo.modules.updates.ENABLED'), 'false');
    expect(auditWebViewMetadata(tree(other, metrics, safeBrowsing, activity()))).toEqual([]);
  });

  it('refuse un manifeste sans les méta-données', () => {
    expect(auditWebViewMetadata(tree())).toEqual([
      `Méta-donnée WebView absente : ${METRICS}`,
      `Méta-donnée WebView absente : ${SAFE_BROWSING}`,
    ]);
    expect(auditWebViewMetadata(tree(metrics))).toEqual([
      `Méta-donnée WebView absente : ${SAFE_BROWSING}`,
    ]);
  });

  it('refuse une valeur contraire', () => {
    const wrong = [meta(named(METRICS), 'false'), meta(named(SAFE_BROWSING), 'true')];
    expect(auditWebViewMetadata(tree(...wrong))).toEqual([
      `Méta-donnée WebView : ${METRICS} doit valoir le booléen true`,
      `Méta-donnée WebView : ${SAFE_BROWSING} doit valoir le booléen false`,
    ]);
  });

  it('refuse une valeur écrite en chaîne, même "true"', () => {
    const text = meta(named(METRICS), '"true" (Raw: "true")');
    expect(auditWebViewMetadata(tree(text, safeBrowsing))).toEqual([
      `Méta-donnée WebView : ${METRICS} doit valoir le booléen true`,
    ]);
  });

  it('refuse une valeur donnée par référence à une ressource', () => {
    const reference = meta(named(SAFE_BROWSING), '@0x7f050001');
    expect(auditWebViewMetadata(tree(metrics, reference))).toEqual([
      `Méta-donnée WebView : ${SAFE_BROWSING} doit valoir le booléen false`,
    ]);
  });

  it('refuse une valeur absente ou un entier', () => {
    const noValue = meta(named(METRICS), 'true').slice(0, 2);
    const integer = meta(named(SAFE_BROWSING), '0');
    expect(auditWebViewMetadata(tree(noValue, integer))).toEqual([
      `Méta-donnée WebView : ${METRICS} doit valoir le booléen true`,
      `Méta-donnée WebView : ${SAFE_BROWSING} doit valoir le booléen false`,
    ]);
  });

  it('refuse un doublon, même de même valeur', () => {
    expect(auditWebViewMetadata(tree(metrics, metrics, safeBrowsing))).toEqual([
      `Méta-donnée WebView en double : ${METRICS}`,
    ]);
  });

  it('refuse une méta-donnée placée sous une activité', () => {
    const inActivity = activity(meta(named(METRICS), 'true', 3));
    expect(auditWebViewMetadata(tree(inActivity, safeBrowsing))).toEqual([
      `Méta-donnée WebView hors de application : ${METRICS}`,
    ]);
    expect(auditWebViewMetadata(tree(metrics, inActivity, safeBrowsing))).toEqual([
      `Méta-donnée WebView en double : ${METRICS}`,
      `Méta-donnée WebView hors de application : ${METRICS}`,
    ]);
  });

  it('refuse une méta-donnée nommée par référence (échec fermé)', () => {
    const reference = meta('@0x7f0f0001', 'true');
    expect(auditWebViewMetadata(tree(reference, metrics, safeBrowsing))).toEqual([
      'Référence de ressource refusée : android:name d’une meta-data',
    ]);
  });

  it('ne lit pas l’attribut d’un élément enfant de la méta-donnée', () => {
    const lines = [
      '    E: meta-data (line=30)',
      `      A: ${ANDROID}:name(0x01010003)=${named(METRICS)}`,
      '      E: intent (line=31)',
      `        A: ${ANDROID}:value(0x01010024)=true`,
    ];
    expect(auditWebViewMetadata(tree(lines, safeBrowsing))).toEqual([
      `Méta-donnée WebView : ${METRICS} doit valoir le booléen true`,
    ]);
  });
});
