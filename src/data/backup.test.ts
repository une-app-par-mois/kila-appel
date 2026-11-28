/**
 * @jest-environment node
 */
// EX-19 export, EX-20 et NF-04 restauration par recopie en une transaction (ARCHITECTURE §4.3,
// décision du porteur du 2026-11-27). Fichiers temporaires produits à l'exécution (SEC-13).
import { readFileSync, rmSync } from 'node:fs';
import { failingDetach, nodeFiles, openNode, tempDir } from '@/__fixtures__/backupFiles';
import { seed } from '@/__fixtures__/seed';
import { exportBackup, IDENTIFIER, restoreBackup } from '@/data/backup';
import { type VerifiedBackup, verifyBackup } from '@/data/backupCheck';
import type { Db } from '@/data/db';
import { membersRepo } from '@/data/membersRepo';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { settingsRepo } from '@/data/settingsRepo';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const deps = { files: nodeFiles, open: openNode, today: '2026-11-27' };

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

// Copie vérifiée dans un chemin temporaire neuf, à côté du fichier choisi.
let copies = 0;
const verified = async (path: string): Promise<VerifiedBackup> => {
  const result = await verifyBackup(path, `${path}.verif-${++copies}`, deps);
  if (!result.ok) throw new Error(`sauvegarde refusée : ${result.reason}`);
  return result.backup;
};

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

  it('SEC-10 une sauvegarde avec un nom hors règle (SEC-06) est refusée en entier', async () => {
    // Un seul membre de la copie a un nom de 101 caractères : rien n'est restauré.
    await source.execute("UPDATE members SET last_name = ? WHERE first_name = 'Alix'", [
      'x'.repeat(101),
    ]);
    const badPath = dir.path('hors-regle.db');
    await exportBackup(source, badPath, '2026-10-22');
    const before = await snapshot(target);
    const result = await verifyBackup(badPath, `${badPath}.verif`, deps);
    expect(result).toMatchObject({ ok: false, reason: 'INVALID_DATA' });
    expect(await snapshot(target)).toEqual(before);
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
    rmSync(backup.path, { recursive: true, force: true });
    await expect(restoreBackup(target, backup)).rejects.toMatchObject({
      code: 'RESTORE_FAILED',
    });
    expect(await snapshot(target)).toEqual(before);
  });

  it('SEC-11 une clé étrangère cassée refusée à la validation : tout est annulé', async () => {
    // Copie modifiée après sa vérification : seule la validation de la transaction l'arrête.
    const backup = await verified(backupPath);
    const copy = openNodeDb(backup.path);
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

  // Copie modifiée entre sa vérification et sa restauration : recontrôlée dans la transaction.
  const alteredAfterCheck = async (alter: (copy: Db) => Promise<unknown>) => {
    const backup = await verified(backupPath);
    const copy = openNodeDb(backup.path);
    await alter(copy);
    await copy.close();
    const before = await snapshot(target);
    await expect(restoreBackup(target, backup)).rejects.toMatchObject({ code: 'RESTORE_FAILED' });
    expect(await snapshot(target)).toEqual(before);
    expect(await target.query('PRAGMA database_list')).toHaveLength(1);
  };

  it('SEC-10 refuse une copie dont le schéma a changé après la vérification', async () => {
    await alteredAfterCheck((copy) =>
      copy.execute('CREATE TRIGGER piege AFTER INSERT ON members BEGIN SELECT 1; END'),
    );
  });

  it('SEC-10 refuse une copie dont la version a changé après la vérification', async () => {
    await alteredAfterCheck((copy) => copy.execute('PRAGMA user_version = 2'));
  });

  it('SEC-10 refuse une copie dont une ligne est devenue invalide après la vérification', async () => {
    await alteredAfterCheck((copy) => copy.execute("UPDATE emergency_contacts SET phone = '12'"));
  });

  it('un DETACH qui a échoué ne bloque pas la restauration suivante', async () => {
    const backup = await verified(backupPath);
    log.mockClear();
    await restoreBackup(failingDetach(target), backup);
    expect(await target.query('PRAGMA database_list')).toHaveLength(2);
    // Transaction validée : pas un échec de restauration, mais un code à part (revue du 014f).
    expect(log).toHaveBeenCalledWith('RESTORE_DETACH_FAILED');
    expect(log).not.toHaveBeenCalledWith('RESTORE_FAILED');
    await restoreBackup(target, await verified(backupPath));
    expect(await target.query('PRAGMA database_list')).toHaveLength(1);
  });
});

describe('Noms SQL de la recopie', () => {
  it('chaque table et chaque colonne du schéma de l’appli passe le motif IDENTIFIER', async () => {
    const db = await prepareDatabase(openNodeDb());
    const tables = await tableNames(db);
    expect(tables.length).toBeGreaterThan(10);
    for (const table of tables) {
      expect(table).toMatch(IDENTIFIER);
      const cols = await db.query<{ name: string }>('SELECT name FROM pragma_table_info(?)', [
        table,
      ]);
      for (const { name } of cols) expect(name).toMatch(IDENTIFIER);
    }
    await db.close();
  });

  it('seule verifyBackup produit une copie vérifiée (marque obligatoire)', async () => {
    const db = openNodeDb();
    const summary = { members: 0, groups: 0, recordedSessions: 0, backupDate: null };
    // Jamais appelée : seul le typage compte.
    const literal = () =>
      // @ts-expect-error un objet littéral n'est pas une copie vérifiée
      restoreBackup(db, { path: 'copie.db', summary });
    expect(typeof literal).toBe('function');
    await db.close();
  });
});
