// Heure locale à la minute, partagée par l'accueil et la barre d'onglets (ticket 012) : une seule
// horloge, pour que « Nouvel appel » ouvre la séance affichée. Relue toutes les 15 s et au retour
// au premier plan (le minuteur s'arrête quand l'appli est en arrière-plan).
import { useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { toIsoDate, toLocalTime } from '@/domain/formats';
import type { LocalNow } from '@/domain/occurrences';

const listeners = new Set<() => void>();
let stop: (() => void) | null = null;

const notify = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!stop) {
    const timer = setInterval(notify, 15_000);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') notify();
    });
    stop = () => {
      clearInterval(timer);
      appState.remove();
    };
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && stop) {
      stop();
      stop = null;
    }
  };
};

/** « AAAA-MM-JJTHH:MM » : la même chaîne tant que la minute ne change pas (pas de rendu inutile). */
const snapshot = () => {
  const now = new Date();
  return `${toIsoDate(now)}T${toLocalTime(now)}`;
};

export const useLocalNow = (): LocalNow => {
  const stamp = useSyncExternalStore(subscribe, snapshot);
  return useMemo(() => ({ date: stamp.slice(0, 10), time: stamp.slice(11) }), [stamp]);
};
