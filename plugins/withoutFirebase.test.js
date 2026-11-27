/**
 * @jest-environment node
 */
// ABS-01, ABS-07 : aucun composant Firebase ni datatransport dans le manifeste fusionné
// (décision datée du porteur du 2026-11-27, ticket 026).
const { FIREBASE_COMPONENTS, removeFirebaseComponents } = require('./withoutFirebase');
const app = require('../app.json');

const TOOLS = 'http://schemas.android.com/tools';
const manifest = () => ({
  manifest: {
    $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
    application: [{ $: { 'android:name': '.MainApplication' }, activity: [{ $: {} }] }],
  },
});
const removed = (result, tag) =>
  (result.manifest.application[0][tag] ?? []).filter((e) => e.$['tools:node'] === 'remove');

describe('ABS-01 plugin withoutFirebase', () => {
  it('nomme les 8 composants de la décision du porteur', () => {
    expect(FIREBASE_COMPONENTS.map((c) => c.name).sort()).toEqual(
      [
        'com.google.android.datatransport.runtime.backends.TransportBackendDiscovery',
        'com.google.android.datatransport.runtime.scheduling.jobscheduling.AlarmManagerSchedulerBroadcastReceiver',
        'com.google.android.datatransport.runtime.scheduling.jobscheduling.JobInfoSchedulerService',
        'com.google.firebase.components.ComponentDiscoveryService',
        'com.google.firebase.iid.FirebaseInstanceIdReceiver',
        'com.google.firebase.messaging.FirebaseMessagingService',
        'com.google.firebase.provider.FirebaseInitProvider',
        'expo.modules.notifications.service.ExpoFirebaseMessagingService',
      ].sort(),
    );
  });

  it('déclare l’espace de noms tools', () => {
    expect(removeFirebaseComponents(manifest()).manifest.$['xmlns:tools']).toBe(TOOLS);
  });

  it('retire chaque composant par tools:node="remove", sous la bonne balise', () => {
    const result = removeFirebaseComponents(manifest());
    expect(removed(result, 'service')).toHaveLength(5);
    expect(removed(result, 'receiver')).toHaveLength(2);
    expect(removed(result, 'provider')).toHaveLength(1);
    expect(result.manifest.application[0].activity).toHaveLength(1);
  });

  it('donne au fournisseur FirebaseInitProvider ses android:authorities', () => {
    const [provider] = removed(removeFirebaseComponents(manifest()), 'provider');
    expect(provider.$).toEqual({
      'android:name': 'com.google.firebase.provider.FirebaseInitProvider',
      'android:authorities': `\${applicationId}.firebaseinitprovider`,
      'tools:node': 'remove',
    });
  });

  it('ne crée aucun doublon s’il est appliqué deux fois', () => {
    const twice = removeFirebaseComponents(removeFirebaseComponents(manifest()));
    expect(removed(twice, 'service')).toHaveLength(5);
    expect(removed(twice, 'receiver')).toHaveLength(2);
    expect(removed(twice, 'provider')).toHaveLength(1);
  });

  it('marque à retirer un composant déjà déclaré, sans le dupliquer', () => {
    const base = manifest();
    base.manifest.application[0].receiver = [
      { $: { 'android:name': 'com.google.firebase.iid.FirebaseInstanceIdReceiver' } },
    ];
    const result = removeFirebaseComponents(base);
    expect(result.manifest.application[0].receiver).toHaveLength(2);
    expect(removed(result, 'receiver')).toHaveLength(2);
  });

  it('est déclaré dans app.json', () => {
    expect(app.expo.plugins).toContain('./plugins/withoutFirebase.js');
  });
});
