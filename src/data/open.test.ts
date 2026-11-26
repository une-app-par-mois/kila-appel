/**
 * @jest-environment node
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LATEST_VERSION } from '@/data/migrations';
import { openNodeDb } from '@/data/nodeDb';
import { openAppDatabase, prepareDatabase } from '@/data/open';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

describe('openAppDatabase : ouverture au démarrage (ADR-008, vérifiée sur le téléphone)', () => {
  it('ouvre, migre et écrit DB_READY avec la version dans le journal', async () => {
    const db = await openAppDatabase(async () => openNodeDb());
    expect(await db.query('PRAGMA user_version')).toEqual([{ user_version: LATEST_VERSION }]);
    expect(log).toHaveBeenCalledWith('DB_READY', { version: LATEST_VERSION });
    await db.close();
  });

  it('ferme la connexion si la préparation échoue (base trop récente), puis relaie l’erreur', async () => {
    const raw = openNodeDb();
    await raw.execute('PRAGMA user_version = 99');
    const close = jest.spyOn(raw, 'close');
    await expect(openAppDatabase(async () => raw)).rejects.toThrow();
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe('ABS-05 effacement dans le fichier (ticket 007d)', () => {
  it('active secure_delete à chaque ouverture', async () => {
    const db = await prepareDatabase(openNodeDb());
    expect(await db.query('PRAGMA secure_delete')).toEqual([{ secure_delete: 1 }]);
    await db.close();
  });

  it('après la suppression d’un membre, son nom ne reste pas dans le fichier', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kila-effacement-'));
    const file = join(dir, 'kila.db');
    try {
      const db = await prepareDatabase(openNodeDb(file));
      const marker = 'Zzfictifzz';
      const { lastInsertRowId: id } = await db.execute(
        'INSERT INTO members (first_name, last_name) VALUES (?, ?)',
        [marker, 'Exemple'],
      );
      await db.execute('DELETE FROM members WHERE id = ?', [id]);
      await db.close();
      // Octets décodés en UTF-8 : le nom, en ASCII, se lirait tel quel s'il restait.
      expect(new TextDecoder().decode(readFileSync(file)).includes(marker)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
