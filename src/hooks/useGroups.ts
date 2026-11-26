// Groupes pour les écrans (EX-02, CONV-10). Même contrat que useSeasons : une action qui échoue
// est relayée à l'écran ; tout écran ouvert recharge après une modification (dataChanged) ;
// au changement de saison, la liste est vidée et une réponse tardive de l'ancienne ignorée.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataError } from '@/data/errors';
import {
  type Group,
  type GroupDeletionImpact,
  type GroupDetail,
  groupsRepo,
} from '@/data/groupsRepo';
import { log } from '@/data/log';
import { notifyDataChanged, onDataChanged } from '@/hooks/dataChanged';
import { useDatabase } from '@/hooks/useDatabase';

type Repo = ReturnType<typeof groupsRepo>;

const useRepo = () => {
  const db = useDatabase();
  return useMemo(() => (db ? groupsRepo(db) : null), [db]);
};

/** Lit une valeur, garde seulement la dernière réponse, recharge à chaque modification. */
const useLoaded = <T>(load: (() => Promise<T>) | null, failureCode: string, details = {}) => {
  const [value, setValue] = useState<T | null>(null);
  // Vrai dès la première lecture réussie : distingue « en cours » de « introuvable ».
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const lastLoad = useRef(0);
  const detailsRef = useRef(details);
  detailsRef.current = details;

  const reload = useCallback(async () => {
    const current = ++lastLoad.current;
    if (!load) return;
    try {
      const result = await load();
      if (current !== lastLoad.current) return;
      setValue(result);
      setLoaded(true);
      setLoadFailed(false);
    } catch {
      log(failureCode, detailsRef.current);
      if (current === lastLoad.current) setLoadFailed(true);
    }
  }, [load, failureCode]);

  useEffect(() => {
    setValue(null);
    setLoaded(false);
    setLoadFailed(false);
    void reload();
    return onDataChanged(() => void reload());
  }, [reload]);

  return { value, loaded, loadFailed };
};

/** Groupes courants (ou archivés) de la saison ; `null` tant que rien n'est chargé. */
export const useGroups = (seasonId: number | null, { archived = false } = {}) => {
  const repo = useRepo();
  const load = useMemo(
    () => (repo && seasonId !== null ? () => repo.listBySeason(seasonId, { archived }) : null),
    [repo, seasonId, archived],
  );
  const { value: groups, loadFailed } = useLoaded<Group[]>(load, 'GROUPS_LOAD_FAILED', {
    seasonId: seasonId ?? 0,
  });

  /**
   * Crée un groupe dans la saison et rend son identifiant. Les rechargements partent sans être
   * attendus : `groups` peut ne pas contenir le nouveau groupe juste après (l'écran de création
   * navigue vers la fiche, qui le lit elle-même).
   */
  const create = useCallback(
    async (name: string): Promise<number> => {
      if (!repo || seasonId === null) throw new DataError('DB_NOT_READY');
      const id = await repo.create(seasonId, name);
      notifyDataChanged();
      return id;
    },
    [repo, seasonId],
  );

  return { groups, loadFailed, create };
};

/** Un groupe et ses actions (fiche, modification). */
export const useGroup = (id: number) => {
  const repo = useRepo();
  const load = useMemo(() => (repo ? () => repo.get(id) : null), [repo, id]);
  const {
    value: group,
    loaded,
    loadFailed,
  } = useLoaded<GroupDetail | null>(load, 'GROUP_LOAD_FAILED', {
    groupId: id,
  });

  const ready = useCallback((): Repo => {
    if (!repo) throw new DataError('DB_NOT_READY');
    return repo;
  }, [repo]);
  const change = useCallback(
    async (action: (r: Repo) => Promise<unknown>) => {
      await action(ready());
      notifyDataChanged();
    },
    [ready],
  );

  const rename = useCallback((name: string) => change((r) => r.rename(id, name)), [change, id]);
  const archive = useCallback((today: string) => change((r) => r.archive(id, today)), [change, id]);
  const unarchive = useCallback(() => change((r) => r.unarchive(id)), [change, id]);
  const remove = useCallback(() => change((r) => r.remove(id)), [change, id]);
  const deletionImpact = useCallback(
    (): Promise<GroupDeletionImpact> => ready().deletionImpact(id),
    [ready, id],
  );

  return {
    group,
    /** Lu au moins une fois : un `group` nul veut alors dire introuvable. */
    loaded,
    loadFailed,
    rename,
    archive,
    unarchive,
    remove,
    deletionImpact,
  };
};
