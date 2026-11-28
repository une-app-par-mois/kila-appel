// EX-28 : séances encore dues (ticket 028b) : une relance affichée n'est retirée que si sa séance
// ne l'est plus. Même règle que plannedReminders (EX-17, EX-36, EX-38). Domaine pur.
import type { LocalNow, Season } from '@/domain/occurrences';
import { type DueInput, dueSessions, type ReminderSlot } from '@/domain/reminders';

const SEASON: Season = { startDate: '2026-09-01', endDate: '2027-07-31' };
// Mercredi 2026-12-02 à 15:10 : la relance de 14:30 (créneau de 14:00) est affichée.
const NOW: LocalNow = { date: '2026-12-02', time: '15:10' };
const POUSSINS = { id: 1, name: 'Poussins mercredi' };
const TODAY = { slotId: 10, date: '2026-12-02' };
const LAST_WEEK = { slotId: 10, date: '2026-11-25' };

const slot = (over: Partial<ReminderSlot> = {}): ReminderSlot => ({
  id: 10,
  weekday: 3,
  startTime: '14:00',
  durationMin: 90,
  scheduleFrom: '2026-11-18',
  groups: [POUSSINS],
  ...over,
});

const input = (over: Partial<DueInput> = {}): DueInput => ({
  slots: [slot()],
  activeGroupIds: [POUSSINS.id],
  season: SEASON,
  sessions: [],
  now: NOW,
  ...over,
});

describe('EX-28 dueSessions : séances encore dues', () => {
  it('EX-17 séances passées et du jour sans appel, depuis la date d’effet, jamais futures', () => {
    expect(dueSessions(input())).toEqual([{ slotId: 10, date: '2026-11-18' }, LAST_WEEK, TODAY]);
  });

  it('EX-28 relance retardée par Doze et ouverte pendant ce retard : la séance reste due', () => {
    // Relance prévue à 14:30, affichée à 15:05 ; l'appli s'ouvre à 15:10, plus rien n'est à venir.
    expect(dueSessions(input())).toContainEqual(TODAY);
  });

  it('EX-17 appel enregistré → plus due ; EX-36 séance préparée → encore due', () => {
    const recorded = [{ slotId: 10, date: '2026-12-02', state: 'recorded' as const }];
    expect(dueSessions(input({ sessions: recorded }))).not.toContainEqual(TODAY);
    const prepared = [{ slotId: 10, date: '2026-12-02', state: 'prepared' as const }];
    expect(dueSessions(input({ sessions: prepared }))).toContainEqual(TODAY);
  });

  it('EX-36 annulée, EX-38 hors planning → plus due', () => {
    for (const state of ['cancelled', 'unscheduled'] as const)
      expect(dueSessions(input({ sessions: [{ slotId: 10, date: '2026-12-02', state }] }))).toEqual(
        [{ slotId: 10, date: '2026-11-18' }, LAST_WEEK],
      );
  });

  it('EX-39 un appel sans créneau du même jour ne rend pas la séance faite', () => {
    const sessions = [{ slotId: null, date: '2026-12-02', state: 'recorded' as const }];
    expect(dueSessions(input({ sessions }))).toContainEqual(TODAY);
  });

  it('F-11 tous les groupes du créneau archivés → plus due ; un seul suffit à la garder', () => {
    const groups = [POUSSINS, { id: 2, name: 'Benjamins' }];
    expect(dueSessions(input({ activeGroupIds: [] }))).toEqual([]);
    expect(dueSessions(input({ slots: [slot({ groups })], activeGroupIds: [2] }))).toContainEqual(
      TODAY,
    );
  });

  it('EX-28 créneau ou groupe supprimé, séance hors de la saison active → plus due', () => {
    expect(dueSessions(input({ slots: [] }))).toEqual([]);
    expect(dueSessions(input({ slots: [slot({ groups: [] })] }))).toEqual([]);
    expect(dueSessions(input({ season: null }))).toEqual([]);
    const ended = { startDate: '2026-09-01', endDate: '2026-11-30' };
    expect(dueSessions(input({ season: ended }))).toEqual([
      { slotId: 10, date: '2026-11-18' },
      LAST_WEEK,
    ]);
  });

  it('RM-04 maintenant invalide → erreur sans donnée', () => {
    expect(() => dueSessions(input({ now: { date: '2026-12-02', time: '25:00' } }))).toThrow(
      'Date ou heure invalide (RM-04)',
    );
  });
});
