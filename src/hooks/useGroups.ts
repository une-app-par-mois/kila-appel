// Groupes d'une saison pour les écrans (EX-02, CONV-10). Recharge après chaque modification.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Group, type GroupDeletionImpact, groupsRepo } from '@/data/groupsRepo';
import { useDatabase } from '@/hooks/useDatabase';
import { DB_NOT_READY } from '@/hooks/useSeasons';

/** Groupes courants (ou archivés) de la saison ; `null` tant que rien n'est chargé. */
export const useGroups = (seasonId: number | null, { archived = false } = {}) => {
  const db = useDatabase();
  const repo = useMemo(() => (db ? groupsRepo(db) : null), [db]);
  const [groups, setGroups] = useState<Group[] | null>(null);

  const ready = useCallback(() => {
    if (!repo || seasonId === null) throw new Error(DB_NOT_READY);
    return { r: repo, seasonId };
  }, [repo, seasonId]);

  const reload = useCallback(async () => {
    const { r, seasonId: id } = ready();
    setGroups(await r.listBySeason(id, { archived }));
  }, [ready, archived]);

  useEffect(() => {
    if (repo && seasonId !== null) void reload();
  }, [repo, seasonId, reload]);

  const change = useCallback(
    async (action: (r: ReturnType<typeof groupsRepo>, seasonId: number) => Promise<unknown>) => {
      const { r, seasonId: id } = ready();
      await action(r, id);
      await reload();
    },
    [ready, reload],
  );

  return {
    groups,
    create: (name: string) => change((r, id) => r.create(id, name)),
    rename: (id: number, name: string) => change((r) => r.rename(id, name)),
    archive: (id: number, today: string) => change((r) => r.archive(id, today)),
    unarchive: (id: number) => change((r) => r.unarchive(id)),
    remove: (id: number) => change((r) => r.remove(id)),
    deletionImpact: (id: number): Promise<GroupDeletionImpact> => ready().r.deletionImpact(id),
  };
};
