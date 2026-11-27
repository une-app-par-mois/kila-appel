// Rappels de sauvegarde (ticket 014d, EX-21) : invitation après le premier appel enregistré,
// bandeau de l'accueil après 30 jours sans sauvegarde. Vraie base node:sqlite et jeu fictif :
// créneau du mercredi 17:30, groupe Poussins, séance du 25/11 enregistrée, aucun réglage.
// Horloge figée au mercredi 18/11/2026 18:00.
import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { nodeStorage, tempDir } from '@/__fixtures__/backupFiles';
import { type Seeded, seed } from '@/__fixtures__/seed';
import RollCall from '@/app/appel';
import Backup from '@/app/donnees';
import BackupInvite from '@/app/invitation-sauvegarde';
import { RootStack, tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import type { BackupStorage } from '@/data/expoFiles';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';

let mockDb: Db | null = null;
let mockStorage: BackupStorage;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));
jest.mock('@/data/expoFiles', () => ({
  expoBackupDeps: {
    get files() {
      return mockStorage;
    },
    share: jest.fn(),
    open: jest.fn(),
  },
}));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

const routes = {
  _layout: RootStack,
  ...tabRoutes,
  appel: RollCall,
  donnees: Backup,
  'invitation-sauvegarde': BackupInvite,
};
const open = (initialUrl = '/') => renderRouter(routes, { initialUrl });
const i = labels.backupInvite;
const h = labels.home;
const DATE = '2026-11-18';
const setting = (key: string, value: string) =>
  mockDb?.execute('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
const inviteSeen = async () =>
  (await mockDb?.query("SELECT value FROM settings WHERE key = 'backup_invite_seen'")) ?? [];

describe('EX-21 rappels de sauvegarde', () => {
  let db: Db;
  let s: Seeded;
  let dir: ReturnType<typeof tempDir>;
  beforeEach(async () => {
    dir = tempDir();
    mockStorage = nodeStorage(dir.path('sauvegardes'));
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
    dir.remove();
  });

  /** Ouvre l'appel du jour et l'enregistre. */
  const recordCall = async () => {
    const router = await open(`/appel?creneau=${s.slotId}&date=${DATE}`);
    // L'appel est prêt quand ses membres sont affichés.
    await screen.findByRole('button', {
      name: labels.rollCall.row('Alix Exemple', labels.statuses.present),
    });
    await fireEvent.press(await screen.findByRole('button', { name: labels.rollCall.save }));
    expect(await screen.findByText(labels.rollCall.saved)).toBeTruthy();
    return router;
  };
  const advance = (ms: number) =>
    act(async () => {
      jest.advanceTimersByTime(ms);
    });

  describe('invitation après le premier appel', () => {
    it('EX-21 « Appel enregistré » 1,2 s, puis l’invitation de la maquette, marquée vue', async () => {
      const router = await recordCall();
      await advance(1000);
      expect(router.getPathname()).toBe('/appel');
      await advance(500);
      await waitFor(() => expect(router.getPathname()).toBe('/invitation-sauvegarde'));
      expect(await screen.findByRole('header', { name: 'Premier appel enregistré' })).toBeTruthy();
      expect(screen.getByText('Pensez à sauvegarder')).toBeTruthy();
      expect(
        screen.getByText(
          'Vos données ne vivent que sur cet appareil. Si vous le perdez ou le changez, seule une ' +
            'sauvegarde permet de les retrouver.',
        ),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Sauvegarder maintenant' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Plus tard' })).toBeTruthy();
      // Pas de flèche de retour.
      expect(screen.queryByRole('button', { name: labels.common.back })).toBeNull();
      // Marquée vue à l'affichage : l'écriture passe avant cette lecture (file de la base).
      expect(await inviteSeen()).toEqual([{ value: '1' }]);
    });

    it('EX-21 « Plus tard » mène à l’Historique', async () => {
      const router = await recordCall();
      await advance(1500);
      await fireEvent.press(await screen.findByRole('button', { name: i.later }));
      await waitFor(() => expect(router.getPathname()).toBe('/historique'));
    });

    it('EX-21 le retour du système mène à l’Historique', async () => {
      const router = await recordCall();
      await advance(1500);
      await screen.findByRole('button', { name: i.later });
      await act(async () => {
        appRouter.back();
      });
      await waitFor(() => expect(router.getPathname()).toBe('/historique'));
    });

    it('EX-21 « Sauvegarder maintenant » ouvre Sauvegarde, dont le retour mène à l’Historique', async () => {
      const router = await recordCall();
      await advance(1500);
      await fireEvent.press(await screen.findByRole('button', { name: i.saveNow }));
      await waitFor(() => expect(router.getPathname()).toBe('/donnees'));
      await fireEvent.press(await screen.findByRole('button', { name: labels.common.back }));
      await waitFor(() => expect(router.getPathname()).toBe('/historique'));
    });

    it('EX-21 une seule fois : invitation déjà vue, retour à l’Historique', async () => {
      await setting('backup_invite_seen', '1');
      const router = await recordCall();
      await advance(1500);
      await waitFor(() => expect(router.getPathname()).toBe('/historique'));
    });

    it('EX-21 une sauvegarde existe déjà : pas d’invitation', async () => {
      await setting('last_backup_at', '2026-11-01');
      const router = await recordCall();
      await advance(1500);
      await waitFor(() => expect(router.getPathname()).toBe('/historique'));
      expect(await inviteSeen()).toEqual([]);
    });

    it('EX-21 réglages illisibles : pas d’invitation, un code au journal', async () => {
      await db.execute('DROP TABLE settings');
      const router = await recordCall();
      await advance(1500);
      await waitFor(() => expect(router.getPathname()).toBe('/historique'));
      expect(log).toHaveBeenCalledWith('BACKUP_INVITE_LOAD_FAILED');
    });

    it('EX-21 « vue » non écrite : l’invitation s’affiche quand même, un code au journal', async () => {
      await db.execute(
        "CREATE TRIGGER no_settings BEFORE INSERT ON settings BEGIN SELECT RAISE(ABORT, 'x'); END",
      );
      const router = await recordCall();
      await advance(1500);
      await waitFor(() => expect(router.getPathname()).toBe('/invitation-sauvegarde'));
      expect(await screen.findByText('Pensez à sauvegarder')).toBeTruthy();
      await waitFor(() => expect(log).toHaveBeenCalledWith('BACKUP_INVITE_SAVE_FAILED'));
    });

    it('EX-21 écran quitté pendant les 1,2 s : ni invitation ni retour', async () => {
      const router = await recordCall();
      await fireEvent.press(screen.getByRole('button', { name: labels.common.back }));
      await advance(1500);
      expect(router.getPathname()).toBe('/');
      expect(await inviteSeen()).toEqual([]);
    });
  });

  describe('bandeau de l’accueil', () => {
    const banner = (days: number) => screen.findByText(h.backupBanner(days));
    const noBanner = async () => {
      await screen.findByText(h.session('17:30', '19:00', 'Gymnase', 2));
      expect(screen.queryByText(h.backupBannerText)).toBeNull();
    };
    const oldSession = (date: string, seasonId = s.seasonId) =>
      db.execute(
        "INSERT INTO sessions (season_id, slot_id, date, start_time, state) VALUES (?, NULL, ?, '10:00', 'recorded')",
        [seasonId, date],
      );

    it('EX-21 sans sauvegarde, 30 jours après la plus ancienne séance : le bandeau', async () => {
      await oldSession('2026-10-19');
      const router = await open('/');
      expect(await banner(30)).toBeTruthy();
      expect(screen.getByText('Pas de sauvegarde depuis 30 jours')).toBeTruthy();
      expect(screen.getByText('Vos données ne vivent que sur cet appareil.')).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: h.backupNow }));
      expect(router.getPathname()).toBe('/donnees');
    });

    it('EX-21 sans sauvegarde, 29 jours après la plus ancienne séance : rien', async () => {
      await oldSession('2026-10-20');
      await open('/');
      await noBanner();
    });

    it('EX-21 dernière sauvegarde il y a 34 jours : le bandeau, même avec un appel en cours', async () => {
      await setting('last_backup_at', '2026-10-15');
      await db.execute(
        'INSERT INTO roll_call_drafts (id, season_id, slot_id, date, started_at, updated_at) VALUES (1, ?, ?, ?, ?, ?)',
        [s.seasonId, s.slotId, DATE, '17:32', '2026-11-18T17:35:00'],
      );
      await db.execute('INSERT INTO roll_call_draft_groups (draft_id, group_id) VALUES (1, ?)', [
        s.groupId,
      ]);
      await open('/');
      expect(await banner(34)).toBeTruthy();
    });

    it('EX-21 sauvegarde récente : rien, même avec de vieilles séances', async () => {
      await oldSession('2026-01-05');
      await setting('last_backup_at', '2026-11-10');
      await open('/');
      await noBanner();
    });

    it('EX-21 date de sauvegarde future : rien', async () => {
      await oldSession('2026-01-05');
      await setting('last_backup_at', '2026-12-20');
      await open('/');
      await noBanner();
    });

    it('EX-21 jamais pendant Bienvenue', async () => {
      // Bienvenue : un créneau manque et aucun appel dans la saison active ; une séance ancienne
      // reste dans l'autre saison.
      await oldSession('2025-10-01', s.otherSeasonId);
      await db.execute('DELETE FROM sessions WHERE season_id = ?', [s.seasonId]);
      await db.execute('DELETE FROM slots');
      await open('/');
      expect(await screen.findByRole('header', { name: labels.welcome.title })).toBeTruthy();
      expect(screen.queryByText(h.backupBannerText)).toBeNull();
    });

    it('EX-21 date illisible : le message d’erreur de l’accueil', async () => {
      await oldSession('2026-01-05');
      await db.execute('DROP TABLE settings');
      await open('/');
      expect(await screen.findByText(labels.common.loadFailed)).toBeTruthy();
      expect(screen.queryByText(h.backupBannerText)).toBeNull();
    });
  });
});
