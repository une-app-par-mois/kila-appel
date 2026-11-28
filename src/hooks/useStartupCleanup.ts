// Nettoyage des dossiers temporaires au démarrage de l'appli (ticket 014c ; revues de sécurité du
// 014b et du 014e) : après un arrêt brutal pendant un partage ou une restauration, des copies en
// clair resteraient dans le cache (`sauvegardes/`, `restauration/`, `exports/`, `Print/` (PDF
// d'expo-print, 040a), `DocumentPicker/`) ou, sur iOS, dans `tmp/<identifiant>-Inbox/`. Une fois par processus, sous le verrou commun :
// jamais pendant une opération en cours, qui efface elle-même ses copies.
import { useEffect, useState } from 'react';
import { log } from '@/data/log';
import { clearCacheCopies } from '@/hooks/cacheCopies';
import { fileLock } from '@/hooks/fileLock';

let running: Promise<void> | null = null;

/** Vide les dossiers temporaires ; un échec est écrit (code seul) et ne bloque rien. */
const cleanupOnce = async (): Promise<void> => {
  if (!fileLock.acquire('cleanup')) return;
  try {
    if (!(await clearCacheCopies())) log('STARTUP_CLEANUP_FAILED');
  } finally {
    fileLock.release('cleanup');
  }
};

/**
 * Nettoyage, une fois par processus : sauté pour de bon si le verrou est pris. Rend la même
 * promesse à chaque appel ; elle ne rejette jamais.
 */
export const cleanupAtStartup = (): Promise<void> => {
  running ??= cleanupOnce().catch(() => log('STARTUP_CLEANUP_FAILED'));
  return running;
};

/** Tests seulement : permet un nouveau nettoyage. */
export const resetStartupCleanupForTests = (): void => {
  running = null;
};

/**
 * Layout racine : nettoyage au premier montage. Rend vrai une fois fini (réussi, en échec ou
 * sauté) : la pile n'est montée qu'ensuite, aucun écran Export ou Restauration ne s'ouvre pendant.
 */
export const useStartupCleanup = (): boolean => {
  const [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    void cleanupAtStartup().then(() => {
      if (active) setDone(true);
    });
    return () => {
      active = false;
    };
  }, []);
  return done;
};
