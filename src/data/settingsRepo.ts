// Seul dépôt des réglages de l'appli (ADR-002 : table settings, sauvegardée et restaurée avec la
// base). Requêtes paramétrées (SEC-05). ABS-08 : aucun réglage ne porte une donnée personnelle.
// Jamais d'INSERT OR REPLACE (ARCHITECTURE §4.2) : ON CONFLICT met la valeur à jour.
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import { isIsoDate } from '@/domain/formats';
import { REMINDER_DELAY_DEFAULT, REMINDER_DELAYS, type ReminderSettings } from '@/domain/reminders';
import { validateDate } from '@/domain/validation';

/** Clés connues ; aucune autre n'est écrite par l'appli. */
export const SETTING_KEYS = {
  lastBackupAt: 'last_backup_at',
  backupInviteSeen: 'backup_invite_seen',
  retentionSeasons: 'retention_seasons',
  alertThreshold: 'alert_threshold',
  reminderEnabled: 'reminder_enabled',
  reminderDelayMin: 'reminder_delay_min',
} as const;

type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** EX-24 : nombre de saisons gardées par la purge, de 1 à 3. */
export const RETENTION_DEFAULT = 3;
const RETENTION_VALUES = ['1', '2', '3'];

/** EX-25 : seuil de la série d'absences qui lève une alerte, de 2 à 10 (3 par défaut). */
export const ALERT_THRESHOLD_DEFAULT = 3;
const ALERT_THRESHOLD_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10'];

/** EX-28, EX-29 : relance désactivée par défaut, délai parmi les valeurs proposées (30 par défaut). */
export { REMINDER_DELAY_DEFAULT };

const REMINDER_ENABLED_VALUES = ['0', '1'];
const REMINDER_DELAY_VALUES = REMINDER_DELAYS.map(String);

/** Réglage connu, avec une valeur que l'appli aurait pu écrire (vérification d'une sauvegarde). */
export const isValidSetting = (key: string, value: string): boolean => {
  switch (key) {
    case SETTING_KEYS.lastBackupAt:
      return isIsoDate(value);
    case SETTING_KEYS.backupInviteSeen:
      return value === '1';
    case SETTING_KEYS.retentionSeasons:
      return RETENTION_VALUES.includes(value);
    case SETTING_KEYS.alertThreshold:
      return ALERT_THRESHOLD_VALUES.includes(value);
    case SETTING_KEYS.reminderEnabled:
      return REMINDER_ENABLED_VALUES.includes(value);
    case SETTING_KEYS.reminderDelayMin:
      return REMINDER_DELAY_VALUES.includes(value);
    default:
      return false;
  }
};

const read = async (db: Db, key: SettingKey): Promise<string | null> => {
  const [row] = await db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', [
    key,
  ]);
  return row?.value ?? null;
};

const write = async (db: Db, key: SettingKey, value: string): Promise<void> => {
  await db.execute(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
};

export const settingsRepo = (db: Db) => ({
  /** EX-21 : date (AAAA-MM-JJ) de la dernière sauvegarde ; null si aucune ou illisible. */
  lastBackupDate: async (): Promise<string | null> => {
    const value = await read(db, SETTING_KEYS.lastBackupAt);
    return value !== null && isIsoDate(value) ? value : null;
  },

  setLastBackupDate: async (date: string): Promise<void> =>
    write(db, SETTING_KEYS.lastBackupAt, validateDate(date)),

  /** EX-21 : l'invitation à sauvegarder n'est montrée qu'une fois. */
  backupInviteSeen: async (): Promise<boolean> =>
    (await read(db, SETTING_KEYS.backupInviteSeen)) === '1',

  markBackupInviteSeen: async (): Promise<void> => write(db, SETTING_KEYS.backupInviteSeen, '1'),

  /** EX-24 : saisons gardées ; une valeur illisible (fichier restauré) revient à la valeur par défaut. */
  retentionSeasons: async (): Promise<number> => {
    const value = await read(db, SETTING_KEYS.retentionSeasons);
    return value !== null && RETENTION_VALUES.includes(value) ? Number(value) : RETENTION_DEFAULT;
  },

  setRetentionSeasons: async (seasons: number): Promise<void> => {
    if (!RETENTION_VALUES.includes(String(seasons))) throw new DataError('RETENTION_INVALID');
    await write(db, SETTING_KEYS.retentionSeasons, String(seasons));
  },

  /** EX-25 : seuil des alertes ; une valeur illisible (fichier restauré) se lit comme 3. */
  alertThreshold: async (): Promise<number> => {
    const value = await read(db, SETTING_KEYS.alertThreshold);
    return value !== null && ALERT_THRESHOLD_VALUES.includes(value)
      ? Number(value)
      : ALERT_THRESHOLD_DEFAULT;
  },

  setAlertThreshold: async (threshold: number): Promise<void> => {
    if (!ALERT_THRESHOLD_VALUES.includes(String(threshold)))
      throw new DataError('ALERT_THRESHOLD_INVALID');
    await write(db, SETTING_KEYS.alertThreshold, String(threshold));
  },

  /** EX-28 : relance ; une valeur illisible (fichier restauré) se lit comme désactivée et 30. */
  reminderSettings: async (): Promise<ReminderSettings> => {
    const delay = await read(db, SETTING_KEYS.reminderDelayMin);
    return {
      enabled: (await read(db, SETTING_KEYS.reminderEnabled)) === '1',
      delayMin:
        delay !== null && REMINDER_DELAY_VALUES.includes(delay)
          ? Number(delay)
          : REMINDER_DELAY_DEFAULT,
    };
  },

  setReminderEnabled: async (enabled: boolean): Promise<void> =>
    write(db, SETTING_KEYS.reminderEnabled, enabled ? '1' : '0'),

  setReminderDelay: async (delayMin: number): Promise<void> => {
    if (!REMINDER_DELAY_VALUES.includes(String(delayMin)))
      throw new DataError('REMINDER_DELAY_INVALID');
    await write(db, SETTING_KEYS.reminderDelayMin, String(delayMin));
  },
});
