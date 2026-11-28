// ABS-01, ABS-07 : expo-notifications tire Firebase Cloud Messaging sur Android (ticket 026).
// Sans google-services.json, Firebase ne s'initialise pas ; ce plugin retire en plus du manifeste
// fusionné ses composants et ceux de datatransport (`tools:node="remove"`), selon la décision
// datée du porteur du 2026-11-27. Vérifié sur le binaire par scripts/audit-apk.js.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const FIREBASE_COMPONENTS = [
  { tag: 'service', name: 'expo.modules.notifications.service.ExpoFirebaseMessagingService' },
  { tag: 'service', name: 'com.google.firebase.messaging.FirebaseMessagingService' },
  { tag: 'service', name: 'com.google.firebase.components.ComponentDiscoveryService' },
  {
    tag: 'service',
    name: 'com.google.android.datatransport.runtime.backends.TransportBackendDiscovery',
  },
  {
    tag: 'service',
    name: 'com.google.android.datatransport.runtime.scheduling.jobscheduling.JobInfoSchedulerService',
  },
  { tag: 'receiver', name: 'com.google.firebase.iid.FirebaseInstanceIdReceiver' },
  {
    tag: 'receiver',
    name: 'com.google.android.datatransport.runtime.scheduling.jobscheduling.AlarmManagerSchedulerBroadcastReceiver',
  },
  {
    tag: 'provider',
    name: 'com.google.firebase.provider.FirebaseInitProvider',
    // Le fusionneur exige l'autorité d'un fournisseur, même retiré. `\${applicationId}` est
    // le texte littéral que Gradle remplace par le nom du paquet (pas une substitution JS).
    authorities: `\${applicationId}.firebaseinitprovider`,
  },
];

/**
 * Marque chaque composant `tools:node="remove"` : la déclaration existante s'il y en a une,
 * sinon une nouvelle. Appliqué deux fois, le résultat est le même (aucun doublon).
 */
const removeFirebaseComponents = (androidManifest) => {
  const manifest = AndroidConfig.Manifest.ensureToolsAvailable(androidManifest);
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  for (const { tag, name, authorities } of FIREBASE_COMPONENTS) {
    const removal = {
      'android:name': name,
      ...(authorities === undefined ? {} : { 'android:authorities': authorities }),
      'tools:node': 'remove',
    };
    const entries = application[tag] ?? [];
    const existing = entries.find((e) => e.$?.['android:name'] === name);
    if (existing) existing.$ = { ...existing.$, ...removal };
    else application[tag] = [...entries, { $: removal }];
  }
  return manifest;
};

const withoutFirebase = (config) =>
  withAndroidManifest(config, (modConfig) => {
    modConfig.modResults = removeFirebaseComponents(modConfig.modResults);
    return modConfig;
  });

module.exports = withoutFirebase;
module.exports.FIREBASE_COMPONENTS = FIREBASE_COMPONENTS;
module.exports.removeFirebaseComponents = removeFirebaseComponents;
