// Base de l'appli : une seule connexion, ouverte et migrée une fois, gardée toute la vie de
// l'appli (ADR-002, ADR-008). Tous les appels partagent la même ouverture : deux connexions
// casseraient la file commune des transactions (src/data/db.ts).
// Les écrans n'accèdent aux données que par les hooks (CONV-10).
import { useEffect, useRef, useState } from 'react';
import type { Db } from '@/data/db';
import { openExpoDb } from '@/data/expoDb';
import { log } from '@/data/log';
import { openAppDatabase } from '@/data/open';

let opening: Promise<Db> | null = null;

/** Ouverture partagée ; après un échec, le prochain appel réessaie. */
const getDatabase = (open: () => Promise<Db>): Promise<Db> => {
  if (opening === null) {
    opening = openAppDatabase(open).catch((error: unknown) => {
      opening = null;
      throw error;
    });
  }
  return opening;
};

/** Tests seulement : oublie l'ouverture partagée. */
export const resetDatabaseForTests = (): void => {
  opening = null;
};

/**
 * Rend la base une fois prête, `null` avant. Un échec est écrit dans le journal, sans détail.
 * `open` ne sert qu'à la première ouverture (tests) ; il est ignoré ensuite.
 */
export const useDatabase = (open: () => Promise<Db> = openExpoDb): Db | null => {
  const [db, setDb] = useState<Db | null>(null);
  const openRef = useRef(open);
  useEffect(() => {
    let active = true;
    getDatabase(openRef.current).then(
      (ready) => {
        if (active) setDb(ready);
      },
      // EX-22 (base illisible, écran de récupération) : ticket 014.
      () => log('DB_OPEN_FAILED'),
    );
    return () => {
      active = false;
    };
  }, []);
  return db;
};
