// Groupes d'une saison pour les écrans (EX-02, CONV-10). Même contrat que useSeasons ;
// au changement de saison, la liste est vidée et une réponse tardive de l'ancienne ignorée.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataError } from '@/data/errors';
import { type Group, type GroupDeletionImpact, groupsRepo } from '@/data/groupsRepo';
import { log } from '@/data/log';
import { useDatabase } from '@/hooks/useDatabase';

type Repo = ReturnType<typeof groupsRepo>;

/** Groupes courants (ou archivés) de la saison ; `null` tant que rien n'est chargé. */
export const useGroups = (seasonId: number | null, { archived = false } = {}) => {
  const db = useDatabase();
  const repo = useMemo(() => (db ? groupsRepo(db) : null), [db]);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const lastLoad = useRef(0);

  const ready = useCallback(() => {
    if (!repo || seasonId === null) throw new DataError('DB_NOT_READY');
    return { r: repo, seasonId };
  }, [repo, seasonId]);

  /** Ne lève jamais : un échec est signalé par `loadFailed`. */
  const reload = useCallback(async () => {
    const load = ++lastLoad.current;
    if (!repo || seasonId === null) return;
    try {
      const list = await repo.listBySeason(seasonId, { archived });
      if (load !== lastLoad.current) return;
      setGroups(list);
      setLoadFailed(false);
    } catch {
      log('GROUPS_LOAD_FAILED', { seasonId });
      if (load === lastLoad.current) setLoadFailed(true);
    }
  }, [repo, seasonId, archived]);

  useEffect(() => {
    setGroups(null);
    setLoadFailed(false);
    void reload();
  }, [reload]);

  const change = useCallback(
    async (action: (r: Repo, seasonId: number) => Promise<unknown>) => {
      const { r, seasonId: id } = ready();
      await action(r, id);
      await reload();
    },
    [ready, reload],
  );

  const create = useCallback((name: string) => change((r, id) => r.create(id, name)), [change]);
  const rename = useCallback(
    (id: number, name: string) => change((r) => r.rename(id, name)),
    [change],
  );
  const archive = useCallback(
    (id: number, today: string) => change((r) => r.archive(id, today)),
    [change],
  );
  const unarchive = useCallback((id: number) => change((r) => r.unarchive(id)), [change]);
  const remove = useCallback((id: number) => change((r) => r.remove(id)), [change]);
  const deletionImpact = useCallback(
    (id: number): Promise<GroupDeletionImpact> => ready().r.deletionImpact(id),
    [ready],
  );

  return { groups, loadFailed, create, rename, archive, unarchive, remove, deletionImpact };
};
