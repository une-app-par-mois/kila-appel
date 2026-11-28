// Copies en clair laissées dans le cache (SEC-10) : `sauvegardes/`, `restauration/`, `exports/`
// (CSV et PDF, ticket 033), `Print/` (PDF d'expo-print, ticket 040a, SEC-08), `DocumentPicker/`
// et, sur iOS, `tmp/<identifiant>-Inbox/`. Vidées au démarrage (ticket 014c, arrêt brutal compris)
// et juste après Tout effacer (ticket 015f), toujours sous le verrou commun pris par l'appelant.
import { Platform } from 'react-native';
import { clearPrint } from '@/data/expoExports';
import { expoPicker, expoStorage } from '@/data/expoFiles';

/** Lance `clear` ; une erreur immédiate devient un refus, comme une erreur plus tardive. */
const attempt = (clear: () => Promise<void>) => Promise.resolve().then(clear);

/**
 * Vide les cinq dossiers ensemble : un échec n'empêche pas les autres. Faux si l'un d'eux a
 * échoué ; ne rejette jamais. L'appelant journalise son propre code.
 */
export const clearCacheCopies = async (): Promise<boolean> => {
  const results = await Promise.allSettled([
    attempt(() => expoStorage('sauvegardes').clear()),
    attempt(() => expoStorage('restauration').clear()),
    attempt(() => expoStorage('exports').clear()),
    attempt(() => clearPrint()),
    attempt(() => expoPicker(Platform.OS).clearPicked()),
  ]);
  return results.every((result) => result.status === 'fulfilled');
};
