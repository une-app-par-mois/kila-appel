/**
 * @jest-environment node
 */
// ABS-01, SEC-01, SEC-03 (ticket 028a, décisions du porteur du 2026-11-27) : expo-notifications
// n'est importé que par l'adaptateur src/data/expoNotifications.ts, en imports nommés d'une liste
// fermée ; ses fonctions de jeton push, de sujet, de tâche de fond, de pastille et d'alarme exacte
// sont refusées partout, appli et tests, comme tout import d'expo-application, tout sous-chemin
// et tout `import *`. Contrôle sur l'arbre syntaxique de TypeScript, comme staticChecksFiles.
// Limite connue : un nom calculé (obj[a + b]) n'est pas vu ; la revue et l'audit de l'APK complètent.
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import {
  factoryMocks,
  leavesSrc,
  literalText,
  loadedModule,
  NODE_MODULES,
  stringKey,
} from '@/__fixtures__/expoAccess';
import { scriptKind, TEST_FILE, walkSources } from '@/__fixtures__/sourceFiles';

const OWNER = 'src/data/expoNotifications.ts';
const MODULE = 'expo-notifications';
/** Seuls noms que l'adaptateur peut importer (liste fermée validée par le porteur). */
const ALLOWED = new Set([
  'scheduleNotificationAsync',
  'cancelAllScheduledNotificationsAsync',
  'getPermissionsAsync',
  // Demande de permission : permise, utilisée seulement au 029 (EX-29).
  'requestPermissionsAsync',
  'setNotificationChannelAsync',
  'getLastNotificationResponse',
  'addNotificationResponseReceivedListener',
  'getPresentedNotificationsAsync',
  'dismissNotificationAsync',
  'SchedulableTriggerInputTypes',
  'AndroidImportance',
  // 028b, porteur, 2026-11-27 : premier plan sans pastille ; lire et annuler une relance, en local.
  'setNotificationHandler',
  'getAllScheduledNotificationsAsync',
  'cancelScheduledNotificationAsync',
]);
/** Refusés partout, adaptateur compris : réseau, jeton, tâche de fond, pastille, alarme exacte. */
const REFUSED = new Set([
  'getExpoPushTokenAsync',
  'getDevicePushTokenAsync',
  'setAutoServerRegistrationEnabledAsync',
  'addPushTokenListener',
  'unregisterForNotificationsAsync',
  'registerTaskAsync',
  'unregisterTaskAsync',
  'subscribeToTopicAsync',
  'unsubscribeFromTopicAsync',
  'setBadgeCountAsync',
  'getExactAlarmPermissionsAsync',
  'requestExactAlarmPermissionsAsync',
]);

const isNamespace = (node: ts.Node) =>
  (ts.isImportDeclaration(node) &&
    node.importClause?.namedBindings !== undefined &&
    ts.isNamespaceImport(node.importClause.namedBindings)) ||
  (ts.isExportDeclaration(node) && node.exportClause === undefined) ||
  (ts.isExportDeclaration(node) &&
    node.exportClause !== undefined &&
    ts.isNamespaceExport(node.exportClause));

/** Import nommé de la liste fermée, sans import par défaut ni effet de bord seul. */
const inList = (node: ts.Node): boolean => {
  if (!ts.isImportDeclaration(node)) return false;
  const clause = node.importClause;
  if (!clause || clause.name || !clause.namedBindings) return false;
  if (!ts.isNamedImports(clause.namedBindings)) return false;
  return clause.namedBindings.elements.every((e) => ALLOWED.has((e.propertyName ?? e.name).text));
};

const parse = (file: string, source: string) =>
  ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));

/** Modules chargés par un fichier (test « seul importeur »). */
const modulesOf = (file: string, source: string): string[] => {
  const tree = parse(file, source);
  const mocked = factoryMocks(tree);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    const name = loadedModule(node, mocked);
    if (name !== undefined) found.push(name);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
};

const check = (file: string, source: string): string[] => {
  const tree = parse(file, source);
  const mocked = factoryMocks(tree);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    const name = loadedModule(node, mocked);
    if (name !== undefined && NODE_MODULES.test(name)) found.push('ABS-01 node_modules');
    if (name !== undefined && leavesSrc(file, name)) found.push('ABS-01 hors de src/');
    if (name === 'expo-application' || name?.startsWith('expo-application/'))
      found.push('ABS-01 expo-application');
    if (name?.startsWith(`${MODULE}/`)) found.push('ABS-01 sous-chemin');
    if (name === MODULE) {
      if (file !== OWNER) found.push('ABS-01 import hors de expoNotifications.ts');
      if (isNamespace(node)) found.push('ABS-01 import *');
      else if (file === OWNER && !inList(node)) found.push('ABS-01 import hors liste');
    }
    const key = ts.isElementAccessExpression(node)
      ? literalText(node.argumentExpression)
      : ts.isIdentifier(node)
        ? node.text
        : stringKey(node);
    if (key !== undefined && REFUSED.has(key)) found.push('ABS-01 fonction refusée');
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
};

describe('ABS-01 expo-notifications seulement dans l’adaptateur, en liste fermée', () => {
  it.each([
    "import { scheduleNotificationAsync } from 'expo-notifications';",
    "import type { NotificationResponse } from 'expo-notifications';",
    "export { dismissNotificationAsync } from 'expo-notifications';",
    "const n = require('expo-notifications');",
    "const n = await import('expo-notifications');",
    "type R = import('expo-notifications').NotificationResponse;",
  ])('repère hors de l’adaptateur : %s', (source) => {
    expect(check('src/hooks/useReminders.ts', source)).toEqual([
      'ABS-01 import hors de expoNotifications.ts',
    ]);
  });

  it('autorise l’adaptateur pour la liste fermée, et lui seul', () => {
    const source =
      'import { AndroidImportance, scheduleNotificationAsync as schedule, type ' +
      'SchedulableTriggerInputTypes, requestPermissionsAsync, setNotificationHandler, ' +
      'getAllScheduledNotificationsAsync, cancelScheduledNotificationAsync } ' +
      "from 'expo-notifications';";
    expect(check(OWNER, source)).toEqual([]);
    expect([...REFUSED].filter((name) => ALLOWED.has(name))).toEqual([]);
    expect(check('src/data/expoNotifications.test.ts', source)).toEqual([
      'ABS-01 import hors de expoNotifications.ts',
    ]);
  });

  it.each([
    "import { getNextTriggerDateAsync } from 'expo-notifications';",
    "import { scheduleNotificationAsync, setNotificationCategoryAsync } from 'expo-notifications';",
    "import { getLastNotificationResponseAsync } from 'expo-notifications';",
    "import { dismissAllNotificationsAsync as d } from 'expo-notifications';",
    "import Notifications from 'expo-notifications';",
    "import 'expo-notifications';",
    "import type { Notification } from 'expo-notifications';",
    "export { scheduleNotificationAsync } from 'expo-notifications';",
    "const n = require('expo-notifications');",
    "const n = await import('expo-notifications');",
    "type R = import('expo-notifications').Notification;",
  ])('refuse dans l’adaptateur ce qui sort de la liste : %s', (source) => {
    expect(check(OWNER, source)).toEqual(['ABS-01 import hors liste']);
  });

  it.each([
    "import * as Notifications from 'expo-notifications';",
    "export * from 'expo-notifications';",
    "export * as N from 'expo-notifications';",
  ])('refuse import * partout : %s', (source) => {
    expect(check(OWNER, source)).toEqual(['ABS-01 import *']);
    expect(check('src/app/_layout.tsx', source)).toEqual([
      'ABS-01 import hors de expoNotifications.ts',
      'ABS-01 import *',
    ]);
  });

  it.each([
    "import { scheduleNotificationAsync } from 'expo-notifications/build/index';",
    "const m = require('expo-notifications/build/NotificationScheduler');",
    "import { x } from 'expo-notifications/src/index';",
  ])('refuse tout sous-chemin, adaptateur compris : %s', (source) => {
    expect(check(OWNER, source)).toEqual(['ABS-01 sous-chemin']);
  });

  it.each([
    "import { getAndroidId } from 'expo-application';",
    "import * as Application from 'expo-application';",
    "const a = require('expo-application');",
    "import { x } from 'expo-application/build/Application';",
  ])('refuse expo-application partout : %s', (source) => {
    expect(check(OWNER, source)).toEqual(['ABS-01 expo-application']);
    expect(check('src/data/expoNotifications.test.ts', source)).toEqual([
      'ABS-01 expo-application',
    ]);
  });

  it.each([...REFUSED])('refuse %s partout, par un nom ou des crochets', (name) => {
    const named = `import { ${name} } from 'x'; await ${name}();`;
    expect(check(OWNER, named)).toEqual(['ABS-01 fonction refusée', 'ABS-01 fonction refusée']);
    expect(check('src/a.test.ts', `await Notifications['${name}']();`)).toEqual([
      'ABS-01 fonction refusée',
    ]);
  });

  it.each([
    "import { x } from '../../node_modules/expo-notifications/build/index';",
    "const a = require('../node_modules/expo-application');",
    "import { File } from '/home/x/node_modules/expo-file-system';",
  ])('M1 a) refuse tout chemin vers node_modules/, partout : %s', (source) => {
    expect(check(OWNER, source)).toContain('ABS-01 node_modules');
  });

  it('M1 b) import N = require(…) compte comme un import', () => {
    expect(check('src/hooks/a.ts', "import N = require('expo-notifications');")).toEqual([
      'ABS-01 import hors de expoNotifications.ts',
    ]);
    expect(check(OWNER, "import N = require('expo-notifications');")).toEqual([
      'ABS-01 import hors liste',
    ]);
    expect(check(OWNER, "import A = require('expo-application');")).toEqual([
      'ABS-01 expo-application',
    ]);
  });

  it.each([
    "const { 'getExpoPushTokenAsync': g } = N;",
    "const { ['setBadgeCountAsync']: s } = N;",
    "const o = { 'registerTaskAsync': f };",
    "const o = { ['addPushTokenListener']: f };",
  ])('M1 c) refuse une clé écrite en chaîne : %s', (source) => {
    expect(check(OWNER, source)).toEqual(['ABS-01 fonction refusée']);
  });

  it.each([
    ['src/data/a.ts', "import { x } from '../../plugins/evil';"],
    ['src/a.ts', "const m = require('../scripts/x.js');"],
    ['src/config/libelles/b.ts', "export * from '../../../x';"],
  ])('M1 d) refuse un import relatif qui sort de src/ (%s) : %s', (file, source) => {
    expect(check(file, source)).toEqual(['ABS-01 hors de src/']);
  });

  it('M1 d) laisse passer le JSON hors de src/ et les chemins relatifs internes', () => {
    const source =
      "import app from '../../app.json'; import { a } from './voisin'; import b from '../b';";
    expect(check('src/config/x.ts', source)).toEqual([]);
  });

  it('jest.requireActual et jest.mock sans fabrique chargent le vrai module', () => {
    for (const source of [
      "const n = jest.requireActual('expo-notifications');",
      "jest.mock('expo-notifications');",
      "jest.mock('expo-sqlite', () => ({})); const n = jest.requireMock('expo-notifications');",
    ])
      expect(check('src/a.test.ts', source)).toEqual([
        'ABS-01 import hors de expoNotifications.ts',
      ]);
  });

  it('jest.requireMock d’un module simulé par une fabrique : la simulation, pas le module', () => {
    const source =
      "jest.mock('expo-notifications', () => ({})); const n = jest.requireMock('expo-notifications');";
    expect(check('src/a.test.ts', source)).toEqual([]);
  });

  it('laisse passer le texte d’une chaîne et les autres noms', () => {
    const source = "const m = 'setBadgeCountAsync'; const badge = 0; schedule(r);";
    expect(check(OWNER, source)).toEqual([]);
  });

  it('analyse aussi le JavaScript (.js, .jsx, .mjs, .cjs)', () => {
    for (const file of ['src/a.js', 'src/a.jsx', 'src/a.mjs', 'src/a.cjs']) {
      expect(
        check(file, "const n = require('expo-notifications'); n.setBadgeCountAsync(1);"),
      ).toEqual(['ABS-01 import hors de expoNotifications.ts', 'ABS-01 fonction refusée']);
    }
  });
});

describe('Le code du dépôt respecte le contrôle des notifications', () => {
  const root = join(__dirname, '..');
  const files = walkSources(join(root, 'src')).map((path) => relative(root, path));
  const read = (file: string) => readFileSync(join(root, file), 'utf8');
  // Ce fichier-ci nomme ces modules et ces fonctions pour les contrôler.
  const SELF = 'src/staticChecksNotifications.test.ts';

  it('aucun écart dans src/, tests compris', () => {
    const violations = files
      .filter((file) => file !== SELF)
      .flatMap((file) => check(file, read(file)).map((rule) => ({ file, rule })));
    expect(violations).toEqual([]);
  });

  it('seul src/data/expoNotifications.ts importe expo-notifications', () => {
    const importing = files
      .filter((file) => !TEST_FILE.test(file))
      .filter((file) => modulesOf(file, read(file)).includes(MODULE));
    expect(importing).toEqual([OWNER]);
  });
});
