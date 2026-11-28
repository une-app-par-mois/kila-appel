/**
 * @jest-environment node
 */
// EX-19 export de la sauvegarde : VACUUM INTO, date écrite dans la copie, copie attachée robuste
// (ticket 014). Fichiers temporaires produits à l'exécution (SEC-13).
import { readFileSync, writeFileSync } from 'node:fs';
import { failingDetach, tempDir } from '@/__fixtures__/backupFiles';
import { seed } from '@/__fixtures__/seed';
import { exportBackup } from '@/data/backup';
import type { Db } from '@/data/db';
import { LATEST_VERSION } from '@/data/migrations';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { settingsRepo } from '@/data/settingsRepo';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

describe('EX-19 export de la sauvegarde', () => {
  let dir: ReturnType<typeof tempDir>;
  let db: Db;
  beforeEach(async () => {
    dir = tempDir();
    db = await prepareDatabase(openNodeDb());
    await seed(db);
  });
  afterEach(async () => {
    await db.close();
    dir.remove();
  });

  it('copie la base dans un fichier SQLite, date de la sauvegarde écrite dans la copie', async () => {
    const path = dir.path('kila-sauvegarde-2026-11-27.db');
    await exportBackup(db, path, '2026-11-27');
    expect(new TextDecoder().decode(readFileSync(path).slice(0, 15))).toBe('SQLite format 3');
    const copy = openNodeDb(path);
    expect(await settingsRepo(copy).lastBackupDate()).toBe('2026-11-27');
    expect(await copy.query('PRAGMA user_version')).toEqual([{ user_version: LATEST_VERSION }]);
    await copy.close();
    // La base de l'appareil n'est pas touchée : 014b note la date une fois le fichier partagé.
    expect(await settingsRepo(db).lastBackupDate()).toBeNull();
    expect(log).toHaveBeenCalledWith('BACKUP_EXPORTED');
  });

  it('remplace la date d’une sauvegarde précédente dans la copie', async () => {
    await settingsRepo(db).setLastBackupDate('2026-10-01');
    const path = dir.path('copie.db');
    await exportBackup(db, path, '2026-11-27');
    const copy = openNodeDb(path);
    expect(await settingsRepo(copy).lastBackupDate()).toBe('2026-11-27');
    await copy.close();
  });

  it('refuse une date qui n’est pas AAAA-MM-JJ, sans écrire de fichier', async () => {
    const path = dir.path('copie.db');
    await expect(exportBackup(db, path, '27/11/2026')).rejects.toMatchObject({
      code: 'DATE_INVALID',
    });
    expect(() => readFileSync(path)).toThrow();
  });

  it('n’écrase pas un fichier qui existe déjà', async () => {
    const path = dir.path('existant.db');
    writeFileSync(path, 'déjà là');
    await expect(exportBackup(db, path, '2026-11-27')).rejects.toThrow();
    expect(new TextDecoder().decode(readFileSync(path))).toBe('déjà là');
  });
});

describe('EX-19 export : copie attachée robuste', () => {
  let dir: ReturnType<typeof tempDir>;
  let db: Db;
  beforeEach(async () => {
    dir = tempDir();
    db = await prepareDatabase(openNodeDb());
    await seed(db);
  });
  afterEach(async () => {
    await db.close();
    dir.remove();
  });

  it('un DETACH qui a échoué ne bloque pas l’export suivant', async () => {
    await exportBackup(failingDetach(db), dir.path('a.db'), '2026-11-27');
    expect(await db.query('PRAGMA database_list')).toHaveLength(2);
    await exportBackup(db, dir.path('b.db'), '2026-11-27');
    expect(await db.query('PRAGMA database_list')).toHaveLength(1);
    const copy = openNodeDb(dir.path('b.db'));
    expect(await settingsRepo(copy).lastBackupDate()).toBe('2026-11-27');
    await copy.close();
  });

  it('une erreur d’écriture pendant l’export n’est pas masquée par celle du DETACH', async () => {
    const failing: Db = {
      ...db,
      execute: (sql, params) => {
        if (/^INSERT INTO kila_backup/.test(sql)) return Promise.reject(new Error('écriture'));
        if (/^DETACH/.test(sql)) return Promise.reject(new Error('detach'));
        return db.execute(sql, params);
      },
    };
    await expect(exportBackup(failing, dir.path('c.db'), '2026-11-27')).rejects.toThrow('écriture');
  });
});
