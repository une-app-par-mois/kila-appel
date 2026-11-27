/**
 * @jest-environment node
 */
// EX-19 export, EX-20 et NF-04 restauration par recopie en une transaction (ARCHITECTURE §4.3,
// décision du porteur du 2026-11-27). Fichiers temporaires produits à l'exécution (SEC-13).
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { nodeFiles, openNode, tempDir } from '@/__fixtures__/backupFiles';
import { seed } from '@/__fixtures__/seed';
import { exportBackup, restoreBackup } from '@/data/backup';
import { type VerifiedBackup, verifyBackup } from '@/data/backupCheck';
import type { Db } from '@/data/db';
import { membersRepo } from '@/data/membersRepo';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { settingsRepo } from '@/data/settingsRepo';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const deps = { files: nodeFiles, open: openNode };

const tableNames = async (db: Db) =>
  (
    await db.query<{ name: string }>(
      "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name",
    )
  ).map((row) => row.name);

/** Contenu complet de chaque table, lignes triées : la comparaison ne dépend pas de l'ordre. */
const snapshot = async (db: Db) => {
  const content: Record<string, string[]> = {};
  for (const table of await tableNames(db)) {
    const rows = await db.query(`SELECT * FROM "${table}"`);
    content[table] = rows.map((row) => JSON.stringify(row)).sort();
  }
  return content;
};

const counts = async (db: Db) => {
  const result: Record<string, number> = {};
  for (const table of await tableNames(db)) {
    const [row] = await db.query<{ n: number }>(`SELECT count(*) AS n FROM "${table}"`);
    result[table] = row?.n ?? 0;
  }
  return result;
};

const verified = async (path: string): Promise<VerifiedBackup> => {
  const result = await verifyBackup(path, deps);
  if (!result.ok) throw new Error(`sauvegarde refusée : ${result.reason}`);
  return result.backup;
};

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
    expect(await copy.query('PRAGMA user_version')).toEqual([{ user_version: 1 }]);
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

describe('EX-20 NF-04 restauration par recopie en une transaction', () => {
  let dir: ReturnType<typeof tempDir>;
  let source: Db;
  let target: Db;
  let targetPath: string;
  let backupPath: string;

  beforeEach(async () => {
    log.mockClear();
    dir = tempDir();
    backupPath = dir.path('copie.db');
    source = await prepareDatabase(openNodeDb());
    await seed(source);
    await settingsRepo(source).setRetentionSeasons(2);
    await exportBackup(source, backupPath, '2026-10-22');
    // L'appareil : d'autres données, dont un membre fictif absent de la sauvegarde.
    targetPath = dir.path('kila.db');
    target = await prepareDatabase(openNodeDb(targetPath));
    const id = await membersRepo(target).create(
      { firstName: 'Zzprenomzz', lastName: 'Zzsupprimezz', birthDate: null },
      { today: '2026-11-27' },
    );
    await target.execute(
      'INSERT INTO emergency_contacts (member_id, label, phone) VALUES (?, ?, ?)',
      [id, 'Zzcontactzz', '0699999917'],
    );
    await settingsRepo(target).markBackupInviteSeen();
  });
  afterEach(async () => {
    await source.close();
    await target.close().catch(() => undefined);
    dir.remove();
  });

  it('restaure une copie identique, table par table, réglages et appel en cours compris', async () => {
    await restoreBackup(target, await verified(backupPath));
    const expected = await snapshot(source);
    const restored = await snapshot(target);
    expect(Object.keys(restored)).toEqual(Object.keys(expected));
    for (const table of Object.keys(expected)) {
      // La copie porte en plus la date de la sauvegarde (last_backup_at).
      if (table !== 'settings')
        expect({ table, rows: restored[table] }).toEqual({
          table,
          rows: expected[table],
        });
    }
    const settings = settingsRepo(target);
    expect(await settings.retentionSeasons()).toBe(2);
    expect(await settings.lastBackupDate()).toBe('2026-10-22');
    expect(await settings.backupInviteSeen()).toBe(false);
    expect(await target.query('SELECT count(*) AS n FROM roll_call_drafts')).toEqual([{ n: 1 }]);
    expect(log).toHaveBeenCalledWith('RESTORE_DONE', { memberCount: 2 });
  });

  it('garde la connexion prête : clés étrangères, effacement sûr, copie détachée', async () => {
    await restoreBackup(target, await verified(backupPath));
    const first = await snapshot(target);
    expect(await target.query('PRAGMA foreign_keys')).toEqual([{ foreign_keys: 1 }]);
    expect(await target.query('PRAGMA secure_delete')).toEqual([{ secure_delete: 1 }]);
    expect(await target.query('PRAGMA database_list')).toHaveLength(1);
    // Une deuxième restauration sur la même connexion fonctionne aussi.
    await restoreBackup(target, await verified(backupPath));
    expect(await snapshot(target)).toEqual(first);
  });

  it('ABS-05 un nom supprimé par la restauration n’est plus dans les octets du fichier', async () => {
    await restoreBackup(target, await verified(backupPath));
    await target.close();
    const bytes = new TextDecoder().decode(readFileSync(targetPath));
    for (const value of ['Zzprenomzz', 'Zzsupprimezz', 'Zzcontactzz', '0699999917']) {
      expect(bytes.includes(value)).toBe(false);
    }
  });

  it('un échec au milieu laisse toutes les tables telles quelles', async () => {
    const before = await snapshot(target);
    const beforeCounts = await counts(target);
    // Le dépôt qui casse la recopie des présences, après celle des autres tables.
    const failing: Db = {
      ...target,
      transaction: (fn) =>
        target.transaction((tx) =>
          fn({
            ...tx,
            execute: (sql, params) =>
              /INSERT INTO main\."attendances"/.test(sql)
                ? Promise.reject(new Error('panne simulée'))
                : tx.execute(sql, params),
          }),
        ),
    };
    await expect(restoreBackup(failing, await verified(backupPath))).rejects.toMatchObject({
      code: 'RESTORE_FAILED',
    });
    expect(await counts(target)).toEqual(beforeCounts);
    expect(await snapshot(target)).toEqual(before);
    expect(await target.query('PRAGMA database_list')).toHaveLength(1);
    expect(log).toHaveBeenCalledWith('RESTORE_FAILED');
  });

  it('une copie disparue après la vérification : échec, données intactes', async () => {
    const backup = await verified(backupPath);
    const before = await snapshot(target);
    rmSync(backupPath, { recursive: true, force: true });
    await expect(restoreBackup(target, backup)).rejects.toMatchObject({
      code: 'RESTORE_FAILED',
    });
    expect(await snapshot(target)).toEqual(before);
  });

  it('SEC-11 une clé étrangère cassée refusée à la validation : tout est annulé', async () => {
    // Copie modifiée après sa vérification : seule la validation de la transaction l'arrête.
    const backup = await verified(backupPath);
    const copy = openNodeDb(backupPath);
    await copy.execute('PRAGMA foreign_keys = OFF');
    await copy.execute(
      "INSERT INTO attendances (session_id, member_id, status) VALUES (1, 999, 'present')",
    );
    await copy.close();
    const before = await snapshot(target);
    await expect(restoreBackup(target, backup)).rejects.toMatchObject({
      code: 'RESTORE_FAILED',
    });
    expect(await snapshot(target)).toEqual(before);
    // La connexion reste utilisable après l'échec.
    await settingsRepo(target).setRetentionSeasons(1);
    expect(await settingsRepo(target).retentionSeasons()).toBe(1);
  });
});
