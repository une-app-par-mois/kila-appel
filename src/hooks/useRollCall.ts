// Appel pour les écrans (EX-09, EX-15, CONV-10) : liste de l'appel, séance proposée,
// enregistrement. Même contrat que les autres hooks de données.
import { useCallback, useMemo } from 'react';
import { enrollmentsRepo, type GroupEnrollment } from '@/data/enrollmentsRepo';
import { DataError } from '@/data/errors';
import { seasonsRepo } from '@/data/seasonsRepo';
import { type RollCall, sessionsRepo } from '@/data/sessionsRepo';
import { type Slot, slotsRepo } from '@/data/slotsRepo';
import { type LocalNow, proposedSession, type WeeklySlot } from '@/domain/occurrences';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useDatabase } from '@/hooks/useDatabase';
import { useLoaded } from '@/hooks/useLoaded';

/** Séance proposée : un créneau, une date et l'heure de début de cette séance. */
export type ProposedSession = { slot: Slot; date: string; startTime: string };

/** EX-09 : membres inscrits au groupe à la date de la séance, triés par nom. */
export const useRoster = (groupId: number | null, date: string) => {
  const db = useDatabase();
  const load = useMemo(
    () => (db && groupId !== null ? () => enrollmentsRepo(db).listByGroup(groupId, date) : null),
    [db, groupId, date],
  );
  const { value: roster, loadFailed } = useLoaded<GroupEnrollment[]>(load, 'ROSTER_LOAD_FAILED', {
    groupId: groupId ?? 0,
  });
  return { roster, loadFailed };
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
            const slots = await slotsRepo(db).listBySeason(season.id);
            const found = proposedSession(slots as WeeklySlot[], season, { date, time });
            const slot = slots.find((s) => s.id === found?.slotId);
            return found && slot ? { slot, date: found.date, startTime: found.startTime } : null;
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
  const repo = useMemo(() => (db ? sessionsRepo(db) : null), [db]);
  const record = useCallback(
    async (call: RollCall): Promise<number> => {
      if (!repo) throw new DataError('DB_NOT_READY');
      const id = await repo.record(call);
      notifyDataChanged();
      return id;
    },
    [repo],
  );
  const isRecorded = useCallback(
    async (slotId: number, date: string): Promise<boolean> => {
      if (!repo) throw new DataError('DB_NOT_READY');
      return repo.isRecorded(slotId, date);
    },
    [repo],
  );
  return { record, isRecorded };
};
