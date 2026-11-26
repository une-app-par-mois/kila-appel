/**
 * @jest-environment node
 */

import { LATEST_VERSION } from '@/data/migrations';
import { openNodeDb } from '@/data/nodeDb';
import { openAppDatabase } from '@/data/open';

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
