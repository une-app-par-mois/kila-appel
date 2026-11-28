// Imitations des modules natifs de fichiers et de base pour Jest (ticket 014b), sur node:fs et
// node:sqlite : on teste le code des adaptateurs (expoFiles.ts, expoDb.ts), pas les modules natifs
// (ADR-008). À utiliser dans une fabrique de jest.mock : `require(ce fichier).fakeFileSystem()`.
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

type Part = string | { uri: string };
const uriOf = (parts: Part[]) =>
  parts
    .map((p) => (typeof p === 'string' ? p : p.uri))
    .reduce((a, b) => `${a.replace(/\/+$/, '')}/${b.replace(/^\/+/, '')}`);
const pathOf = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));

class FakeFile {
  uri: string;
  constructor(...parts: Part[]) {
    this.uri = uriOf(parts);
  }
  get size() {
    return existsSync(pathOf(this.uri)) ? statSync(pathOf(this.uri)).size : 0;
  }
  open() {
    const fd = openSync(pathOf(this.uri), 'r');
    return {
      readBytes: async (length: number) => {
        const buffer = new Uint8Array(length);
        const read = readSync(fd, buffer, 0, length, 0);
        return buffer.slice(0, read);
      },
      close: () => closeSync(fd),
    };
  }
  // Ticket 033 : create échoue si le fichier existe ; write écrit du texte ou des octets.
  create() {
    if (existsSync(pathOf(this.uri))) throw new Error('FileAlreadyExists');
    writeFileSync(pathOf(this.uri), '');
  }
  async write(content: string | Uint8Array) {
    writeFileSync(pathOf(this.uri), content);
  }
  async copy(destination: FakeFile) {
    if (existsSync(pathOf(destination.uri))) throw new Error('DestinationAlreadyExists');
    copyFileSync(pathOf(this.uri), pathOf(destination.uri));
  }
  // Ticket 040a : déplacement (copie puis effacement : node.d.ts ne déclare que ces deux-là),
  // jamais par-dessus un fichier existant ; `uri` suit le fichier.
  async move(destination: FakeFile) {
    if (existsSync(pathOf(destination.uri))) throw new Error('DestinationAlreadyExists');
    copyFileSync(pathOf(this.uri), pathOf(destination.uri));
    rmSync(pathOf(this.uri), { recursive: true });
    this.uri = destination.uri;
  }
  get exists() {
    return existsSync(pathOf(this.uri));
  }
  delete() {
    rmSync(pathOf(this.uri), { recursive: true });
  }
}

class FakeDirectory {
  uri: string;
  constructor(...parts: Part[]) {
    this.uri = `${uriOf(parts).replace(/\/+$/, '')}/`;
  }
  get exists() {
    return existsSync(pathOf(this.uri));
  }
  create(options?: { intermediates?: boolean }) {
    mkdirSync(pathOf(this.uri), { recursive: options?.intermediates === true });
  }
  delete() {
    rmSync(pathOf(this.uri), { recursive: true, force: true });
  }
}

/**
 * Android : le cache de l'appareil est `<root>/cache dir/` (avec une espace : URI encodées).
 * iOS (ticket 014e) : conteneur `<root>/app data/`, cache `Library/Caches/`, dossier `tmp/`.
 */
export const fakeFileSystem = (layout: 'android' | 'ios' = 'android') => {
  const root = mkdtempSync(join(tmpdir(), 'kila-expo-fs-'));
  const cache = layout === 'ios' ? `${root}/app data/Library/Caches/` : `${root}/cache dir/`;
  return {
    File: FakeFile,
    Directory: FakeDirectory,
    FileMode: { ReadOnly: 'r' },
    Paths: { cache: new FakeDirectory(`file://${cache}`), root },
  };
};

const fileUri = (path: string) => `file://${path.split('/').map(encodeURIComponent).join('/')}`;

/**
 * expo-document-picker (ticket 014e). Avec `copyToCacheDirectory`, copie le fichier que rend
 * `choose()` dans `<cacheRoot>/DocumentPicker/` (Android et iOS) ; sans, rend la copie que
 * dépose le sélecteur d'iOS (`asCopy`) dans `inboxRoot()`. `null` : annulé ; `choose` peut lever
 * une erreur (sélecteur en échec). Options relevées par `options` ; `size` : taille annoncée ;
 * `name` : nom du fichier choisi (ticket 033, `choisi.csv` pour l'import).
 */
export const fakeDocumentPicker = (
  cacheRoot: () => string,
  choose: () => string | null,
  options: (o: object) => void,
  inboxRoot: () => string = () => join(cacheRoot(), 'sans-inbox'),
  size: () => number | undefined = () => undefined,
  name: () => string = () => 'choisi.db',
) => {
  let next = 0;
  return {
    getDocumentAsync: async (o: { copyToCacheDirectory?: boolean }) => {
      options(o);
      const source = choose();
      if (source === null) return { canceled: true, assets: null };
      const dir = o.copyToCacheDirectory ? join(cacheRoot(), 'DocumentPicker') : inboxRoot();
      mkdirSync(dir, { recursive: true });
      next += 1;
      const path = join(dir, `${next}-${name()}`);
      copyFileSync(source, path);
      const asset = { name: name(), uri: fileUri(path), lastModified: 0, size: size() };
      return { canceled: false, assets: [asset] };
    },
  };
};

/**
 * expo-print (ticket 040a) : `render` imite la fonction de rendu en fichier. Elle relève ses options,
 * écrit `content` (un faux PDF, `%PDF-` en tête) dans `<printRoot()>/<n>-rapport.pdf`, comme le
 * module natif dans `cache/Print/`, et rend son URI. `uri` force l'URI rendue (chemins piégés) ;
 * `fail` : rendu en échec, message avec un nom fictif. La clé de la fonction du module n'est écrite
 * que dans la fabrique `jest.mock` d'un test (staticChecksPrint, 038).
 */
export const fakePrint = (printRoot: () => string) => {
  const state = {
    calls: [] as object[],
    content: '%PDF-1.7\n% rapport fictif\n' as string | Uint8Array,
    uri: null as string | null,
    fail: false,
  };
  let next = 0;
  const render = async (options: object) => {
    state.calls.push(options);
    if (state.fail) throw new Error(`${printRoot()}/Dupont-Lea.pdf`);
    if (state.uri !== null) return { uri: state.uri, numberOfPages: 1 };
    mkdirSync(printRoot(), { recursive: true });
    next += 1;
    const path = join(printRoot(), `${next}-rapport.pdf`);
    writeFileSync(path, state.content);
    return { uri: fileUri(path), numberOfPages: 1 };
  };
  return { state, render };
};

/** expo-sqlite : ouverture par nom et dossier (ou ':memory:'), options relevées par le mock. */
export const fakeSqlite = (open: (name: string, options?: object, directory?: string) => void) => ({
  openDatabaseAsync: async (name: string, options?: object, directory?: string) => {
    open(name, options, directory);
    const raw = new DatabaseSync(name === ':memory:' ? name : join(directory ?? '', name));
    return {
      runAsync: async (sql: string, params: (string | number | null)[]) => {
        const r = raw.prepare(sql).run(...params);
        return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
      },
      getAllAsync: async (sql: string, params: (string | number | null)[]) =>
        raw.prepare(sql).all(...params),
      execAsync: async (sql: string) => raw.exec(sql),
      closeAsync: async () => raw.close(),
    };
  },
});

type FakeRequest = { identifier: string; content: { data?: Record<string, unknown> } };
type FakeResponse = { notification: { date: number; request: FakeRequest } };
type FakeSchedule = { identifier: string; content: object; trigger: object };

/**
 * expo-notifications (ticket 028a) : notifications programmées et affichées tenues en mémoire,
 * permission, réponse à la demande et dernière réponse réglables ; une fonction nommée dans `fail` échoue. Constantes
 * recopiées du paquet (58.1.10), car seul l'adaptateur peut l'importer (ABS-01).
 */
export const fakeNotifications = () => {
  const state = {
    scheduled: [] as FakeSchedule[],
    presented: [] as FakeRequest[],
    channels: [] as { id: string; channel: object }[],
    permission: { granted: false, canAskAgain: true, status: 'undetermined' },
    /** Réponse du système à la demande (029) et options de chaque demande. */
    answer: { granted: true, canAskAgain: true, status: 'granted' },
    requests: [] as object[],
    lastResponse: null as FakeResponse | null,
    listeners: [] as ((response: FakeResponse) => void)[],
    fail: new Set<string>(),
  };
  const guard = (name: string) => {
    if (state.fail.has(name)) throw new Error(`échec simulé : ${name}`);
  };
  return {
    state,
    SchedulableTriggerInputTypes: { DATE: 'date' },
    AndroidImportance: { DEFAULT: 5, HIGH: 6 },
    scheduleNotificationAsync: async (request: FakeSchedule) => {
      guard('scheduleNotificationAsync');
      state.scheduled = state.scheduled.filter((x) => x.identifier !== request.identifier);
      state.scheduled.push(request);
      return request.identifier;
    },
    cancelAllScheduledNotificationsAsync: async () => {
      guard('cancelAllScheduledNotificationsAsync');
      state.scheduled = [];
    },
    getPermissionsAsync: async () => {
      guard('getPermissionsAsync');
      return state.permission;
    },
    requestPermissionsAsync: async (options: object) => {
      guard('requestPermissionsAsync');
      state.requests.push(options);
      state.permission = state.answer;
      return state.answer;
    },
    setNotificationChannelAsync: async (id: string, channel: object) => {
      guard('setNotificationChannelAsync');
      state.channels.push({ id, channel });
      return channel;
    },
    getPresentedNotificationsAsync: async () => {
      guard('getPresentedNotificationsAsync');
      return state.presented.map((request) => ({ date: 0, request }));
    },
    dismissNotificationAsync: async (identifier: string) => {
      guard('dismissNotificationAsync');
      state.presented = state.presented.filter((x) => x.identifier !== identifier);
    },
    getLastNotificationResponse: () => {
      guard('getLastNotificationResponse');
      return state.lastResponse;
    },
    addNotificationResponseReceivedListener: (listener: (response: FakeResponse) => void) => {
      guard('addNotificationResponseReceivedListener');
      state.listeners.push(listener);
      return {
        remove: () => {
          state.listeners = state.listeners.filter((x) => x !== listener);
        },
      };
    },
    // Ticket 028b : comportement au premier plan, relevé par jest.spyOn dans les tests.
    setNotificationHandler: (_handler: object | null) => {
      guard('setNotificationHandler');
    },
    // Ticket 028b : n'annuler que les relances qui ne sont plus prévues.
    getAllScheduledNotificationsAsync: async () => {
      guard('getAllScheduledNotificationsAsync');
      return [...state.scheduled];
    },
    cancelScheduledNotificationAsync: async (identifier: string) => {
      guard('cancelScheduledNotificationAsync');
      state.scheduled = state.scheduled.filter((x) => x.identifier !== identifier);
    },
  };
};
