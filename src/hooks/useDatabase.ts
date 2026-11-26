// Base de l'appli, ouverte une fois au démarrage (ADR-002, ADR-008).
// Les écrans n'accèdent aux données que par les hooks (CONV-10).
import { useEffect, useState } from 'react';
import type { Db } from '@/data/db';
import { openExpoDb } from '@/data/expoDb';
import { log } from '@/data/log';
import { openAppDatabase } from '@/data/open';

/** Rend la base une fois prête, `null` avant. Un échec est écrit dans le journal, sans détail. */
export const useDatabase = (open: () => Promise<Db> = openExpoDb): Db | null => {
  const [db, setDb] = useState<Db | null>(null);
  useEffect(() => {
    let active = true;
    openAppDatabase(open).then(
      (ready) => {
        if (active) setDb(ready);
      },
      // EX-22 (base illisible, écran de récupération) : ticket 014.
      () => log('DB_OPEN_FAILED'),
    );
    return () => {
      active = false;
    };
  }, [open]);
  return db;
};
