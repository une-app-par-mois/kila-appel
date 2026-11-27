/**
 * @jest-environment node
 */
// Réglages de l'appli dans la table settings (ADR-002), sauvegardés et restaurés avec la base.
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { RETENTION_DEFAULT, settingsRepo } from '@/data/settingsRepo';

describe('settingsRepo : réglages de l’appli (ADR-002)', () => {
  let db: Db;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
  });
  afterEach(async () => {
    await db.close();
  });

  it('EX-21 date de la dernière sauvegarde : aucune au départ, puis la dernière écrite', async () => {
    const settings = settingsRepo(db);
    expect(await settings.lastBackupDate()).toBeNull();
    await settings.setLastBackupDate('2026-11-20');
    await settings.setLastBackupDate('2026-11-27');
    expect(await settings.lastBackupDate()).toBe('2026-11-27');
    expect(await db.query('SELECT count(*) AS n FROM settings')).toEqual([{ n: 1 }]);
  });

  it('EX-21 refuse une date de sauvegarde qui n’est pas AAAA-MM-JJ', async () => {
    await expect(settingsRepo(db).setLastBackupDate('27/11/2026')).rejects.toMatchObject({
      code: 'DATE_INVALID',
    });
    expect(await settingsRepo(db).lastBackupDate()).toBeNull();
  });

  it('EX-21 une date illisible en base (fichier restauré) se lit comme aucune', async () => {
    await db.execute("INSERT INTO settings (key, value) VALUES ('last_backup_at', 'hier')");
    expect(await settingsRepo(db).lastBackupDate()).toBeNull();
  });

  it('EX-21 invitation à sauvegarder : pas vue au départ, puis vue', async () => {
    const settings = settingsRepo(db);
    expect(await settings.backupInviteSeen()).toBe(false);
    await settings.markBackupInviteSeen();
    await settings.markBackupInviteSeen();
    expect(await settings.backupInviteSeen()).toBe(true);
  });

  it('EX-24 durée de conservation : 3 saisons par défaut, de 1 à 3 ensuite', async () => {
    const settings = settingsRepo(db);
    expect(RETENTION_DEFAULT).toBe(3);
    expect(await settings.retentionSeasons()).toBe(3);
    await settings.setRetentionSeasons(1);
    expect(await settings.retentionSeasons()).toBe(1);
    await settings.setRetentionSeasons(2);
    expect(await settings.retentionSeasons()).toBe(2);
  });

  it.each([0, 4, 1.5, Number.NaN])('EX-24 refuse une conservation de %p saisons', async (n) => {
    await expect(settingsRepo(db).setRetentionSeasons(n)).rejects.toMatchObject({
      code: 'RETENTION_INVALID',
    });
  });

  it.each(['0', '7', 'trois', '2.5'])(
    'EX-24 une conservation illisible en base (%p) revient à la valeur par défaut',
    async (value) => {
      await db.execute("INSERT INTO settings (key, value) VALUES ('retention_seasons', ?)", [
        value,
      ]);
      expect(await settingsRepo(db).retentionSeasons()).toBe(RETENTION_DEFAULT);
    },
  );

  it('ABS-08 aucune donnée personnelle : seulement les trois réglages connus', async () => {
    const settings = settingsRepo(db);
    await settings.setLastBackupDate('2026-11-27');
    await settings.markBackupInviteSeen();
    await settings.setRetentionSeasons(2);
    const keys = await db.query<{ key: string }>('SELECT key FROM settings ORDER BY key');
    expect(keys.map((row) => row.key)).toEqual([
      'backup_invite_seen',
      'last_backup_at',
      'retention_seasons',
    ]);
  });
});
