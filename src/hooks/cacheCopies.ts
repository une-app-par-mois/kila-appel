// Copies en clair laissées dans le cache (SEC-10) : `sauvegardes/`, `restauration/`,
// `DocumentPicker/` et, sur iOS, `tmp/<identifiant>-Inbox/`. Vidées au démarrage (ticket 014c) et
// juste après Tout effacer (ticket 015f), toujours sous le verrou commun pris par l'appelant.
import { Platform } from 'react-native';
import { expoPicker, expoStorage } from '@/data/expoFiles';

/** Lance `clear` ; une erreur immédiate devient un refus, comme une erreur plus tardive. */
const attempt = (clear: () => Promise<void>) => Promise.resolve().then(clear);

/**
 * Vide les trois dossiers ensemble : un échec n'empêche pas les autres. Faux si l'un d'eux a
 * échoué ; ne rejette jamais. L'appelant journalise son propre code.
 */
export const clearCacheCopies = async (): Promise<boolean> => {
  const results = await Promise.allSettled([
    attempt(() => expoStorage('sauvegardes').clear()),
    attempt(() => expoStorage('restauration').clear()),
    attempt(() => expoPicker(Platform.OS).clearPicked()),
  ]);
  return results.every((result) => result.status === 'fulfilled');
};
