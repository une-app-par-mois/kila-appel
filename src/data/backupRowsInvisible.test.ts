/**
 * @jest-environment node
 */
// SEC-06, SEC-10 (ticket 044b) : une sauvegarde dont un nom de membre ou de groupe contient un
// caractère de la liste élargie est refusée en entier ; les émojis composés restent acceptés.
// Points de code écrits en clair, sans importer la liste du code.
import { char, hexCodes } from '@/__fixtures__/codePoints';
import { seed } from '@/__fixtures__/seed';
import { checkRows } from '@/data/backupRows';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

const TODAY = '2026-11-27';

const ADDED = hexCodes([
  0x00ad, 0x034f, 0x115f, 0x1160, 0x180e, 0x2060, 0x2064, 0x3164, 0xffa0, 0xfff9, 0xfffb, 0xe0000,
  0xe0061, 0xe007f,
]);

const NAME_COLUMNS: [string, string][] = [
  ['members', 'last_name'],
  ['members', 'first_name'],
  ['groups', 'name'],
];

describe('SEC-10 restauration : liste élargie des caractères invisibles (SEC-06)', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    await seed(db);
    // Les contraintes de la base sont contournées : seule checkRows doit refuser.
    await db.execute('PRAGMA ignore_check_constraints = ON');
    await db.execute('PRAGMA foreign_keys = OFF');
  });
  afterEach(async () => {
    await db.close();
  });

  it('SEC-10 le jeu fictif passe', async () => {
    expect(await checkRows(db, TODAY)).toBeNull();
  });

  describe.each(NAME_COLUMNS)('%s.%s', (table, column) => {
    it.each(ADDED)(
      'SEC-06 SEC-10 refuse U+%s au milieu du nom (INVALID_DATA)',
      async (_l, code) => {
        await db.execute(`UPDATE ${table} SET ${column} = ?`, [`Al${char(code)}ix`]);
        expect(await checkRows(db, TODAY)).toBe('INVALID_DATA');
      },
    );

    it('SEC-06 SEC-10 refuse le drapeau d’Écosse fait de tags (INVALID_DATA)', async () => {
      const scotland = char(0x1f3f4, 0xe0067, 0xe0062, 0xe0073, 0xe0063, 0xe0074, 0xe007f);
      await db.execute(`UPDATE ${table} SET ${column} = ?`, [`Alix ${scotland}`]);
      expect(await checkRows(db, TODAY)).toBe('INVALID_DATA');
    });

    it('SEC-06 SEC-10 accepte la famille (U+200D) et le cœur rouge (U+FE0F)', async () => {
      const family = char(0x1f469, 0x200d, 0x1f467);
      const heart = char(0x2764, 0xfe0f);
      await db.execute(`UPDATE ${table} SET ${column} = ?`, [`Al${family}ix${heart}`]);
      expect(await checkRows(db, TODAY)).toBeNull();
    });
  });
});
