/**
 * @jest-environment node
 */
// useErase (ticket 015b, EX-24, SEC-11, ABS-05) : conservation de 1 à 3 saisons sans purge
// automatique, candidates au jour de l'horloge partagée, purge sous le verrou commun. Vraie base
// node:sqlite et jeu fictif.
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { addSeason, counts, oldSeason } from '@/__fixtures__/purgeSeed';
import { type Seeded, seed } from '@/__fixtures__/seed';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { settingsRepo } from '@/data/settingsRepo';
import { onDataChanged } from '@/hooks/dataChanged';
import { fileLock } from '@/hooks/fileLock';
import { useErase } from '@/hooks/useErase';

let mockDb: Db | null = null;
let mockToday = '2026-11-27';
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/hooks/useLocalNow', () => ({
  useLocalNow: () => ({ date: mockToday, time: '18:00' }),
}));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const names = (seasons: { name: string }[] | null) => seasons?.map((x) => x.name);

describe('useErase : conservation et purge (EX-24)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    await addSeason(db, '2024-2025', '2024-09-01', '2025-07-31');
    mockDb = db;
    mockToday = '2026-11-27';
    log.mockClear();
  });
  afterEach(async () => {
    fileLock.release('erase');
    fileLock.release('export');
    mockDb = null;
    await db.close();
  });

  it('EX-24 conservation de 3 saisons par défaut ; aucune candidate', async () => {
    const { result } = await renderHook(() => useErase());
    await waitFor(() => expect(result.current.retention).toBe(3));
    expect(result.current.candidates).toEqual([]);
  });

  it('EX-24 changer la conservation l’enregistre, recalcule les candidates, ne purge rien', async () => {
    const { result } = await renderHook(() => useErase());
    await waitFor(() => expect(result.current.retention).toBe(3));
    const before = await counts(db);
    let saved = false;
    await act(async () => {
      saved = await result.current.setRetention(1);
    });
    expect(saved).toBe(true);
    expect(await settingsRepo(db).retentionSeasons()).toBe(1);
    await waitFor(() =>
      expect(names(result.current.candidates)).toEqual(['Saison 2025-2026', '2024-2025']),
    );
    expect(result.current.retention).toBe(1);
    const after = await counts(db);
    expect({ ...after, settings: 0 }).toEqual({ ...before, settings: 0 });
  });

  it('EX-24 une conservation hors de 1 à 3 est refusée, rien d’écrit', async () => {
    const { result } = await renderHook(() => useErase());
    await waitFor(() => expect(result.current.retention).toBe(3));
    let saved = true;
    await act(async () => {
      saved = await result.current.setRetention(4);
    });
    expect(saved).toBe(false);
    expect(log).toHaveBeenCalledWith('RETENTION_SAVE_FAILED');
    expect(await db.query('SELECT key FROM settings')).toEqual([]);
  });

  it('EX-24 les candidates suivent le jour de l’horloge partagée', async () => {
    await addSeason(db, 'Stage', '2026-11-28', '2027-01-31');
    await settingsRepo(db).setRetentionSeasons(2);
    const { result, rerender } = await renderHook(() => useErase());
    await waitFor(() => expect(names(result.current.candidates)).toEqual(['2024-2025']));
    mockToday = '2026-11-28';
    await rerender({});
    await waitFor(() =>
      expect(names(result.current.candidates)).toEqual(['Saison 2025-2026', '2024-2025']),
    );
  });

  it('EX-24 SEC-11 purge sous le verrou commun, puis prévient les écrans', async () => {
    const old = await oldSeason(db, s);
    const { result } = await renderHook(() => useErase());
    await waitFor(() =>
      expect(result.current.candidates?.map((x) => x.id)).toEqual([old.seasonId]),
    );
    expect(await result.current.impact([old.seasonId])).toMatchObject({ seasons: 1, members: 2 });
    const changed = jest.fn();
    const off = onDataChanged(changed);
    const holders: (string | null)[] = [];
    const transaction = db.transaction.bind(db);
    jest.spyOn(db, 'transaction').mockImplementation((work) => {
      holders.push(fileLock.holder());
      return transaction(work);
    });
    let done = false;
    await act(async () => {
      done = await result.current.purgeNow([old.seasonId]);
    });
    off();
    expect(done).toBe(true);
    expect(holders).toContain('erase');
    expect(fileLock.holder()).toBeNull();
    expect(changed).toHaveBeenCalled();
    expect(await db.query('SELECT id FROM seasons WHERE id = ?', [old.seasonId])).toEqual([]);
    await waitFor(() => expect(result.current.candidates).toEqual([]));
  });

  it('EX-24 verrou déjà pris par un export : rien d’effacé', async () => {
    const old = await oldSeason(db, s);
    const { result } = await renderHook(() => useErase());
    await waitFor(() => expect(result.current.candidates?.length).toBe(1));
    const before = await counts(db);
    fileLock.acquire('export');
    let done = true;
    await act(async () => {
      done = await result.current.purgeNow([old.seasonId]);
    });
    expect(done).toBe(false);
    expect(await counts(db)).toEqual(before);
    expect(fileLock.holder()).toBe('export');
  });

  it('EX-24 échec (le jour a changé la liste) : rien d’effacé, PURGE_FAILED, verrou rendu', async () => {
    const old = await oldSeason(db, s);
    await addSeason(db, 'Stage', '2026-11-28', '2027-01-31');
    await settingsRepo(db).setRetentionSeasons(2);
    const { result, rerender } = await renderHook(() => useErase());
    await waitFor(() =>
      expect(names(result.current.candidates)).toEqual(['2024-2025', '2023-2024']),
    );
    // Confirmées le 27 ; le stage commence le 28 : 2025-2026 dépasse aussi la durée.
    const confirmed = (result.current.candidates ?? []).map((x) => x.id);
    expect(confirmed).toContain(old.seasonId);
    const before = await counts(db);
    mockToday = '2026-11-28';
    await rerender({});
    let done = true;
    await act(async () => {
      done = await result.current.purgeNow(confirmed);
    });
    expect(done).toBe(false);
    expect(log).toHaveBeenCalledWith('PURGE_FAILED');
    expect(await counts(db)).toEqual(before);
    expect(fileLock.holder()).toBeNull();
  });
});
