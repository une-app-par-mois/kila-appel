// Nettoyage des dossiers temporaires au démarrage de l'appli (ticket 014c ; revues de sécurité du
// 014b et du 014e) : après un arrêt brutal pendant un partage ou une restauration, des copies en
// clair resteraient dans le cache (`sauvegardes/`, `restauration/`, `DocumentPicker/`) ou, sur
// iOS, dans `tmp/<identifiant>-Inbox/`. Une fois par processus, sous le verrou commun : jamais
// pendant une opération en cours, qui efface elle-même ses copies.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { expoPicker, expoStorage } from '@/data/expoFiles';
import { log } from '@/data/log';
import { fileLock } from '@/hooks/fileLock';

let started = false;

/** Lance `clear` ; une erreur immédiate devient un refus, comme une erreur plus tardive. */
const attempt = (clear: () => Promise<void>) => Promise.resolve().then(clear);

/** Vide les dossiers temporaires ; un échec est écrit (code seul) et ne bloque rien. */
export const cleanupAtStartup = async (): Promise<void> => {
  if (started) return;
  started = true;
  if (!fileLock.acquire('cleanup')) return;
  try {
    const results = await Promise.allSettled([
      attempt(() => expoStorage('sauvegardes').clear()),
      attempt(() => expoStorage('restauration').clear()),
      attempt(() => expoPicker(Platform.OS).clearPicked()),
    ]);
    if (results.some((result) => result.status === 'rejected')) log('STARTUP_CLEANUP_FAILED');
  } finally {
    fileLock.release('cleanup');
  }
};

/** Tests seulement : permet un nouveau nettoyage. */
export const resetStartupCleanupForTests = (): void => {
  started = false;
};

/** Layout racine : nettoyage au premier montage. */
export const useStartupCleanup = (): void => {
  useEffect(() => {
    void cleanupAtStartup();
  }, []);
};
