// Rappels de sauvegarde, cas limites (ticket 014d, EX-21, revue de code) : base pas encore ouverte,
// lecture lente des réglages, invitation ouverte sans être due, date de séance mal formée, bandeau
// illisible. Vraie base node:sqlite et jeu fictif ; horloge figée au mercredi 18/11/2026 18:00.
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { type Seeded, seed } from '@/__fixtures__/seed';
import RollCall from '@/app/appel';
import BackupInvite from '@/app/invitation-sauvegarde';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { useSavedReturn } from '@/hooks/useSavedReturn';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

/** Écran minimal qui vient d'enregistrer un appel. */
const JustSaved = () => {
  useSavedReturn(true);
  return null;
};
const routes = {
  _layout: RootStack,
  ...tabRoutes,
  appel: RollCall,
  enregistre: JustSaved,
  'invitation-sauvegarde': BackupInvite,
};
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const h = labels.home;
const DATE = '2026-11-18';
const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });
/** La même base, dont les requêtes choisies passent par `override`. */
const withQuery = (db: Db, match: string, override: (run: () => Promise<unknown[]>) => unknown) =>
  ({
    ...db,
    query: (sql: string, params?: (string | number | null)[]) =>
      sql.includes(match) ? override(() => db.query(sql, params)) : db.query(sql, params),
  }) as Db;

describe('EX-21 rappels de sauvegarde, cas limites', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    await db.execute('DELETE FROM roll_call_drafts');
    mockDb = db;
    log.mockClear();
    jest.useFakeTimers({ advanceTimers: true, now: new Date(2026, 10, 18, 18, 0) });
  });
  afterEach(async () => {
    jest.useRealTimers();
    mockDb = null;
    await db.close();
  });

  it('EX-21 base pas encore ouverte : retour à l’Historique quand même, sans invitation', async () => {
    mockDb = null;
    const router = await open('/enregistre');
    await advance(1500);
    await waitFor(() => expect(router.getPathname()).toBe('/historique'));
  });

  it('EX-21 réglages lus trop lentement : retour à 1,2 s, sans invitation, un code', async () => {
    mockDb = withQuery(db, 'FROM settings', () => new Promise(() => {}));
    const router = await open('/enregistre');
    await advance(1500);
    await waitFor(() => expect(router.getPathname()).toBe('/historique'));
    expect(log).toHaveBeenCalledWith('BACKUP_INVITE_LOAD_SLOW');
  });

  it('EX-21 appel enregistré, réglages lents : l’Historique à 1,2 s', async () => {
    const router = await open(`/appel?creneau=${s.slotId}&date=${DATE}`);
    await screen.findByRole('button', {
      name: labels.rollCall.row('Alix Exemple', labels.statuses.present),
    });
    mockDb = withQuery(db, 'FROM settings', () => new Promise(() => {}));
    await fireEvent.press(screen.getByRole('button', { name: labels.rollCall.save }));
    expect(await screen.findByText(labels.rollCall.saved)).toBeTruthy();
    await advance(1500);
    await waitFor(() => expect(router.getPathname()).toBe('/historique'));
  });

  it('EX-21 invitation ouverte sans être due (déjà vue) : l’Historique, rien d’écrit', async () => {
    await db.execute("INSERT INTO settings (key, value) VALUES ('backup_invite_seen', '1')");
    const router = await open('/invitation-sauvegarde');
    await waitFor(() => expect(router.getPathname()).toBe('/historique'));
  });

  it('EX-21 invitation ouverte après une sauvegarde : l’Historique, pas marquée vue', async () => {
    await db.execute("INSERT INTO settings (key, value) VALUES ('last_backup_at', '2026-11-01')");
    const router = await open('/invitation-sauvegarde');
    await waitFor(() => expect(router.getPathname()).toBe('/historique'));
    expect(await db.query("SELECT key FROM settings WHERE key = 'backup_invite_seen'")).toEqual([]);
  });

  it('EX-21 date de séance mal formée : l’accueil s’affiche, sans bandeau', async () => {
    mockDb = withQuery(db, 'MIN(date)', async () => [{ date: '2026-13-45' }]);
    await open('/');
    expect(await screen.findByText(h.session('17:30', '19:00', 'Gymnase', 2))).toBeTruthy();
    expect(screen.queryByText(h.backupBannerText)).toBeNull();
    expect(screen.queryByText(labels.common.loadFailed)).toBeNull();
  });

  it('EX-21 bandeau illisible : caché, un code, le reste de l’accueil sans message', async () => {
    await db.execute(
      "INSERT INTO sessions (season_id, date, start_time, state) VALUES (?, '2026-01-05', '10:00', 'recorded')",
      [s.seasonId],
    );
    mockDb = withQuery(db, 'MIN(date)', async () => {
      throw new Error('lecture');
    });
    await open('/');
    expect(await screen.findByText(h.session('17:30', '19:00', 'Gymnase', 2))).toBeTruthy();
    await waitFor(() => expect(log).toHaveBeenCalledWith('BACKUP_BANNER_LOAD_FAILED', {}));
    expect(screen.queryByText(h.backupBannerText)).toBeNull();
    expect(screen.queryByText(labels.common.loadFailed)).toBeNull();
  });
});
