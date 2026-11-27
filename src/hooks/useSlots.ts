// Créneaux pour les écrans (EX-07, CONV-10). Même contrat que useGroups : une action qui échoue
// est relayée à l'écran ; tout écran ouvert recharge après une modification (dataChanged).
import { useCallback, useMemo } from 'react';
import { DataError } from '@/data/errors';
import { type Slot, slotsRepo } from '@/data/slotsRepo';
import type { SlotInput } from '@/domain/validation';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';

type Repo = ReturnType<typeof slotsRepo>;

const useRepo = () => {
  const db = useDatabase();
  return useMemo(() => (db ? slotsRepo(db) : null), [db]);
};

const useChange = (repo: Repo | null) =>
  useCallback(
    async <T>(action: (r: Repo) => Promise<T>): Promise<T> => {
      if (!repo) throw new DataError('DB_NOT_READY');
      const result = await action(repo);
      notifyDataChanged();
      return result;
    },
    [repo],
  );

/** Créneaux de la saison (`null` : aucune saison active, ou pas encore chargés). */
export const useSlots = (seasonId: number | null) => {
  const repo = useRepo();
  const load = useMemo(
    () => (repo && seasonId !== null ? () => repo.listBySeason(seasonId) : null),
    [repo, seasonId],
  );
  const { value: slots, loadFailed } = useLoaded<Slot[]>(load, 'SLOTS_LOAD_FAILED', {
    seasonId: seasonId ?? 0,
  });
  const change = useChange(seasonId === null ? null : repo);
  /** Crée un créneau dans la saison et rend son identifiant. */
  const create = useCallback(
    (input: SlotInput, today: string) => change((r) => r.create(seasonId ?? 0, input, today)),
    [change, seasonId],
  );
  return { slots, loadFailed, create };
};

/** Un créneau et ses actions (modification). */
export const useSlot = (id: number) => {
  const repo = useRepo();
  const load = useMemo(() => (repo ? () => repo.get(id) : null), [repo, id]);
  const {
    value: slot,
    loaded,
    loadFailed,
  } = useLoaded<Slot | null>(load, 'SLOT_LOAD_FAILED', {
    slotId: id,
  });
  const change = useChange(repo);
  const update = useCallback(
    (input: SlotInput, today: string) => change((r) => r.update(id, input, today)),
    [change, id],
  );
  const remove = useCallback(() => change((r) => r.remove(id)), [change, id]);
  const deletionImpact = useCallback(async () => {
    if (!repo) throw new DataError('DB_NOT_READY');
    return repo.deletionImpact(id);
  }, [repo, id]);
  return {
    slot,
    /** Lu au moins une fois : un `slot` nul veut alors dire introuvable. */
    loaded,
    loadFailed,
    update,
    remove,
    deletionImpact,
  };
};
