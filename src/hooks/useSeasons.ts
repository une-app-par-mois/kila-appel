// Saisons pour les écrans (EX-01) : seul accès des écrans aux données (CONV-10).
// Une action qui échoue est relayée à l'écran ; un rechargement qui échoue après une action
// réussie ne la fait pas passer pour un échec : il met `loadFailed` à vrai et écrit un code.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataError } from '@/data/errors';
import { log } from '@/data/log';
import {
  type Season,
  type SeasonDeletionImpact,
  type SetupProgress,
  seasonsRepo,
} from '@/data/seasonsRepo';
import { firstSeason } from '@/domain/seasons';
import type { SeasonInput } from '@/domain/validation';
import { erasedCount, notifyDataChanged, onDataChanged, useErasedCount } from '@/hooks/dataChanged';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';

type Repo = ReturnType<typeof seasonsRepo>;

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
    return onDataChanged(() => void reload());
  }, [reload]);

  // Les rechargements ne lèvent jamais : une action réussie n'est pas présentée comme un échec.
  const change = useCallback(
    async (action: (r: Repo) => Promise<unknown>) => {
      await action(ready());
      notifyDataChanged();
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

/**
 * P1 (ticket 012b) : avancement de la mise en route. Sur une base vide, la première saison est
 * créée d'abord (`createFirst`) ; rien d'autre n'est enregistré. Un avancement lu avant Tout
 * effacer (ticket 015f) est ignoré : l'accueil n'affiche rien jusqu'à la relecture.
 */
export const useSetupProgress = (today: string) => {
  const db = useDatabase();
  // « créée automatiquement » (maquette) : seulement pour la saison créée pendant cette ouverture,
  // et tant qu'elle garde son nom (renommée à la main, elle s'affiche telle quelle).
  const createdName = useRef<string | null>(null);
  const load = useMemo(
    () =>
      db
        ? async (): Promise<{ progress: SetupProgress; anySeason: boolean; erased: number }> => {
            const erased = erasedCount();
            const repo = seasonsRepo(db);
            const first = firstSeason(today);
            if (await repo.createFirst(first)) {
              createdName.current = first.name;
              notifyDataChanged();
            }
            const progress = await repo.setupProgress(today);
            const anySeason = progress.season !== null || (await repo.list()).length > 0;
            return { progress, anySeason, erased };
          }
        : null,
    [db, today],
  );
  const { value: read, loaded, loadFailed } = useLoaded(load, 'SETUP_PROGRESS_FAILED', {}, true);
  const erased = useErasedCount();
  const value = read !== null && read.erased === erased ? read : null;
  const progress = value?.progress ?? null;
  return {
    progress,
    anySeason: value?.anySeason ?? true,
    created: progress?.season !== null && progress?.season?.name === createdName.current,
    loaded,
    loadFailed,
  };
};
