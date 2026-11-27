/**
 * @jest-environment node
 */
// EX-20, SEC-10 : vérification d'une sauvegarde sur sa copie, avant tout remplacement. Chaque
// fichier piégé est produit à l'exécution (SEC-13 : aucun .db dans le dépôt).
import { readFileSync, writeFileSync } from 'node:fs';
import { nodeFiles, openNode, tempDir } from '@/__fixtures__/backupFiles';
import { seed } from '@/__fixtures__/seed';
import { exportBackup } from '@/data/backup';
import { checkRows, MAX_BACKUP_BYTES, verifyBackup } from '@/data/backupCheck';
import type { Db } from '@/data/db';
import { MIGRATIONS, type Migration } from '@/data/migrations';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const deps = { files: nodeFiles, open: openNode };

describe('EX-20 SEC-10 vérification d’une sauvegarde', () => {
  let dir: ReturnType<typeof tempDir>;
  let backup: string;

  // Une vraie sauvegarde du jeu fictif, puis modifiée par `alter` pour la piéger.
  const trapped = async (alter: (copy: Db) => Promise<void>) => {
    const copy = openNodeDb(backup);
    await alter(copy);
    await copy.close();
    return backup;
  };

  beforeEach(async () => {
    log.mockClear();
    dir = tempDir();
    backup = dir.path('copie.db');
    const db = await prepareDatabase(openNodeDb());
    await seed(db);
    await exportBackup(db, backup, '2026-10-22');
    await db.close();
  });
  afterEach(() => dir.remove());

  it('accepte une sauvegarde de l’appli et la résume (membres, groupes, séances, date)', async () => {
    const result = await verifyBackup(backup, deps);
    expect(result).toEqual({
      ok: true,
      backup: {
        path: backup,
        summary: { members: 2, groups: 2, recordedSessions: 1, backupDate: '2026-10-22' },
      },
    });
    expect(log).toHaveBeenCalledWith('RESTORE_VERIFIED', { version: 1 });
  });

  it('le résumé ne compte que les séances enregistrées', async () => {
    await trapped(async (copy) => {
      await copy.execute(
        "INSERT INTO sessions (season_id, date, start_time, state) VALUES (1, '2026-11-01', '10:00', 'cancelled')",
      );
    });
    const result = await verifyBackup(backup, deps);
    expect(result.ok && result.backup.summary.recordedSessions).toBe(1);
  });

  it('sans date lisible dans la copie, le résumé n’a pas de date', async () => {
    await trapped(async (copy) => {
      await copy.execute("UPDATE settings SET value = 'hier' WHERE key = 'last_backup_at'");
    });
    const result = await verifyBackup(backup, deps);
    expect(result.ok && result.backup.summary.backupDate).toBeNull();
  });

  const rejects = async (path: string, reason: string) => {
    expect(await verifyBackup(path, deps)).toEqual({ ok: false, reason });
    // ABS-04, SEC-12 : un code seul dans le journal.
    expect(log).toHaveBeenCalledWith(`RESTORE_REJECTED_${reason}`);
  };

  it('refuse un fichier texte (NOT_SQLITE)', async () => {
    const path = dir.path('texte.db');
    writeFileSync(path, 'Nom;Prénom\nExemple;Alix\n'.repeat(100));
    await rejects(path, 'NOT_SQLITE');
  });

  it('refuse un fichier vide (NOT_SQLITE)', async () => {
    const path = dir.path('vide.db');
    writeFileSync(path, '');
    await rejects(path, 'NOT_SQLITE');
  });

  it('refuse un fichier trop gros sans l’ouvrir (TOO_LARGE)', async () => {
    const open = jest.fn(openNode);
    const files = { ...nodeFiles, size: async () => MAX_BACKUP_BYTES + 1 };
    expect(await verifyBackup(backup, { files, open })).toEqual({
      ok: false,
      reason: 'TOO_LARGE',
    });
    expect(open).not.toHaveBeenCalled();
    expect(MAX_BACKUP_BYTES).toBe(50 * 1024 * 1024);
  });

  it('refuse un fichier tronqué (DAMAGED)', async () => {
    const path = dir.path('tronque.db');
    const full = readFileSync(backup);
    writeFileSync(path, full.slice(0, Math.floor(full.length / 2)));
    await rejects(path, 'DAMAGED');
  });

  it('refuse une autre base SQLite (NOT_A_BACKUP)', async () => {
    const path = dir.path('autre.db');
    const other = openNodeDb(path);
    await other.execute('CREATE TABLE notes (id INTEGER PRIMARY KEY, texte TEXT)');
    await other.close();
    await rejects(path, 'NOT_A_BACKUP');
  });

  it('refuse une autre base SQLite qui se dit en version 1 (NOT_A_BACKUP)', async () => {
    const path = dir.path('autre-v1.db');
    const other = openNodeDb(path);
    await other.execute('CREATE TABLE notes (id INTEGER PRIMARY KEY, texte TEXT)');
    await other.execute('PRAGMA user_version = 1');
    await other.close();
    await rejects(path, 'NOT_A_BACKUP');
  });

  it('refuse une version plus récente que l’appli, à part (NEWER_VERSION)', async () => {
    await trapped((copy) => copy.execute('PRAGMA user_version = 99').then(() => undefined));
    await rejects(backup, 'NEWER_VERSION');
  });

  it('refuse un déclencheur en plus (NOT_A_BACKUP)', async () => {
    await trapped(async (copy) => {
      await copy.execute(
        'CREATE TRIGGER piege AFTER INSERT ON members BEGIN DELETE FROM attendances; END',
      );
    });
    await rejects(backup, 'NOT_A_BACKUP');
  });

  it('refuse une table en plus (NOT_A_BACKUP)', async () => {
    await trapped(async (copy) => {
      await copy.execute('CREATE TABLE extra (id INTEGER PRIMARY KEY)');
    });
    await rejects(backup, 'NOT_A_BACKUP');
  });

  it('refuse une vue en plus (NOT_A_BACKUP)', async () => {
    await trapped(async (copy) => {
      await copy.execute('CREATE VIEW v AS SELECT * FROM members');
    });
    await rejects(backup, 'NOT_A_BACKUP');
  });

  it('refuse un schedule_from invalide, contrainte contournée (DAMAGED)', async () => {
    await trapped(async (copy) => {
      await copy.execute('PRAGMA ignore_check_constraints = ON');
      await copy.execute("UPDATE slots SET schedule_from = '2026-02-30'");
    });
    await rejects(backup, 'DAMAGED');
  });

  it('refuse une clé étrangère cassée (DAMAGED)', async () => {
    await trapped(async (copy) => {
      await copy.execute('PRAGMA foreign_keys = OFF');
      await copy.execute(
        "INSERT INTO attendances (session_id, member_id, status) VALUES (1, 999, 'present')",
      );
    });
    await rejects(backup, 'DAMAGED');
  });

  it('ticket 008 refuse un contact au téléphone invalide (INVALID_DATA)', async () => {
    await trapped(async (copy) => {
      await copy.execute("UPDATE emergency_contacts SET phone = '12'");
    });
    await rejects(backup, 'INVALID_DATA');
  });

  it('ticket 008 refuse un contact sans nom (INVALID_DATA)', async () => {
    await trapped(async (copy) => {
      await copy.execute('UPDATE emergency_contacts SET label = NULL');
    });
    await rejects(backup, 'INVALID_DATA');
  });

  it('ferme la copie après la vérification, acceptée ou refusée', async () => {
    const closes: jest.Mock[] = [];
    const open = async (path: string) => {
      const db = openNodeDb(path);
      const close = jest.fn(() => db.close());
      closes.push(close);
      return { ...db, close };
    };
    await verifyBackup(backup, { files: nodeFiles, open });
    await trapped((copy) => copy.execute('PRAGMA user_version = 99').then(() => undefined));
    await verifyBackup(backup, { files: nodeFiles, open });
    expect(closes.length).toBeGreaterThan(0);
    for (const close of closes) expect(close).toHaveBeenCalledTimes(1);
  });

  it('une copie qui ne s’ouvre pas est abîmée (DAMAGED)', async () => {
    const open = async () => {
      throw new Error('ouverture impossible');
    };
    expect(await verifyBackup(backup, { files: nodeFiles, open })).toEqual({
      ok: false,
      reason: 'DAMAGED',
    });
  });
});

describe('EX-20 migrations d’une sauvegarde plus ancienne', () => {
  const first = MIGRATIONS[0] as Migration;
  const second = { version: 2, statements: ['CREATE TABLE nouveautes (id INTEGER PRIMARY KEY)'] };
  let dir: ReturnType<typeof tempDir>;
  beforeEach(() => {
    dir = tempDir();
  });
  afterEach(() => dir.remove());

  it('migre la copie avant de l’accepter', async () => {
    const backup = dir.path('ancienne.db');
    const db = await prepareDatabase(openNodeDb());
    await exportBackup(db, backup, '2026-10-22');
    await db.close();
    const migrations = [first, second];
    const result = await verifyBackup(backup, { ...deps, migrations });
    expect(result.ok).toBe(true);
    const copy = openNodeDb(backup);
    expect(await copy.query('PRAGMA user_version')).toEqual([{ user_version: 2 }]);
    await copy.close();
  });

  it('refuse une base vide en version 0 : rien à restaurer (NOT_A_BACKUP)', async () => {
    const path = dir.path('zero.db');
    const empty = openNodeDb(path);
    await empty.execute('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT');
    await empty.close();
    expect(await verifyBackup(path, deps)).toEqual({ ok: false, reason: 'NOT_A_BACKUP' });
  });
});

describe('checkRows : règles que la base ne garantit pas seule', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await seed(db);
  });
  afterEach(async () => {
    await db.close();
  });

  it('accepte le jeu fictif', async () => {
    expect(await checkRows(db)).toBeNull();
  });

  it('EX-08 refuse un schedule_from invalide même si integrity_check le laissait passer', async () => {
    await db.execute('PRAGMA ignore_check_constraints = ON');
    await db.execute("UPDATE slots SET schedule_from = 'demain'");
    expect(await checkRows(db)).toBe('INVALID_DATA');
  });
});
