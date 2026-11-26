// Membres et inscriptions pour les écrans (EX-03, EX-04, CONV-10). Même contrat que useGroups.
// La date du jour est passée par l'écran (CONV-11) : elle décide quelles inscriptions sont en cours.
import { useCallback, useMemo } from 'react';
import { enrollmentsRepo, type MemberEnrollment } from '@/data/enrollmentsRepo';
import { DataError } from '@/data/errors';
import { log } from '@/data/log';
import {
  filterByQuery,
  type Member,
  type MemberDeletionImpact,
  type MemberFilter,
  type MemberListItem,
  membersRepo,
} from '@/data/membersRepo';
import type { MemberInput } from '@/domain/validation';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';

const useRepos = () => {
  const db = useDatabase();
  return useMemo(
    () => (db ? { members: membersRepo(db), enrollments: enrollmentsRepo(db) } : null),
    [db],
  );
};
type Repos = NonNullable<ReturnType<typeof useRepos>>;

/** Exécute une modification, puis prévient chaque écran ouvert. */
const useChange = (repos: Repos | null) =>
  useCallback(
    async <T>(action: (r: Repos) => Promise<T>): Promise<T> => {
      if (!repos) throw new DataError('DB_NOT_READY');
      const result = await action(repos);
      notifyDataChanged();
      return result;
    },
    [repos],
  );

/** Membres filtrés ; `null` tant que rien n'est chargé. La recherche filtre en mémoire. */
export const useMembers = ({
  today,
  archived = false,
  groupId = null,
  query = '',
}: MemberFilter) => {
  const repos = useRepos();
  const load = useMemo(
    () => (repos ? () => repos.members.list({ today, archived, groupId }) : null),
    [repos, today, archived, groupId],
  );
  const { value, loadFailed } = useLoaded<MemberListItem[]>(load, 'MEMBERS_LOAD_FAILED');
  const members = useMemo(() => value && filterByQuery(value, query), [value, query]);
  const change = useChange(repos);

  /** Crée un membre (inscrit au groupe choisi à `today`) et rend son identifiant. */
  const create = useCallback(
    (input: MemberInput, groupId: number | null = null) =>
      change((r) => r.members.create(input, { groupId, today })),
    [change, today],
  );

  return { members, loadFailed, create };
};

/** Création seule, sans lire la liste (écran Nouveau membre). */
export const useMemberCreation = (today: string) => {
  const change = useChange(useRepos());
  return useCallback(
    (input: MemberInput, groupId: number | null = null) =>
      change((r) => r.members.create(input, { groupId, today })),
    [change, today],
  );
};

/** Un membre, ses groupes en cours et ses actions (fiche). */
export const useMember = (id: number, today: string) => {
  const repos = useRepos();
  const load = useMemo(
    () =>
      repos
        ? async () => {
            const member = await repos.members.get(id);
            return member && { member, groups: await repos.enrollments.listByMember(id, today) };
          }
        : null,
    [repos, id, today],
  );
  const { value, loaded, loadFailed } = useLoaded<{
    member: Member;
    groups: MemberEnrollment[];
  } | null>(load, 'MEMBER_LOAD_FAILED', { memberId: id });
  const change = useChange(repos);

  const update = useCallback(
    (input: MemberInput) => change((r) => r.members.update(id, input, today)),
    [change, id, today],
  );
  /** En quittant la fiche : aucun écran pour afficher l'échec, qui va au journal (CONV-15). */
  const updateOnLeave = useCallback(
    (input: MemberInput) => {
      update(input).catch(() => log('MEMBER_SAVE_ON_LEAVE_FAILED', { memberId: id }));
    },
    [update, id],
  );
  const archive = useCallback(
    () => change((r) => r.members.archive(id, today)),
    [change, id, today],
  );
  const unarchive = useCallback(() => change((r) => r.members.unarchive(id)), [change, id]);
  const remove = useCallback(() => change((r) => r.members.remove(id)), [change, id]);
  const deletionImpact = useCallback(async (): Promise<MemberDeletionImpact> => {
    if (!repos) throw new DataError('DB_NOT_READY');
    return repos.members.deletionImpact(id);
  }, [repos, id]);

  return {
    member: value?.member ?? null,
    groups: value?.groups ?? [],
    /** Lu au moins une fois : un `member` nul veut alors dire introuvable. */
    loaded,
    loadFailed,
    update,
    updateOnLeave,
    archive,
    unarchive,
    remove,
    deletionImpact,
  };
};

/** Inscriptions en cours d'un groupe, membres qu'on peut y inscrire, et actions (EX-04). */
export const useEnrollments = (groupId: number, today: string) => {
  const repos = useRepos();
  const load = useMemo(
    () =>
      repos
        ? async () => ({
            enrollments: await repos.enrollments.listByGroup(groupId, today),
            candidates: await repos.enrollments.candidates(groupId, today),
          })
        : null,
    [repos, groupId, today],
  );
  const { value, loadFailed } = useLoaded(load, 'ENROLLMENTS_LOAD_FAILED', { groupId });
  const change = useChange(repos);

  const enroll = useCallback(
    (memberIds: number[], startDate: string) =>
      change((r) => r.enrollments.enroll(groupId, memberIds, startDate)),
    [change, groupId],
  );
  const withdraw = useCallback(
    (enrollmentId: number, endDate: string) =>
      change((r) => r.enrollments.withdraw(enrollmentId, endDate)),
    [change],
  );

  return {
    enrollments: value?.enrollments ?? null,
    candidates: value?.candidates ?? null,
    loadFailed,
    enroll,
    withdraw,
  };
};
