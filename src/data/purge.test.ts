/**
 * @jest-environment node
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addSeason, counts, oldSeason, TABLES, type Table, TODAY } from '@/__fixtures__/purgeSeed';
import { type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { purge, purgeCandidates, purgeImpact } from '@/data/purge';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

describe('Purge des anciennes saisons : données (EX-24, SEC-11, ABS-05)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    log.mockClear();
  });
  afterEach(async () => {
    await db.close();
  });

  it('EX-24 candidates : au-delà des N plus récentes (date de début), de la plus récente à la plus ancienne', async () => {
    const old = await addSeason(db, '2024-2025', '2024-09-01', '2025-07-31');
    const older = await addSeason(db, '2023-2024', '2023-09-01', '2024-07-31');
    const ids = async (n: number) => (await purgeCandidates(db, n, TODAY)).map((x) => x.id);
    expect(await ids(1)).toEqual([s.otherSeasonId, old, older]);
    expect(await ids(2)).toEqual([old, older]);
    expect(await ids(3)).toEqual([older]);
  });

  it('EX-24 la saison active n’est jamais candidate, même la plus ancienne', async () => {
    const oldest = await addSeason(db, '2020-2021', '2020-09-01', '2021-07-31');
    await db.execute('UPDATE seasons SET is_active = 0');
    await db.execute('UPDATE seasons SET is_active = 1 WHERE id = ?', [oldest]);
    expect((await purgeCandidates(db, 1, TODAY)).map((x) => x.id)).toEqual([s.otherSeasonId]);
  });

  it.each([0, 4, -1, 1.5, Number.NaN])(
    'EX-24 refuse une durée de conservation de %p',
    async (n) => {
      await expect(purgeCandidates(db, n, TODAY)).rejects.toThrow(
        new DataError('RETENTION_INVALID'),
      );
    },
  );

  it('EX-24 compte avant ce que la purge effacera, membres compris', async () => {
    const old = await oldSeason(db, s);
    expect(await purgeImpact(db, [old.seasonId])).toEqual({
      seasons: 1,
      groups: 1,
      enrollments: 2,
      slots: 1,
      sessions: 1,
      attendances: 3,
      rollCallDraft: false,
      members: 2,
    });
    // Deux saisons : les comptes s'additionnent ; les membres de la saison 2025-2026 restent
    // inscrits dans la saison active.
    expect(await purgeImpact(db, [old.seasonId, s.otherSeasonId])).toMatchObject({
      seasons: 2,
      groups: 2,
      enrollments: 4,
      members: 2,
    });
    expect(await purgeImpact(db, [])).toMatchObject({ seasons: 0, members: 0 });
  });

  it('EX-24 SEC-11 efface la saison, ses cascades et ses seuls membres ; garde le reste', async () => {
    const old = await oldSeason(db, s);
    const before = await counts(db);
    await purge(db, [old.seasonId], 2, TODAY);
    const after = await counts(db);
    const removed: Partial<Record<Table, number>> = {
      seasons: 1,
      members: 2,
      emergency_contacts: 1,
      groups: 1,
      enrollments: 2,
      slots: 1,
      slot_dates: 1,
      slot_groups: 1,
      sessions: 1,
      session_groups: 1,
      attendances: 3,
      alert_acks: 1,
    };
    for (const table of TABLES)
      expect([table, after[table]]).toEqual([table, before[table] - (removed[table] ?? 0)]);
    const remaining = (await db.query<{ id: number }>('SELECT id FROM members')).map((m) => m.id);
    expect(remaining).toEqual(
      expect.arrayContaining([s.memberId, s.otherMemberId, old.neverEnrolled]),
    );
    expect(remaining).not.toContain(old.onlyOld);
    expect(remaining).not.toContain(old.attendedOnly);
    expect(log).toHaveBeenCalledWith('PURGE_DONE', {
      seasonCount: 1,
      memberCount: 2,
    });
  });

  it('EX-24 refuse de purger la saison active : erreur avec code, rien d’effacé', async () => {
    const old = await oldSeason(db, s);
    const before = await counts(db);
    await expect(purge(db, [old.seasonId, s.seasonId], 1, TODAY)).rejects.toThrow(
      new DataError('ACTIVE_SEASON'),
    );
    expect(await counts(db)).toEqual(before);
  });

  it('EX-24 une saison introuvable ou gardée annule toute la purge', async () => {
    const old = await oldSeason(db, s);
    const before = await counts(db);
    const refused = new DataError('NOT_PURGEABLE');
    await expect(purge(db, [old.seasonId, 9999], 2, TODAY)).rejects.toThrow(refused);
    // 2025-2026 est parmi les deux plus récentes : gardée.
    await expect(purge(db, [old.seasonId, s.otherSeasonId], 2, TODAY)).rejects.toThrow(refused);
    expect(await counts(db)).toEqual(before);
    await expect(purge(db, [old.seasonId, 0], 2, TODAY)).rejects.toThrow(
      new DataError('NOT_FOUND'),
    );
    await expect(purgeImpact(db, [1.5])).rejects.toThrow(new DataError('NOT_FOUND'));
    expect(await counts(db)).toEqual(before);
  });
  it('EX-24 revérifie dans la transaction : une saison qui n’est plus au-delà de la durée est refusée', async () => {
    const old = await oldSeason(db, s);
    expect((await purgeCandidates(db, 2, TODAY)).map((x) => x.id)).toEqual([old.seasonId]);
    // Entre la confirmation et la purge, une saison plus récente disparaît : l'ancienne est gardée.
    await db.execute('DELETE FROM seasons WHERE id = ?', [s.otherSeasonId]);
    const before = await counts(db);
    await expect(purge(db, [old.seasonId], 2, TODAY)).rejects.toThrow(
      new DataError('NOT_PURGEABLE'),
    );
    expect(await counts(db)).toEqual(before);
    await expect(purge(db, [old.seasonId], 4, TODAY)).rejects.toThrow(
      new DataError('RETENTION_INVALID'),
    );
  });

  it('EX-24 les comptes de l’impact sont lus dans une seule transaction', async () => {
    const old = await oldSeason(db, s);
    const transaction = jest.spyOn(db, 'transaction');
    const query = jest.spyOn(db, 'query');
    await purgeImpact(db, [old.seasonId, s.otherSeasonId]);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('ABS-05 purge dans le fichier', () => {
  it('après une purge, les noms fictifs effacés ne restent pas dans le fichier', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kila-purge-'));
    const file = join(dir, 'kila.db');
    try {
      const db = await prepareDatabase(openNodeDb(file));
      const old = await oldSeason(db, await seed(db));
      await purge(db, [old.seasonId], 2, TODAY);
      await db.close();
      // Octets décodés en UTF-8 : une valeur ASCII se lirait telle quelle si elle restait.
      const bytes = new TextDecoder().decode(readFileSync(file));
      for (const value of ['Zzanciennezz', 'Zzpresencezz', '0699999924', 'Minimes']) {
        expect(bytes.includes(value)).toBe(false);
      }
      // Le membre jamais inscrit est gardé : son nom est encore là.
      expect(bytes.includes('Zzjamaiszz')).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
