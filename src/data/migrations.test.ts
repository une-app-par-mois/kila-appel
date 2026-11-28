/**
 * @jest-environment node
 */
import { volumeSeed } from '@/__fixtures__/statsSeed';
import type { Db } from '@/data/db';
import { LATEST_VERSION, MIGRATIONS, migrate } from '@/data/migrations';
import { openNodeDb } from '@/data/nodeDb';
import { FOREIGN_KEYS_OFF, prepareDatabase } from '@/data/open';

const TABLES = [
  'alert_acks',
  'attendances',
  'emergency_contacts',
  'enrollments',
  'groups',
  'members',
  'roll_call_draft_groups',
  'roll_call_draft_statuses',
  'roll_call_drafts',
  'seasons',
  'session_groups',
  'sessions',
  'settings',
  'slot_dates',
  'slot_groups',
  'slots',
];

const userVersion = async (db: Db) =>
  (await db.query<{ user_version: number }>('PRAGMA user_version'))[0]?.user_version;

const tableNames = async (db: Db) =>
  (
    await db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
  ).map((row) => row.name);

describe('Migration 1 (ADR-003)', () => {
  let db: Db;
  beforeEach(() => {
    db = openNodeDb();
  });
  afterEach(async () => {
    await db.close();
  });

  it('crée les 16 tables du schéma sur une base vide et pose la dernière version', async () => {
    await prepareDatabase(db);
    expect(await tableNames(db)).toEqual(TABLES);
    expect(await userVersion(db)).toBe(LATEST_VERSION);
    expect(LATEST_VERSION).toBe(MIGRATIONS.length);
  });

  it('active les clés étrangères à l’ouverture', async () => {
    await prepareDatabase(db);
    const rows = await db.query<{ foreign_keys: number }>('PRAGMA foreign_keys');
    expect(rows[0]?.foreign_keys).toBe(1);
  });

  it('crée des tables STRICT : une valeur du mauvais type est refusée', async () => {
    await prepareDatabase(db);
    await expect(
      db.execute(
        "INSERT INTO seasons (name, start_date, end_date, is_active) VALUES ('S', '2026-09-01', '2027-07-31', 'oui')",
      ),
    ).rejects.toThrow();
  });

  it('relancer les migrations sur une base à jour ne change rien', async () => {
    await prepareDatabase(db);
    await db.execute('INSERT INTO settings (key, value) VALUES (?, ?)', ['retention', '3']);
    await prepareDatabase(db);
    expect(await userVersion(db)).toBe(LATEST_VERSION);
    expect(await db.query('SELECT key, value FROM settings')).toEqual([
      { key: 'retention', value: '3' },
    ]);
  });

  it('SEC-10 refuse une base d’une version future, sans la modifier', async () => {
    await db.execute('PRAGMA user_version = 99');
    await expect(prepareDatabase(db)).rejects.toThrow('Version de base inconnue');
    expect(await tableNames(db)).toEqual([]);
  });

  it('une migration qui échoue est annulée entièrement (transaction)', async () => {
    const broken = [
      {
        version: 1,
        statements: [
          'CREATE TABLE a (id INTEGER PRIMARY KEY) STRICT',
          'CREATE TABLE a (id INTEGER)',
        ],
      },
    ];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect(await tableNames(db)).toEqual([]);
    expect(await userVersion(db)).toBe(0);
  });

  it.each([
    ['une version manquante', [2]],
    ['un trou', [1, 3]],
    ['un ordre inversé', [2, 1]],
  ])('SEC-10 refuse une liste de migrations avec %s', async (_cas, versions) => {
    const migrations = versions.map((version) => ({ version, statements: ['SELECT 1'] }));
    await expect(migrate(db, migrations)).rejects.toThrow('Migrations mal numérotées');
    expect(await userVersion(db)).toBe(0);
  });

  it('les versions des migrations se suivent à partir de 1', () => {
    expect(MIGRATIONS.map((m) => m.version)).toEqual(
      Array.from({ length: MIGRATIONS.length }, (_, i) => i + 1),
    );
  });

  it('SEC-11 refuse d’ouvrir une base dont les clés étrangères restent inactives', async () => {
    const noForeignKeys: Db = {
      ...db,
      execute: async () => ({ changes: 0, lastInsertRowId: 0 }),
      // Lecture d'essai du fichier (EX-22, ticket 014c) laissée à la vraie base.
      query: async <T>(sql: string, params: (string | number | null)[] = []) =>
        sql === 'PRAGMA foreign_keys' ? ([{ foreign_keys: 0 }] as T[]) : db.query<T>(sql, params),
    };
    await expect(prepareDatabase(noForeignKeys)).rejects.toThrow(FOREIGN_KEYS_OFF);
  });

  it('une base sans version lisible est traitée comme vide (version 0)', async () => {
    const applied: string[] = [];
    const noVersion: Db = {
      ...db,
      query: async <T>() => [] as T[],
      transaction: async (fn) =>
        fn({
          ...db,
          execute: async (sql) => {
            applied.push(sql);
            return { changes: 0, lastInsertRowId: 0 };
          },
        }),
    };
    await migrate(noVersion, [{ version: 1, statements: ['SELECT 1'] }]);
    expect(applied).toEqual(['SELECT 1', 'PRAGMA user_version = 1']);
  });
});

describe('Brouillon : heure de début (ticket 011, ADR-003 : migration 1 corrigée avant publication)', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await db.execute(
      "INSERT INTO seasons (name, start_date, end_date, is_active) VALUES ('S', '2026-09-01', '2027-07-31', 1)",
    );
  });
  afterEach(async () => {
    await db.close();
  });

  it('EX-14 l’heure de début est obligatoire et écrite HH:MM', async () => {
    const insert = (startedAt: string | null) =>
      db.execute(
        "INSERT INTO roll_call_drafts (id, season_id, date, started_at, updated_at) VALUES (1, 1, '2026-11-18', ?, '2026-11-18T10:05')",
        [startedAt],
      );
    await expect(insert(null)).rejects.toThrow();
    await expect(insert('9:05')).rejects.toThrow();
    await insert('09:05');
    expect(await db.query('SELECT started_at FROM roll_call_drafts')).toEqual([
      { started_at: '09:05' },
    ]);
  });
});

describe('Migration 2 : nombre de groupes figé de la séance (ticket 043, RM-03)', () => {
  let db: Db;
  // Base de la version 1 : la migration 1 seule, comme sur un appareil d'avant le ticket 043.
  const v1 = async () => {
    const base = openNodeDb();
    await base.execute('PRAGMA foreign_keys = ON');
    await migrate(base, MIGRATIONS.slice(0, 1));
    return base;
  };
  const schema = async (base: Db) =>
    (await base.query('SELECT type, name, tbl_name, sql FROM sqlite_schema'))
      .map((row) => JSON.stringify(row))
      .sort();
  beforeEach(async () => {
    db = await v1();
    await db.execute(
      "INSERT INTO seasons (name, start_date, end_date, is_active) VALUES ('S', '2026-09-01', '2027-07-31', 1)",
    );
    await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (1, 'Poussins'), (1, 'Benjamins')",
    );
    for (const [id, date] of [
      [1, '2026-11-04'],
      [2, '2026-11-11'],
      [3, '2026-11-18'],
    ] as const) {
      await db.execute(
        "INSERT INTO sessions (id, season_id, date, start_time, state) VALUES (?, 1, ?, '17:30', 'recorded')",
        [id, date],
      );
    }
    // Séance 1 : deux groupes ; séance 2 : un groupe ; séance 3 : aucun (groupe supprimé).
    await db.execute(
      'INSERT INTO session_groups (session_id, group_id) VALUES (1, 1), (1, 2), (2, 1)',
    );
  });
  afterEach(async () => {
    await db.close();
  });

  it('RM-03 remplit group_count avec le nombre actuel de groupes, NULL sans groupe', async () => {
    await migrate(db);
    expect(await userVersion(db)).toBe(2);
    expect(await db.query('SELECT id, group_count FROM sessions ORDER BY id')).toEqual([
      { id: 1, group_count: 2 },
      { id: 2, group_count: 1 },
      { id: 3, group_count: null },
    ]);
  });

  it('le schéma d’une base migrée depuis la version 1 est celui d’une base neuve', async () => {
    await migrate(db);
    const fresh = await prepareDatabase(openNodeDb());
    expect(await schema(db)).toEqual(await schema(fresh));
    await fresh.close();
  });

  it('RM-03 group_count : NULL ou entier de 1 ou plus (0, -1 et texte refusés)', async () => {
    await migrate(db);
    const set = (value: number | string | null) =>
      db.execute('UPDATE sessions SET group_count = ? WHERE id = 2', [value]);
    for (const bad of [0, -1, 'deux']) await expect(set(bad)).rejects.toThrow();
    await set(null);
    await set(3);
    expect(await db.query('SELECT group_count FROM sessions WHERE id = 2')).toEqual([
      { group_count: 3 },
    ]);
  });

  it('NF-08 migre 500 membres et 3 saisons de séances à deux groupes en moins de 2 s', async () => {
    const volume = await v1();
    await volumeSeed(volume, { twoGroups: true });
    const start = Date.now();
    await migrate(volume);
    expect(Date.now() - start).toBeLessThan(2000);
    expect(
      await volume.query('SELECT group_count, count(*) AS n FROM sessions GROUP BY group_count'),
    ).toEqual([{ group_count: 2, n: 1200 }]);
    await volume.close();
  });
});
