// Environnement des tests de restauration depuis l'écran de récupération (ticket 014f) : la base de
// l'appli est un fichier node:sqlite (expo-sqlite imité, suppression avec `-journal`, `-wal`,
// `-shm`), les dossiers et le sélecteur passent par node:fs. SEC-13 : tout est produit à
// l'exécution, avec le jeu fictif. Les modules sont remplacés par `jest.mock(…, () =>
// require('@/__fixtures__/recoveryEnv').fakeExpoDb())` (et `fakeExpoFiles`).
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { nodePicker, nodeStorage, openNode } from '@/__fixtures__/backupFiles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';

type Picker = ReturnType<typeof nodePicker>;

/** État partagé par les imitations ; `reset(dir)` avant chaque test. */
export const env = {
  dir: '',
  file: '',
  /** Suppressions de la base demandées. */
  deletes: 0,
  /** Prochaines suppressions qui échouent. */
  deleteFails: 0,
  /** Prochains ATTACH de la base de l'appli qui échouent (recopie en échec). */
  attachFails: 0,
  /** Attendu avant chaque ATTACH de la base de l'appli. */
  attachGate: Promise.resolve() as Promise<void>,
  /** Attendu par le nettoyage du démarrage. */
  clearGate: Promise.resolve() as Promise<void>,
  picker: null as unknown as Picker,
  pick: (): Promise<{ path: string } | null> => env.picker.pick(),
  reset(dir: string) {
    env.dir = dir;
    env.file = join(dir, 'kila.db');
    env.deletes = 0;
    env.deleteFails = 0;
    env.attachFails = 0;
    env.attachGate = Promise.resolve();
    env.clearGate = Promise.resolve();
    env.picker = nodePicker(join(dir, 'DocumentPicker'));
    env.pick = () => env.picker.pick();
  },
};

/** Promesse ouverte jusqu'à `release()`. */
export const gate = () => {
  let release: () => void = () => undefined;
  const wait = new Promise<void>((resolve) => (release = resolve));
  return { wait, release: () => release() };
};

const wrap = (db: Db): Db => ({
  ...db,
  execute: async (sql, params) => {
    if (/^ATTACH/.test(sql)) {
      await env.attachGate;
      if (env.attachFails > 0) {
        env.attachFails -= 1;
        throw new Error('disque plein');
      }
    }
    return db.execute(sql, params);
  },
});

export const fakeExpoDb = () => ({
  openExpoDb: async () => wrap(openNodeDb(env.file)),
  deleteAppDatabase: async () => {
    env.deletes += 1;
    if (env.deleteFails > 0) {
      env.deleteFails -= 1;
      throw new Error('Unable to delete the database file');
    }
    for (const suffix of ['', '-journal', '-wal', '-shm'])
      rmSync(`${env.file}${suffix}`, { recursive: true, force: true });
  },
});

const storage = (name: string) => {
  const real = nodeStorage(join(env.dir, name));
  return { ...real, clear: () => env.clearGate.then(real.clear) };
};

export const fakeExpoFiles = () => ({
  expoStorage: storage,
  expoPicker: () => ({ clearPicked: () => env.picker.clearPicked() }),
  expoRestoreDeps: {
    get files() {
      return nodeStorage(join(env.dir, 'restauration'));
    },
    open: openNode,
    pick: () => env.pick(),
    removePicked: (path: string) => env.picker.removePicked(path),
    clearPicked: () => env.picker.clearPicked(),
  },
});

/** Octets du fichier de la base, pour vérifier qu'il n'a pas été touché. */
export const fileBytes = () => readFileSync(env.file);

/** Vrai si le fichier de la base a toujours ces octets. */
export const unchangedSince = (before: Uint8Array) => {
  const after = fileBytes();
  return after.length === before.length && after.every((byte, i) => byte === before[i]);
};
