/**
 * @jest-environment node
 */
// Tests de l'audit du binaire Android (SEC-02, ABS-01, ABS-07), sur des sorties aapt2 fictives.
const { auditPermissions, auditManifest, latestVersion, parseExpected } = require('./audit-apk');

const dump = (...names) =>
  ['package: com.jitavision.kila', ...names.map((n) => `uses-permission: name='${n}'`)].join('\n');

const EXPECTED = ['android.permission.VIBRATE', 'com.jitavision.kila.DYNAMIC_RECEIVER'];

describe('SEC-02 permissions du binaire = liste attendue', () => {
  it('ne signale rien quand les listes sont égales', () => {
    expect(auditPermissions(dump(...EXPECTED), EXPECTED)).toEqual([]);
  });

  it('signale une permission en trop', () => {
    expect(auditPermissions(dump(...EXPECTED, 'android.permission.CAMERA'), EXPECTED)).toEqual([
      'Permission non attendue : android.permission.CAMERA',
    ]);
  });

  it('signale une permission attendue absente (liste à mettre à jour)', () => {
    expect(auditPermissions(dump('android.permission.VIBRATE'), EXPECTED)).toEqual([
      'Permission attendue absente : com.jitavision.kila.DYNAMIC_RECEIVER',
    ]);
  });

  it('lit aussi les permissions réservées à Android 6 et plus', () => {
    const text = `${dump(...EXPECTED)}\nuses-permission-sdk-23: name='android.permission.CAMERA'`;
    expect(auditPermissions(text, EXPECTED)).toEqual([
      'Permission non attendue : android.permission.CAMERA',
    ]);
  });

  it('ABS-01 refuse INTERNET même si la liste attendue la contient', () => {
    const withInternet = [...EXPECTED, 'android.permission.INTERNET'];
    expect(auditPermissions(dump(...withInternet), withInternet)).toEqual([
      'INTERNET interdite (ABS-01)',
    ]);
  });

  it('refuse une sortie aapt2 sans ligne package (binaire illisible)', () => {
    expect(auditPermissions('', EXPECTED)).toEqual(['Sortie aapt2 illisible']);
  });
});

describe('parseExpected : liste figée du dépôt', () => {
  it('ignore les commentaires et les lignes vides', () => {
    expect(parseExpected('# commentaire\n\nandroid.permission.VIBRATE\n  \n')).toEqual([
      'android.permission.VIBRATE',
    ]);
  });
});

describe('Manifeste du binaire (ABS-07, sauvegarde système)', () => {
  const ANDROID = 'http://schemas.android.com/apk/res/android';
  const manifest = (...attrs) =>
    [
      'E: manifest (line=2)',
      '  E: application (line=10)',
      ...attrs.map((a) => `    A: ${ANDROID}:${a}`),
    ].join('\n');

  it('ne signale rien avec allowBackup=false et sans lien profond', () => {
    expect(auditManifest(manifest('allowBackup(0x01010280)=false'))).toEqual([]);
  });

  it('signale allowBackup absent ou vrai', () => {
    expect(auditManifest(manifest())).toEqual(['allowBackup doit valoir false']);
    expect(auditManifest(manifest('allowBackup(0x01010280)=true'))).toEqual([
      'allowBackup doit valoir false',
    ]);
  });

  // Forme réelle de `aapt2 dump xmltree` : un élément par ligne, imbrication par indentation.
  const tree = (scheme) =>
    [
      'N: android=http://schemas.android.com/apk/res/android (line=2)',
      '  E: manifest (line=2)',
      '    E: queries (line=7)',
      '      E: intent (line=8)',
      '        E: data (line=11)',
      `          A: ${ANDROID}:scheme(0x01010027)="https" (Raw: "https")`,
      '    E: application (line=14)',
      `      A: ${ANDROID}:allowBackup(0x01010280)=false`,
      '      E: activity (line=19)',
      '        E: intent-filter (line=20)',
      '          E: action (line=21)',
      ...(scheme
        ? [
            '          E: data (line=22)',
            `            A: ${ANDROID}:scheme(0x01010027)="${scheme}" (Raw: "${scheme}")`,
          ]
        : []),
    ].join('\n');

  it('ABS-07 ignore le scheme d’un bloc <queries> (voir les navigateurs, pas un lien entrant)', () => {
    expect(auditManifest(tree())).toEqual([]);
  });

  it('ABS-07 signale un lien profond (android:scheme dans un intent-filter)', () => {
    expect(auditManifest(tree('kila'))).toEqual(['Lien profond déclaré : kila']);
  });

  it('ABS-07 signale aussi un scheme donné par référence à une ressource', () => {
    const text = tree('x').replace('="x" (Raw: "x")', '=@0x7f0e0012');
    expect(auditManifest(text)).toEqual(['Lien profond déclaré : @0x7f0e0012']);
  });
});

describe('latestVersion : choix des build-tools', () => {
  it('prend la plus haute version stable, en ordre numérique', () => {
    expect(latestVersion(['9.0.0', '36.0.0-rc5', '36.0.0', '35.0.1', 'tmp'])).toBe('36.0.0');
    expect(latestVersion(['36.1.0', '36.10.0'])).toBe('36.10.0');
  });

  it('rend undefined sans version stable', () => {
    expect(latestVersion(['tmp'])).toBeUndefined();
  });
});

describe('ABS-01 composants Firebase et datatransport refusés dans le binaire', () => {
  const ANDROID = 'http://schemas.android.com/apk/res/android';
  const component = (tag, name, { exported, action } = {}) => [
    `      E: ${tag} (line=30)`,
    `        A: ${ANDROID}:name(0x01010003)="${name}" (Raw: "${name}")`,
    ...(exported === undefined ? [] : [`        A: ${ANDROID}:exported(0x01010010)=${exported}`]),
    ...(action
      ? [
          '        E: intent-filter (line=31)',
          '          E: action (line=32)',
          `            A: ${ANDROID}:name(0x01010003)="${action}" (Raw: "${action}")`,
        ]
      : []),
  ];
  const tree = (...components) =>
    [
      '  E: manifest (line=2)',
      '    E: application (line=14)',
      `      A: ${ANDROID}:allowBackup(0x01010280)=false`,
      ...components.flat(),
    ].join('\n');

  it.each(['activity', 'activity-alias', 'service', 'receiver', 'provider'])(
    'refuse un %s dont le nom commence par com.google.firebase.',
    (tag) => {
      expect(auditManifest(tree(component(tag, 'com.google.firebase.X')))).toEqual([
        'Composant Firebase ou datatransport : com.google.firebase.X',
      ]);
    },
  );

  it('refuse un composant com.google.android.datatransport.', () => {
    const name = 'com.google.android.datatransport.runtime.backends.TransportBackendDiscovery';
    expect(auditManifest(tree(component('service', name)))).toEqual([
      `Composant Firebase ou datatransport : ${name}`,
    ]);
  });

  it('refuse un composant com.google.android.gms. exporté', () => {
    const name = 'com.google.android.gms.Y';
    expect(auditManifest(tree(component('receiver', name, { exported: true })))).toEqual([
      `Composant Google Play services exporté : ${name}`,
    ]);
  });

  it('accepte GoogleApiActivity non exportée', () => {
    const name = 'com.google.android.gms.common.api.GoogleApiActivity';
    expect(auditManifest(tree(component('activity', name, { exported: false })))).toEqual([]);
  });

  it.each(['com.google.firebase.MESSAGING_EVENT', 'com.google.android.c2dm.intent.RECEIVE'])(
    'refuse un intent-filter qui déclare %s',
    (action) => {
      const service = component('service', 'expo.modules.Z', { exported: false, action });
      expect(auditManifest(tree(service))).toEqual([`Intent-filter de messagerie : ${action}`]);
    },
  );

  it('accepte les composants de l’appli et leurs intent-filter ordinaires', () => {
    const name = 'expo.modules.notifications.service.NotificationsService';
    const action = 'android.intent.action.BOOT_COMPLETED';
    expect(auditManifest(tree(component('receiver', name, { exported: false, action })))).toEqual(
      [],
    );
  });
});
