// Appel pour les écrans (EX-09, EX-15, CONV-10) : liste de l'appel, séance proposée,
// enregistrement. Même contrat que les autres hooks de données.
import { useCallback, useMemo } from 'react';
import type { Db } from '@/data/db';
import { type DraftTarget, draftsRepo, type RollCallDraft } from '@/data/draftsRepo';
import { enrollmentsRepo, type GroupEnrollment } from '@/data/enrollmentsRepo';
import { DataError } from '@/data/errors';
import { groupsRepo } from '@/data/groupsRepo';
import { seasonsRepo } from '@/data/seasonsRepo';
import { type RollCall, sessionsRepo } from '@/data/sessionsRepo';
import { type Slot, slotsRepo } from '@/data/slotsRepo';
import { toIsoDate, toLocalTime } from '@/domain/formats';
import {
  type LocalNow,
  missingRollCalls,
  type Occurrence,
  proposedSession,
  type WeeklySlot,
} from '@/domain/occurrences';
import type { AttendanceStatus } from '@/domain/validation';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';

/** Séance proposée : créneau, son groupe actif, date, heure ; `recorded` si son appel est fait. */
export type ProposedSession = {
  slot: Slot;
  group: { id: number; name: string };
  date: string;
  startTime: string;
  recorded: boolean;
};

/** EX-09 : membres inscrits au groupe à la date de la séance, triés par nom. */
export const useRoster = (groupId: number | null, date: string) => {
  const db = useDatabase();
  const load = useMemo(
    () => (db && groupId !== null ? () => enrollmentsRepo(db).listByGroup(groupId, date) : null),
    [db, groupId, date],
  );
  const {
    value: roster,
    loaded,
    loadFailed,
  } = useLoaded<GroupEnrollment[]>(load, 'ROSTER_LOAD_FAILED', { groupId: groupId ?? 0 });
  return { roster, loaded, loadFailed };
};

/** EX-09 : séance du créneau en cours, sinon la plus proche (ticket 005) ; `null` s'il n'y en a pas. */
export const useProposedSession = (now: LocalNow) => {
  const db = useDatabase();
  const { date, time } = now;
  const load = useMemo(
    () =>
      db
        ? async (): Promise<ProposedSession | null> => {
            const season = await seasonsRepo(db).getActive();
            if (!season) return null;
            // Un créneau sans groupe actif n'est pas proposé : l'enregistrement le refuserait.
            const active = new Set((await groupsRepo(db).listBySeason(season.id)).map((g) => g.id));
            const slots = (await slotsRepo(db).listBySeason(season.id)).filter((s) =>
              s.groups.some((g) => active.has(g.id)),
            );
            const found = proposedSession(slots as WeeklySlot[], season, { date, time });
            const slot = slots.find((s) => s.id === found?.slotId);
            const group = slot?.groups.find((g) => active.has(g.id));
            if (!found || !slot || !group) return null;
            // RM-05 : l'accueil dit que l'appel est fait plutôt que d'ouvrir un appel refusé.
            const recorded = await sessionsRepo(db, date).isRecorded(slot.id, found.date);
            return { slot, group, date: found.date, startTime: found.startTime, recorded };
          }
        : null,
    [db, date, time],
  );
  // L'heure change chaque minute : l'accueil garde la séance affichée pendant la relecture.
  const { value, loaded, loadFailed } = useLoaded(load, 'PROPOSED_SESSION_FAILED', {}, true);
  return { session: value ?? null, loaded, loadFailed };
};

/** EX-15 : enregistrer un appel ; savoir si une séance de créneau l'est déjà (RM-05). */
export const useRollCall = () => {
  const db = useDatabase();
  // Le jour est lu à chaque appel : l'écran peut rester ouvert après minuit.
  const repo = useCallback(() => (db ? sessionsRepo(db, toIsoDate(new Date())) : null), [db]);
  const record = useCallback(
    async (call: RollCall): Promise<number> => {
      const sessions = repo();
      if (!sessions) throw new DataError('DB_NOT_READY');
      const id = await sessions.record(call);
      notifyDataChanged();
      return id;
    },
    [repo],
  );
  const isRecorded = useCallback(
    async (slotId: number, date: string): Promise<boolean> => {
      const sessions = repo();
      if (!sessions) throw new DataError('DB_NOT_READY');
      return sessions.isRecorded(slotId, date);
    },
    [repo],
  );
  const isGroupRecorded = useCallback(
    async (groupId: number, date: string): Promise<boolean> => {
      const sessions = repo();
      if (!sessions) throw new DataError('DB_NOT_READY');
      return sessions.isGroupRecorded(groupId, date);
    },
    [repo],
  );
  return { record, isRecorded, isGroupRecorded };
};

/** Adresse de l'écran d'appel d'un brouillon (reprise depuis l'accueil ou un autre appel). */
export const draftRoute = (draft: RollCallDraft) => ({
  pathname: '/appel' as const,
  params:
    draft.slotId !== null
      ? { creneau: draft.slotId, date: draft.date }
      : { groupe: draft.groupId ?? 0, date: draft.date },
});

/** Instant local pour `updated_at` du brouillon (AAAA-MM-JJTHH:MM). */
const localNow = () => {
  const now = new Date();
  return `${toIsoDate(now)}T${toLocalTime(now)}`;
};

/**
 * EX-14 : brouillon d'appel. Les écritures de l'appel ne préviennent pas les autres écrans (un
 * appui ne recharge pas tout) : l'écran d'appel le fait en se fermant ; l'abandon tout de suite.
 */
export const useDraft = () => {
  const db = useDatabase();
  const load = useMemo(() => (db ? () => draftsRepo(db).get() : null), [db]);
  const { value: draft, loaded, loadFailed } = useLoaded(load, 'DRAFT_LOAD_FAILED', {});
  const repo = useCallback(() => {
    if (!db) throw new DataError('DB_NOT_READY');
    return draftsRepo(db);
  }, [db]);
  const setStatus = useCallback(
    (target: DraftTarget, memberId: number, status: AttendanceStatus) =>
      repo().setStatus(target, memberId, status, localNow()),
    [repo],
  );
  const setComment = useCallback(
    (target: DraftTarget, comment: string) => repo().setComment(target, comment, localNow()),
    [repo],
  );
  const discard = useCallback(async () => {
    await repo().discard();
    notifyDataChanged();
  }, [repo]);
  return { draft, loaded, loadFailed, setStatus, setComment, discard };
};

/** Appel manquant : séance passée d'un créneau, son groupe actif (EX-17). */
export type MissingRollCall = Occurrence & { groupId: number; groupName: string };

/**
 * EX-17 : séances finies sans appel de la saison active, les plus récentes d'abord ; créneaux sans
 * groupe actif exclus, comme la séance proposée (EX-09). L'accueil retire celle déjà sous
 * « Maintenant » (revue du ticket 012) ; l'Historique la garde (décision du 2026-11-27).
 */
export const loadMissingRollCalls = async (
  db: Db,
  { date, time }: LocalNow,
  { keepShown = false } = {},
): Promise<MissingRollCall[]> => {
  const season = await seasonsRepo(db).getActive();
  if (!season) return [];
  const active = new Set((await groupsRepo(db).listBySeason(season.id)).map((g) => g.id));
  const slots = await slotsRepo(db).listBySeason(season.id);
  const groupOf = new Map(
    slots.flatMap((s) => {
      const g = s.groups.find((x) => active.has(x.id));
      return g ? [[s.id, g] as const] : [];
    }),
  );
  const recorded = await sessionsRepo(db, date).slotSessions(season.id);
  const usable = slots.filter((s) => groupOf.has(s.id)) as WeeklySlot[];
  const shown = keepShown ? null : proposedSession(usable, season, { date, time });
  return missingRollCalls(usable, season, recorded, { date, time })
    .filter((o) => !(o.slotId === shown?.slotId && o.date === shown.date))
    .reverse()
    .map((o) => {
      const group = groupOf.get(o.slotId);
      return { ...o, groupId: group?.id ?? 0, groupName: group?.name ?? '' };
    });
};

/** EX-17 : appels manquants de l'accueil. */
export const useMissingRollCalls = (now: LocalNow) => {
  const db = useDatabase();
  const { date, time } = now;
  const load = useMemo(
    () => (db ? () => loadMissingRollCalls(db, { date, time }) : null),
    [db, date, time],
  );
  const { value, loaded, loadFailed } = useLoaded(load, 'MISSING_CALLS_FAILED', {}, true);
  return { missing: value ?? [], loaded, loadFailed };
};

/**
 * « Nouvel appel » (onglet central, décision du 2026-11-27) : l'appel en cours (EX-14), sinon la
 * séance proposée (EX-09), sinon l'appel sans créneau (EX-39). `null` tant que ce n'est pas
 * connu. Un appel en cours qui ne peut plus être repris mène à l'accueil, où il s'abandonne.
 */
export const useNewRollCallRoute = (now: LocalNow) => {
  const { draft, loaded: draftLoaded } = useDraft();
  const { session, loaded } = useProposedSession(now);
  if (!draftLoaded || !loaded) return null;
  if (draft) return draft.resumable ? draftRoute(draft) : ('/' as const);
  if (session && !session.recorded)
    return {
      pathname: '/appel' as const,
      params: { creneau: session.slot.id, date: session.date },
    };
  return '/appel-libre' as const;
};
