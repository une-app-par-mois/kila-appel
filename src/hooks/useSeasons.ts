// Saisons pour les écrans (EX-01) : seul accès des écrans aux données (CONV-10).
// Chaque modification recharge la liste ; une erreur est relayée à l'écran, qui l'affiche.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Season, type SeasonDeletionImpact, seasonsRepo } from '@/data/seasonsRepo';
import type { SeasonInput } from '@/domain/validation';
import { useDatabase } from '@/hooks/useDatabase';

export const DB_NOT_READY = 'Base pas encore ouverte';

export const useSeasons = () => {
  const db = useDatabase();
  const repo = useMemo(() => (db ? seasonsRepo(db) : null), [db]);
  const [seasons, setSeasons] = useState<Season[] | null>(null);

  const ready = useCallback(() => {
    if (!repo) throw new Error(DB_NOT_READY);
    return repo;
  }, [repo]);

  const reload = useCallback(async () => setSeasons(await ready().list()), [ready]);

  useEffect(() => {
    if (repo) void reload();
  }, [repo, reload]);

  const change = useCallback(
    async (action: (r: ReturnType<typeof seasonsRepo>) => Promise<unknown>) => {
      await action(ready());
      await reload();
    },
    [ready, reload],
  );

  return {
    seasons,
    create: (input: SeasonInput) => change((r) => r.create(input)),
    update: (id: number, input: SeasonInput) => change((r) => r.update(id, input)),
    activate: (id: number) => change((r) => r.activate(id)),
    remove: (id: number) => change((r) => r.remove(id)),
    deletionImpact: (id: number): Promise<SeasonDeletionImpact> => ready().deletionImpact(id),
  };
};
