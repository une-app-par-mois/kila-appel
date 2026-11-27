// Appel pour les écrans (EX-09, EX-15, CONV-10) : liste de l'appel, séance proposée,
// enregistrement. Même contrat que les autres hooks de données.
import { useCallback, useMemo } from 'react';
import { enrollmentsRepo, type GroupEnrollment } from '@/data/enrollmentsRepo';
import { DataError } from '@/data/errors';
import { groupsRepo } from '@/data/groupsRepo';
import { seasonsRepo } from '@/data/seasonsRepo';
import { type RollCall, sessionsRepo } from '@/data/sessionsRepo';
import { type Slot, slotsRepo } from '@/data/slotsRepo';
import { toIsoDate } from '@/domain/formats';
import { type LocalNow, proposedSession, type WeeklySlot } from '@/domain/occurrences';
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
  const { value, loaded, loadFailed } = useLoaded(load, 'PROPOSED_SESSION_FAILED', {});
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
