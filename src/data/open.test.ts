/**
 * @jest-environment node
 */
import { openNodeDb } from '@/data/nodeDb';
import { openAppDatabase } from '@/data/open';

jest.mock('@/data/log', () => ({ log: jest.fn() }));
const { log } = jest.requireMock('@/data/log') as { log: jest.Mock };

describe('openAppDatabase : ouverture au démarrage (ADR-008, vérifiée sur le téléphone)', () => {
  it('ouvre, migre et écrit DB_READY avec la version dans le journal', async () => {
    const db = await openAppDatabase(async () => openNodeDb());
    expect(await db.query('PRAGMA user_version')).toEqual([{ user_version: 1 }]);
    expect(log).toHaveBeenCalledWith('DB_READY', { version: 1 });
    await db.close();
  });
});
