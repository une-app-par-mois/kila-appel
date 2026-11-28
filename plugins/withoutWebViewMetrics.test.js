/**
 * @jest-environment node
 */
// ABS-01 : la WebView d'Android (rapport PDF, expo-print) n'envoie ni mesures d'usage ni requêtes
// Safe Browsing (décision du porteur du 2026-11-28, ticket 038).
const { WEBVIEW_METADATA, addWebViewMetadata } = require('./withoutWebViewMetrics');
const app = require('../app.json');

const TOOLS = 'http://schemas.android.com/tools';
const METRICS = 'android.webkit.WebView.MetricsOptOut';
const SAFE_BROWSING = 'android.webkit.WebView.EnableSafeBrowsing';

const manifest = (metaData) => ({
  manifest: {
    $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
    application: [
      {
        $: { 'android:name': '.MainApplication' },
        activity: [{ $: { 'android:name': '.MainActivity' } }],
        ...(metaData === undefined ? {} : { 'meta-data': metaData }),
      },
    ],
  },
});
const metaData = (result) => result.manifest.application[0]['meta-data'].map((m) => m.$);
const expected = [
  { 'android:name': METRICS, 'android:value': 'true', 'tools:replace': 'android:value' },
  { 'android:name': SAFE_BROWSING, 'android:value': 'false', 'tools:replace': 'android:value' },
];

describe('ABS-01 plugin withoutWebViewMetrics', () => {
  it('nomme les deux méta-données de la décision du porteur, avec leur valeur', () => {
    expect(WEBVIEW_METADATA).toEqual([
      { name: METRICS, value: 'true' },
      { name: SAFE_BROWSING, value: 'false' },
    ]);
  });

  it('déclare l’espace de noms tools', () => {
    expect(addWebViewMetadata(manifest()).manifest.$['xmlns:tools']).toBe(TOOLS);
  });

  it('ajoute les deux méta-données sous application, avec tools:replace', () => {
    const result = addWebViewMetadata(manifest());
    expect(metaData(result)).toEqual(expected);
    expect(result.manifest.application[0].activity).toEqual([
      { $: { 'android:name': '.MainActivity' } },
    ]);
  });

  it('est idempotent : appliqué deux fois, le même manifeste', () => {
    const once = addWebViewMetadata(manifest());
    const twice = addWebViewMetadata(addWebViewMetadata(manifest()));
    expect(twice).toEqual(once);
    expect(metaData(twice)).toHaveLength(2);
  });

  it('remplace une valeur contraire déjà déclarée, sans doublon', () => {
    const base = manifest([
      { $: { 'android:name': METRICS, 'android:value': 'false' } },
      { $: { 'android:name': SAFE_BROWSING, 'android:value': '@bool/x' } },
    ]);
    expect(metaData(addWebViewMetadata(base))).toEqual(expected);
  });

  it('garde les autres méta-données de l’application', () => {
    const other = { 'android:name': 'expo.modules.updates.ENABLED', 'android:value': 'false' };
    const result = addWebViewMetadata(manifest([{ $: other }]));
    expect(metaData(result)).toEqual([other, ...expected]);
  });

  it('est déclaré dans app.json, en dernier', () => {
    expect(app.expo.plugins.at(-1)).toBe('./plugins/withoutWebViewMetrics.js');
  });
});
