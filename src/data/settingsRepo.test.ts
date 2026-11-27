/**
 * @jest-environment node
 */
// Réglages de l'appli dans la table settings (ADR-002), sauvegardés et restaurés avec la base.
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import {
  ALERT_THRESHOLD_DEFAULT,
  isValidSetting,
  REMINDER_DELAY_DEFAULT,
  RETENTION_DEFAULT,
  settingsRepo,
} from '@/data/settingsRepo';

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

  it('EX-25 seuil des alertes : 3 par défaut, de 2 à 10 ensuite', async () => {
    const settings = settingsRepo(db);
    expect(ALERT_THRESHOLD_DEFAULT).toBe(3);
    expect(await settings.alertThreshold()).toBe(3);
    for (const n of [2, 5, 10]) {
      await settings.setAlertThreshold(n);
      expect(await settings.alertThreshold()).toBe(n);
    }
    expect(await db.query("SELECT value FROM settings WHERE key = 'alert_threshold'")).toEqual([
      { value: '10' },
    ]);
  });

  it.each([1, 11, 0, -3, 2.5, Number.NaN])('EX-25 refuse un seuil de %p', async (n) => {
    await expect(settingsRepo(db).setAlertThreshold(n)).rejects.toMatchObject({
      code: 'ALERT_THRESHOLD_INVALID',
    });
    expect(await settingsRepo(db).alertThreshold()).toBe(ALERT_THRESHOLD_DEFAULT);
  });

  it.each(['1', '11', 'trois', '3.0', '03', ''])(
    'EX-25 un seuil illisible en base (%p) se lit comme 3',
    async (value) => {
      await db.execute("INSERT INTO settings (key, value) VALUES ('alert_threshold', ?)", [value]);
      expect(await settingsRepo(db).alertThreshold()).toBe(3);
    },
  );

  it('EX-25 une sauvegarde qui contient le seuil reste valide (isValidSetting)', () => {
    for (let n = 2; n <= 10; n += 1)
      expect(isValidSetting('alert_threshold', String(n))).toBe(true);
    for (const value of ['1', '11', '03', 'trois', ''])
      expect(isValidSetting('alert_threshold', value)).toBe(false);
  });

  it('EX-28 EX-29 relance : désactivée et 30 min par défaut', async () => {
    expect(REMINDER_DELAY_DEFAULT).toBe(30);
    expect(await settingsRepo(db).reminderSettings()).toEqual({ enabled: false, delayMin: 30 });
  });

  it('EX-28 relance : activer, choisir un délai autorisé, désactiver', async () => {
    const settings = settingsRepo(db);
    await settings.setReminderEnabled(true);
    for (const n of [10, 15, 20, 30, 45, 60]) {
      await settings.setReminderDelay(n);
      expect(await settings.reminderSettings()).toEqual({ enabled: true, delayMin: n });
    }
    await settings.setReminderEnabled(false);
    expect(await settings.reminderSettings()).toEqual({ enabled: false, delayMin: 60 });
    expect(
      await db.query("SELECT key, value FROM settings WHERE key LIKE 'reminder%' ORDER BY key"),
    ).toEqual([
      { key: 'reminder_delay_min', value: '60' },
      { key: 'reminder_enabled', value: '0' },
    ]);
  });

  it.each([0, 5, 25, 90, -30, 30.5, Number.NaN])(
    'EX-28 refuse un délai de relance de %p min (REMINDER_DELAY_INVALID)',
    async (n) => {
      await expect(settingsRepo(db).setReminderDelay(n)).rejects.toMatchObject({
        code: 'REMINDER_DELAY_INVALID',
      });
      expect((await settingsRepo(db).reminderSettings()).delayMin).toBe(30);
    },
  );

  it.each([
    ['2', '25'],
    ['oui', 'trente'],
    ['', ''],
    ['01', '030'],
    ['true', '30.0'],
  ])(
    'EX-28 relance illisible en base (%p, %p) : se lit comme désactivée et 30',
    async (enabled, delay) => {
      await db.execute(
        "INSERT INTO settings (key, value) VALUES ('reminder_enabled', ?), ('reminder_delay_min', ?)",
        [enabled, delay],
      );
      expect(await settingsRepo(db).reminderSettings()).toEqual({ enabled: false, delayMin: 30 });
    },
  );

  it('EX-28 une sauvegarde qui contient les réglages de relance reste valide (isValidSetting)', () => {
    for (const value of ['0', '1']) expect(isValidSetting('reminder_enabled', value)).toBe(true);
    for (const value of ['2', 'oui', '', '01'])
      expect(isValidSetting('reminder_enabled', value)).toBe(false);
    for (const value of ['10', '15', '20', '30', '45', '60'])
      expect(isValidSetting('reminder_delay_min', value)).toBe(true);
    for (const value of ['0', '25', '90', '030', '30.0', 'trente', ''])
      expect(isValidSetting('reminder_delay_min', value)).toBe(false);
  });

  it('ABS-08 aucune donnée personnelle : seulement les réglages connus', async () => {
    const settings = settingsRepo(db);
    await settings.setLastBackupDate('2026-11-27');
    await settings.markBackupInviteSeen();
    await settings.setRetentionSeasons(2);
    await settings.setAlertThreshold(4);
    await settings.setReminderEnabled(true);
    await settings.setReminderDelay(45);
    const keys = await db.query<{ key: string }>('SELECT key FROM settings ORDER BY key');
    expect(keys.map((row) => row.key)).toEqual([
      'alert_threshold',
      'backup_invite_seen',
      'last_backup_at',
      'reminder_delay_min',
      'reminder_enabled',
      'retention_seasons',
    ]);
  });
});
