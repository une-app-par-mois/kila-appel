// Adaptateur node:sqlite (Node 22) : vraie base SQLite pour les tests (ADR-008). Jamais dans l'appli.
import { DatabaseSync } from 'node:sqlite';
import { createDb, type Db, type SqlValue } from '@/data/db';

export const openNodeDb = (path = ':memory:'): Db => {
  const raw = new DatabaseSync(path);
  return createDb({
    run: async (sql, params) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    all: async <T>(sql: string, params: readonly SqlValue[]) =>
      raw
        .prepare(sql)
        .all(...params)
        .map((row) => ({ ...row }) as T),
    exec: async (sql) => raw.exec(sql),
    close: async () => raw.close(),
  });
};
