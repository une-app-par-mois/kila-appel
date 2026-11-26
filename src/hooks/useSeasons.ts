// Saisons pour les écrans (EX-01) : seul accès des écrans aux données (CONV-10).
// Une action qui échoue est relayée à l'écran ; un rechargement qui échoue après une action
// réussie ne la fait pas passer pour un échec : il met `loadFailed` à vrai et écrit un code.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataError } from '@/data/errors';
import { log } from '@/data/log';
import { type Season, type SeasonDeletionImpact, seasonsRepo } from '@/data/seasonsRepo';
import type { SeasonInput } from '@/domain/validation';
import { useDatabase } from '@/hooks/useDatabase';

type Repo = ReturnType<typeof seasonsRepo>;

// Chaque écran a son propre état ; une pile native garde les écrans précédents montés. Après
// une modification, tous les écrans ouverts rechargent (liste, Paramètres, formulaire).
const listeners = new Set<() => void>();
const notifyAll = () => {
  for (const listener of listeners) listener();
};

export const useSeasons = () => {
  const db = useDatabase();
  const repo = useMemo(() => (db ? seasonsRepo(db) : null), [db]);
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Seule la réponse du dernier chargement lancé est gardée.
  const lastLoad = useRef(0);

  const ready = useCallback((): Repo => {
    if (!repo) throw new DataError('DB_NOT_READY');
    return repo;
  }, [repo]);

  /** Ne lève jamais : un échec est signalé par `loadFailed`. */
  const reload = useCallback(async () => {
    if (!repo) return;
    const load = ++lastLoad.current;
    try {
      const list = await repo.list();
      if (load !== lastLoad.current) return;
      setSeasons(list);
      setLoadFailed(false);
    } catch {
      log('SEASONS_LOAD_FAILED');
      if (load === lastLoad.current) setLoadFailed(true);
    }
  }, [repo]);

  useEffect(() => {
    void reload();
    const listener = () => void reload();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [reload]);

  // Les rechargements ne lèvent jamais : une action réussie n'est pas présentée comme un échec.
  const change = useCallback(
    async (action: (r: Repo) => Promise<unknown>) => {
      await action(ready());
      notifyAll();
    },
    [ready],
  );

  const create = useCallback((input: SeasonInput) => change((r) => r.create(input)), [change]);
  const update = useCallback(
    (id: number, input: SeasonInput) => change((r) => r.update(id, input)),
    [change],
  );
  const activate = useCallback((id: number) => change((r) => r.activate(id)), [change]);
  const remove = useCallback((id: number) => change((r) => r.remove(id)), [change]);
  const deletionImpact = useCallback(
    (id: number): Promise<SeasonDeletionImpact> => ready().deletionImpact(id),
    [ready],
  );

  return { seasons, loadFailed, create, update, activate, remove, deletionImpact };
};
