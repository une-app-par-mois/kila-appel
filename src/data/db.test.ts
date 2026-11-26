import { BROKEN_CONNECTION, createDb, type Driver, TRANSACTION_OVER } from '@/data/db';

// Pilote factice : chaque instruction est notée ; ROLLBACK peut être forcé en échec.
const fakeDriver = (rollbackError?: string) => {
  const log: string[] = [];
  const driver: Driver = {
    run: async (sql) => {
      log.push(sql);
      return { changes: 1, lastInsertRowId: 1 };
    },
    all: async () => [],
    exec: async (sql) => {
      log.push(sql);
      if (sql === 'ROLLBACK' && rollbackError) {
        throw new Error(rollbackError);
      }
    },
    close: async () => undefined,
  };
  return { driver, log };
};

describe('createDb : transactions sur une seule connexion', () => {
  it('ROLLBACK refusé faute de transaction active : l’erreur d’origine remonte, la base reste utilisable', async () => {
    const { driver } = fakeDriver('cannot rollback - no transaction is active');
    const db = createDb(driver);
    await expect(
      db.transaction(async () => {
        throw new Error('cause réelle');
      }),
    ).rejects.toThrow('cause réelle');
    await expect(db.execute('SELECT 1')).resolves.toEqual({ changes: 1, lastInsertRowId: 1 });
  });

  it('ROLLBACK en échec pour une autre raison : l’erreur d’origine remonte et la connexion est marquée cassée', async () => {
    const { driver, log } = fakeDriver('disk I/O error');
    const db = createDb(driver);
    await expect(
      db.transaction(async () => {
        throw new Error('cause réelle');
      }),
    ).rejects.toThrow('cause réelle');
    // Sans cela, les écritures suivantes iraient dans une transaction jamais validée.
    await expect(db.execute('INSERT INTO settings VALUES (1)')).rejects.toThrow(BROKEN_CONNECTION);
    await expect(db.query('SELECT 1')).rejects.toThrow(BROKEN_CONNECTION);
    await expect(db.transaction(async () => 1)).rejects.toThrow(BROKEN_CONNECTION);
    expect(log).not.toContain('INSERT INTO settings VALUES (1)');
    // Fermer reste possible, pour rouvrir la base.
    await expect(db.close()).resolves.toBeUndefined();
  });

  it('la base de transaction est refusée une fois la transaction terminée', async () => {
    const { driver, log } = fakeDriver();
    const db = createDb(driver);
    let leaked: Parameters<Parameters<typeof db.transaction>[0]>[0] | undefined;
    await db.transaction(async (tx) => {
      leaked = tx;
    });
    await expect(leaked?.execute('DELETE FROM attendances')).rejects.toThrow(TRANSACTION_OVER);
    await expect(leaked?.query('SELECT 1')).rejects.toThrow(TRANSACTION_OVER);
    expect(log).not.toContain('DELETE FROM attendances');
  });
});
