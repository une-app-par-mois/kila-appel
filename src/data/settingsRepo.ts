// Seul dépôt des réglages de l'appli (ADR-002 : table settings, sauvegardée et restaurée avec la
// base). Requêtes paramétrées (SEC-05). ABS-08 : aucun réglage ne porte une donnée personnelle.
// Jamais d'INSERT OR REPLACE (ARCHITECTURE §4.2) : ON CONFLICT met la valeur à jour.
import type { Db } from '@/data/db';
import { DataError } from '@/data/errors';
import { isIsoDate } from '@/domain/formats';
import { validateDate } from '@/domain/validation';

/** Clés connues ; aucune autre n'est écrite par l'appli. */
export const SETTING_KEYS = {
  lastBackupAt: 'last_backup_at',
  backupInviteSeen: 'backup_invite_seen',
  retentionSeasons: 'retention_seasons',
} as const;

type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** EX-24 : nombre de saisons gardées par la purge, de 1 à 3. */
export const RETENTION_DEFAULT = 3;
const RETENTION_VALUES = ['1', '2', '3'];

/** Réglage connu, avec une valeur que l'appli aurait pu écrire (vérification d'une sauvegarde). */
export const isValidSetting = (key: string, value: string): boolean => {
  switch (key) {
    case SETTING_KEYS.lastBackupAt:
      return isIsoDate(value);
    case SETTING_KEYS.backupInviteSeen:
      return value === '1';
    case SETTING_KEYS.retentionSeasons:
      return RETENTION_VALUES.includes(value);
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
});
