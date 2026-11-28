/**
 * @jest-environment node
 */
// Tests de l'audit du binaire Android (SEC-02, ABS-01, ABS-07), sur des sorties aapt2 fictives.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
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

  // L'espace de noms est comparé tel quel : ses points ne sont pas des jokers (CodeQL).
  it.each([
    'http://schemasXandroidXcom/apk/res/android',
    'http://schemas/android/com/apk/res/android',
  ])('SEC-02 ne lit pas un attribut d’un autre espace de noms : %s', (namespace) => {
    const line = ':scheme(0x01010027)="kila"';
    const text = tree('kila').replace(`${ANDROID}${line}`, `${namespace}${line}`);
    expect(text).toContain(`A: ${namespace}${line}`);
    expect(auditManifest(text)).toEqual([]);
  });

  it('SEC-02 lit une valeur sans guillemets jusqu’au premier blanc', () => {
    const text = tree('x').replace('="x" (Raw: "x")', '=@0x7f0e0012\t(Raw: "y")');
    expect(auditManifest(text)).toEqual(['Lien profond déclaré : @0x7f0e0012']);
  });

  it('SEC-02 ne lit pas un attribut sans identifiant de ressource hexadécimal', () => {
    expect(auditManifest(tree('x').replace('scheme(0x01010027)="x"', 'scheme(0x)="x"'))).toEqual(
      [],
    );
    expect(auditManifest(tree('x').replace('scheme(0x01010027)="x"', 'scheme(0xZZ)="x"'))).toEqual(
      [],
    );
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
  // `name` commençant par @ : référence à une ressource, comme l'écrit aapt2 (=@0x7f…).
  const value = (v) => (String(v).startsWith('@') ? v : `"${v}" (Raw: "${v}")`);
  const component = (tag, name, { exported, action, target } = {}) => [
    `      E: ${tag} (line=30)`,
    `        A: ${ANDROID}:name(0x01010003)=${value(name)}`,
    ...(target === undefined
      ? []
      : [`        A: ${ANDROID}:targetActivity(0x01010202)=${value(target)}`]),
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

  const GOOGLE_API = 'com.google.android.gms.common.api.GoogleApiActivity';
  const ALLOWED = [GOOGLE_API];

  it('accepte GoogleApiActivity non exportée, inscrite dans la liste figée', () => {
    const activity = component('activity', GOOGLE_API, { exported: false });
    expect(auditManifest(tree(activity), ALLOWED)).toEqual([]);
  });

  it('refuse un composant gms inscrit dans la liste mais exporté', () => {
    const activity = component('activity', GOOGLE_API, { exported: true });
    expect(auditManifest(tree(activity), ALLOWED)).toEqual([
      `Composant Google Play services exporté : ${GOOGLE_API}`,
    ]);
  });

  it.each([true, false])('refuse un composant gms hors de la liste (exporté : %s)', (exported) => {
    const name = 'com.google.android.gms.Y';
    expect(auditManifest(tree(component('receiver', name, { exported })), ALLOWED)).toEqual([
      `Composant Google Play services non attendu : ${name}`,
    ]);
  });

  it('liste figée du dépôt : GoogleApiActivity seulement', () => {
    const file = join(__dirname, '..', 'config', 'composants-google-attendus.txt');
    expect(parseExpected(readFileSync(file, 'utf8'))).toEqual(ALLOWED);
  });

  it('refuse GoogleApiActivity sans liste figée (échec fermé)', () => {
    expect(auditManifest(tree(component('activity', GOOGLE_API, { exported: false })))).toEqual([
      `Composant Google Play services non attendu : ${GOOGLE_API}`,
    ]);
  });

  it('applique les refus à la cible d’un activity-alias', () => {
    const firebase = component('activity-alias', 'com.jitavision.kila.Alias', {
      target: 'com.google.firebase.X',
    });
    const gms = component('activity-alias', 'com.jitavision.kila.Alias2', {
      target: 'com.google.android.gms.Y',
    });
    expect(auditManifest(tree(firebase, gms), ALLOWED)).toEqual([
      'Composant Firebase ou datatransport : com.google.firebase.X',
      'Composant Google Play services non attendu : com.google.android.gms.Y',
    ]);
  });

  it('refuse une référence de ressource pour android:name ou android:exported', () => {
    const byName = component('service', '@0x7f0e0012');
    const byExported = component('receiver', 'expo.modules.R', { exported: '@0x7f050001' });
    expect(auditManifest(tree(byName, byExported), ALLOWED)).toEqual([
      'Référence de ressource refusée : android:name d’un service',
      'Référence de ressource refusée : android:exported de expo.modules.R',
    ]);
  });

  it('refuse une référence de ressource pour la cible d’un activity-alias', () => {
    const alias = component('activity-alias', 'com.jitavision.kila.Alias', {
      target: '@0x7f0e0013',
    });
    expect(auditManifest(tree(alias), ALLOWED)).toEqual([
      'Référence de ressource refusée : android:targetActivity de com.jitavision.kila.Alias',
    ]);
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
