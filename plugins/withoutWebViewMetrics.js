// ABS-01 : expo-print rend le rapport PDF dans une WebView d'Android (ticket 038). Le paquet
// WebView du système peut envoyer ses propres mesures d'usage et interroger Safe Browsing, hors du
// processus de l'appli, donc malgré l'absence de la permission INTERNET. Ce plugin s'y oppose par
// les deux méta-données documentées d'Android, selon la décision du porteur du 2026-11-28.
// `tools:replace` : aucune bibliothèque ne peut imposer une autre valeur à la fusion du manifeste.
// Vérifié sur le binaire par scripts/audit-apk.js. Limite : MetricsOptOut ne couvre que les
// mesures d'usage.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const WEBVIEW_METADATA = [
  { name: 'android.webkit.WebView.MetricsOptOut', value: 'true' },
  { name: 'android.webkit.WebView.EnableSafeBrowsing', value: 'false' },
];

/**
 * Remplace toute déclaration existante de ces deux noms sous <application> par la valeur
 * décidée. Appliqué deux fois, le résultat est le même (aucun doublon).
 */
const addWebViewMetadata = (androidManifest) => {
  const manifest = AndroidConfig.Manifest.ensureToolsAvailable(androidManifest);
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  const names = WEBVIEW_METADATA.map((m) => m.name);
  const others = (application['meta-data'] ?? []).filter(
    (m) => !names.includes(m.$?.['android:name']),
  );
  const ours = WEBVIEW_METADATA.map(({ name, value }) => ({
    $: { 'android:name': name, 'android:value': value, 'tools:replace': 'android:value' },
  }));
  application['meta-data'] = [...others, ...ours];
  return manifest;
};

const withoutWebViewMetrics = (config) =>
  withAndroidManifest(config, (modConfig) => {
    modConfig.modResults = addWebViewMetadata(modConfig.modResults);
    return modConfig;
  });

module.exports = withoutWebViewMetrics;
module.exports.WEBVIEW_METADATA = WEBVIEW_METADATA;
module.exports.addWebViewMetadata = addWebViewMetadata;
