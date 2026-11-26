// Contacts d'urgence pour les écrans (EX-05, EX-06, CONV-10). Même contrat que useMembers.
import { useCallback, useMemo } from 'react';
import { contactsRepo } from '@/data/contactsRepo';
import { DataError } from '@/data/errors';
import type { ContactInput } from '@/domain/validation';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';

const useRepo = () => {
  const db = useDatabase();
  return useMemo(() => (db ? contactsRepo(db) : null), [db]);
};
type Repo = NonNullable<ReturnType<typeof useRepo>>;

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

/** Contacts d'un membre dans l'ordre, et leurs actions (fiche). */
export const useMemberContacts = (memberId: number) => {
  const repo = useRepo();
  const load = useMemo(() => (repo ? () => repo.listByMember(memberId) : null), [repo, memberId]);
  const { value, loadFailed } = useLoaded(load, 'CONTACTS_LOAD_FAILED', { memberId });
  const change = useChange(repo);
  const reorder = useCallback(
    (ids: number[]) => change((r) => r.reorder(memberId, ids)),
    [change, memberId],
  );
  return { contacts: value ?? null, loadFailed, reorder };
};

/** Un contact (`null` : nouveau) et ses actions (formulaire). */
export const useContact = (id: number | null) => {
  const repo = useRepo();
  const load = useMemo(() => (repo && id !== null ? () => repo.get(id) : null), [repo, id]);
  const { value, loaded, loadFailed } = useLoaded(load, 'CONTACT_LOAD_FAILED', {
    contactId: id ?? 0,
  });
  const change = useChange(repo);
  const create = useCallback(
    (memberId: number, input: ContactInput) => change((r) => r.create(memberId, input)),
    [change],
  );
  const update = useCallback(
    (input: ContactInput) => change((r) => r.update(id ?? 0, input)),
    [change, id],
  );
  const remove = useCallback(() => change((r) => r.remove(id ?? 0)), [change, id]);
  return { contact: value ?? null, loaded, loadFailed, create, update, remove };
};

/** EX-06 : membres courants trouvés et leurs contacts ; `[]` pour une saisie vide. */
export const useContactSearch = (query: string, today: string) => {
  const repo = useRepo();
  const load = useMemo(() => (repo ? () => repo.search(query, today) : null), [repo, query, today]);
  const { value, loadFailed } = useLoaded(load, 'CONTACT_SEARCH_FAILED', {});
  return { results: value ?? null, loadFailed };
};
