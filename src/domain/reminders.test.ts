// EX-28 : relances des 7 jours à venir (ticket 027, ADR-007). Domaine pur, dates et heures locales.
import type { LocalNow, Season } from '@/domain/occurrences';
import {
  MAX_REMINDERS,
  plannedReminders,
  type ReminderInput,
  type ReminderSlot,
} from '@/domain/reminders';

const SEASON: Season = { startDate: '2026-09-01', endDate: '2027-07-31' };
// Lundi 2026-11-30 à 08:00.
const NOW: LocalNow = { date: '2026-11-30', time: '08:00' };
const POUSSINS = { id: 1, name: 'Poussins mercredi' };

const slot = (over: Partial<ReminderSlot> = {}): ReminderSlot => ({
  id: 10,
  weekday: 3,
  startTime: '14:00',
  durationMin: 90,
  scheduleFrom: '2026-09-01',
  groups: [POUSSINS],
  ...over,
});

const input = (over: Partial<ReminderInput> = {}): ReminderInput => ({
  slots: [slot()],
  activeGroupIds: [POUSSINS.id],
  season: SEASON,
  sessions: [],
  settings: { enabled: true, delayMin: 30 },
  now: NOW,
  ...over,
});

const moments = (over: Partial<ReminderInput> = {}) =>
  plannedReminders(input(over)).map((r) => `${r.slotId} ${r.date} → ${r.fireDate} ${r.fireTime}`);

describe('EX-28 plannedReminders : relances des 7 jours à venir', () => {
  it('EX-28 créneau le mercredi à 14:00, délai 30 → mercredi 14:30', () => {
    expect(plannedReminders(input())).toEqual([
      {
        slotId: 10,
        date: '2026-12-02',
        startTime: '14:00',
        fireDate: '2026-12-02',
        fireTime: '14:30',
        groupNames: ['Poussins mercredi'],
      },
    ]);
  });

  it('EX-28 délai 45 → 14:45', () => {
    expect(moments({ settings: { enabled: true, delayMin: 45 } })).toEqual([
      '10 2026-12-02 → 2026-12-02 14:45',
    ]);
  });

  it('EX-28 créneau à 23:45, délai 30 → lendemain 00:15', () => {
    expect(moments({ slots: [slot({ startTime: '23:45' })] })).toEqual([
      '10 2026-12-02 → 2026-12-03 00:15',
    ]);
  });

  it('EX-28 fin de mois et d’année après minuit', () => {
    const now = { date: '2026-12-29', time: '08:00' };
    expect(moments({ now, slots: [slot({ weekday: 4, startTime: '23:50' })] })).toEqual([
      '10 2026-12-31 → 2027-01-01 00:20',
    ]);
  });

  it('EX-29 relance désactivée (défaut) → aucune relance', () => {
    expect(plannedReminders(input({ settings: { enabled: false, delayMin: 30 } }))).toEqual([]);
  });

  it('EX-28 sans saison active → aucune relance', () => {
    expect(plannedReminders(input({ season: null }))).toEqual([]);
  });

  it('EX-17 EX-28 séance enregistrée ce jour-là → pas de relance', () => {
    const sessions = [{ slotId: 10, date: '2026-12-02', state: 'recorded' as const }];
    expect(plannedReminders(input({ sessions }))).toEqual([]);
  });

  it.each(['cancelled', 'unscheduled'] as const)('EX-38 séance %s → pas de relance', (state) => {
    expect(
      plannedReminders(input({ sessions: [{ slotId: 10, date: '2026-12-02', state }] })),
    ).toEqual([]);
  });

  it('EX-36 séance préparée → la relance part', () => {
    const sessions = [{ slotId: 10, date: '2026-12-02', state: 'prepared' as const }];
    expect(moments({ sessions })).toEqual(['10 2026-12-02 → 2026-12-02 14:30']);
  });

  it('EX-17 une séance d’un autre jour ou d’un autre créneau ne retire pas la relance', () => {
    const sessions = [
      { slotId: 10, date: '2026-11-25', state: 'recorded' as const },
      { slotId: 11, date: '2026-12-02', state: 'recorded' as const },
    ];
    expect(moments({ sessions })).toEqual(['10 2026-12-02 → 2026-12-02 14:30']);
  });

  it('EX-39 un appel sans créneau du même jour ne retire pas la relance', () => {
    const sessions = [{ slotId: null, date: '2026-12-02', state: 'recorded' as const }];
    expect(moments({ sessions })).toEqual(['10 2026-12-02 → 2026-12-02 14:30']);
  });

  it('EX-28 relance déjà passée (ouverture à 15:00, créneau à 14:00) → non programmée', () => {
    // Le mercredi suivant (09/12) est hors des 7 jours (02/12 au 08/12).
    expect(moments({ now: { date: '2026-12-02', time: '15:00' } })).toEqual([]);
  });

  it('EX-28 jamais dans le passé : relance à la minute même de maintenant non gardée', () => {
    expect(moments({ now: { date: '2026-12-02', time: '14:30' } })).toEqual([]);
    expect(moments({ now: { date: '2026-12-02', time: '14:29' } })).toEqual([
      '10 2026-12-02 → 2026-12-02 14:30',
    ]);
  });

  it('EX-28 occurrence d’hier dont la relance est encore à venir (23:45, ouverture à 00:05)', () => {
    const now = { date: '2026-12-03', time: '00:05' };
    expect(moments({ now, slots: [slot({ startTime: '23:45' })] })).toEqual([
      '10 2026-12-02 → 2026-12-03 00:15',
      '10 2026-12-09 → 2026-12-10 00:15',
    ]);
    // À 00:15, la relance d'hier tombe à la minute même : plus gardée.
    expect(
      moments({
        now: { date: '2026-12-03', time: '00:15' },
        slots: [slot({ startTime: '23:45' })],
      }),
    ).toEqual(['10 2026-12-09 → 2026-12-10 00:15']);
  });

  it('EX-28 7 jours exactement : de aujourd’hui à aujourd’hui + 6', () => {
    const slots = [1, 2, 3, 4, 5, 6, 7].map((weekday) =>
      slot({ id: weekday, weekday: weekday as ReminderSlot['weekday'], startTime: '20:00' }),
    );
    expect(plannedReminders(input({ slots })).map((r) => r.date)).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
      '2026-12-06',
    ]);
  });

  it('EX-08 bornée par la date d’effet de l’horaire', () => {
    expect(moments({ slots: [slot({ scheduleFrom: '2026-12-03' })] })).toEqual([]);
  });

  it('EX-28 fin de saison dans les 7 jours : rien après, dernier jour gardé même après minuit', () => {
    const season = { startDate: '2026-09-01', endDate: '2026-12-02' };
    const slots = [slot({ startTime: '23:45' }), slot({ id: 11, weekday: 4 })];
    expect(moments({ season, slots })).toEqual(['10 2026-12-02 → 2026-12-03 00:15']);
  });

  it('EX-28 saison qui commence dans les 7 jours', () => {
    const season = { startDate: '2026-12-03', endDate: '2027-07-31' };
    expect(moments({ season, slots: [slot(), slot({ id: 11, weekday: 5 })] })).toEqual([
      '11 2026-12-04 → 2026-12-04 14:30',
    ]);
  });

  it('F-11 plusieurs groupes actifs nommés, archivés omis ; aucun groupe actif → pas de relance', () => {
    const groups = [{ id: 2, name: 'Benjamins' }, { id: 3, name: 'Ancien groupe' }, POUSSINS];
    const slots = [
      slot({ groups }),
      slot({ id: 11, weekday: 4, groups: [{ id: 3, name: 'Ancien groupe' }] }),
    ];
    const reminders = plannedReminders(input({ slots, activeGroupIds: [1, 2] }));
    expect(reminders.map((r) => [r.slotId, r.groupNames])).toEqual([
      [10, ['Benjamins', 'Poussins mercredi']],
    ]);
  });

  it('EX-28 tri par moment de la relance, puis par créneau', () => {
    const slots = [
      slot({ id: 12, startTime: '14:00' }),
      slot({ id: 11, startTime: '13:30', durationMin: 30 }),
      slot({ id: 13, weekday: 1, startTime: '18:00' }),
    ];
    expect(moments({ slots, settings: { enabled: true, delayMin: 60 } })).toEqual([
      '13 2026-11-30 → 2026-11-30 19:00',
      '11 2026-12-02 → 2026-12-02 14:30',
      '12 2026-12-02 → 2026-12-02 15:00',
    ]);
    const tie = [slot({ id: 12 }), slot({ id: 11 })];
    expect(moments({ slots: tie }).map((m) => m.slice(0, 2))).toEqual(['11', '12']);
  });

  it('EX-28 au plus 64 relances (plafond iOS), les plus proches gardées', () => {
    const slots = Array.from({ length: 70 }, (_, i) =>
      slot({
        id: 100 + i,
        weekday: 2,
        startTime: `${String(8 + Math.floor(i / 6)).padStart(2, '0')}:${String((i % 6) * 10).padStart(2, '0')}`,
      }),
    );
    const reminders = plannedReminders(input({ slots, settings: { enabled: true, delayMin: 10 } }));
    expect(MAX_REMINDERS).toBe(64);
    expect(reminders).toHaveLength(64);
    expect(reminders.at(-1)?.slotId).toBe(163);
  });

  it('EX-28 changement d’heure : heures locales inchangées, dates en texte', () => {
    // Passage à l'heure d'hiver le dimanche 2026-10-25.
    const now = { date: '2026-10-24', time: '08:00' };
    expect(moments({ now, slots: [slot({ weekday: 7, startTime: '02:30' })] })).toEqual([
      '10 2026-10-25 → 2026-10-25 03:00',
    ]);
  });

  it('RM-04 maintenant invalide ou délai non autorisé → erreur sans donnée', () => {
    expect(() => plannedReminders(input({ now: { date: '2026-13-01', time: '08:00' } }))).toThrow(
      'Date ou heure invalide (RM-04)',
    );
    expect(() => plannedReminders(input({ settings: { enabled: true, delayMin: 25 } }))).toThrow(
      'Délai de relance invalide (EX-28)',
    );
  });
});
