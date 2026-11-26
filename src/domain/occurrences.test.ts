import {
  type LocalNow,
  missingRollCalls,
  proposedSession,
  type Season,
  slotDates,
  type WeeklySlot,
} from '@/domain/occurrences';

// Jeu fictif. Novembre 2026 : les mercredis sont les 4, 11, 18 et 25.
const SEASON: Season = { startDate: '2026-09-01', endDate: '2027-06-30' };
const wednesday: WeeklySlot = {
  id: 1,
  weekday: 3,
  startTime: '17:30',
  durationMin: 90,
  createdOn: '2026-09-01',
};
const at = (date: string, time: string): LocalNow => ({ date, time });

describe('EX-08 slotDates : dates d’un créneau hebdomadaire sur une période', () => {
  it('donne chaque mercredi de la période, bornes comprises', () => {
    expect(slotDates(wednesday, SEASON, '2026-11-04', '2026-11-25')).toEqual([
      '2026-11-04',
      '2026-11-11',
      '2026-11-18',
      '2026-11-25',
    ]);
  });

  it('EX-08 ne donne aucune date antérieure à la création du créneau', () => {
    const created = { ...wednesday, createdOn: '2026-11-12' };
    expect(slotDates(created, SEASON, '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-18',
      '2026-11-25',
    ]);
    const createdOnAWednesday = { ...wednesday, createdOn: '2026-11-18' };
    expect(slotDates(createdOnAWednesday, SEASON, '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-18',
      '2026-11-25',
    ]);
  });

  it('reste dans la saison', () => {
    const season = { startDate: '2026-11-10', endDate: '2026-11-20' };
    expect(slotDates(wednesday, season, '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-11',
      '2026-11-18',
    ]);
  });

  it('numérote les jours de 1 (lundi) à 7 (dimanche)', () => {
    expect(slotDates({ ...wednesday, weekday: 1 }, SEASON, '2026-11-16', '2026-11-22')).toEqual([
      '2026-11-16',
    ]);
    expect(slotDates({ ...wednesday, weekday: 7 }, SEASON, '2026-11-16', '2026-11-22')).toEqual([
      '2026-11-22',
    ]);
  });

  it('ignore les changements d’heure (29 mars et 25 octobre 2026)', () => {
    const sunday = { ...wednesday, weekday: 7 as const, createdOn: '2026-01-01' };
    const season = { startDate: '2026-01-01', endDate: '2026-12-31' };
    expect(slotDates(sunday, season, '2026-03-22', '2026-04-05')).toEqual([
      '2026-03-22',
      '2026-03-29',
      '2026-04-05',
    ]);
    expect(slotDates(sunday, season, '2026-10-18', '2026-11-01')).toEqual([
      '2026-10-18',
      '2026-10-25',
      '2026-11-01',
    ]);
  });

  it('rend une liste vide pour une période inversée', () => {
    expect(slotDates(wednesday, SEASON, '2026-11-30', '2026-11-01')).toEqual([]);
  });
});

describe('EX-09 proposedSession : séance en cours, sinon la plus proche', () => {
  const evening: WeeklySlot = { ...wednesday, id: 2, startTime: '20:00', durationMin: 60 };

  it('propose la séance en cours', () => {
    expect(proposedSession([wednesday, evening], SEASON, at('2026-11-18', '18:00'))).toEqual({
      slotId: 1,
      date: '2026-11-18',
      startTime: '17:30',
    });
  });

  it('entre deux séances du jour, propose la plus proche : finie il y a 10 min plutôt que dans 50 min', () => {
    expect(proposedSession([wednesday, evening], SEASON, at('2026-11-18', '19:10'))?.slotId).toBe(
      1,
    );
    expect(proposedSession([wednesday, evening], SEASON, at('2026-11-18', '19:50'))?.slotId).toBe(
      2,
    );
  });

  it('préfère une séance du jour à une séance plus proche un autre jour', () => {
    const tuesdayLate: WeeklySlot = {
      ...wednesday,
      id: 3,
      weekday: 2,
      startTime: '23:00',
      durationMin: 30,
    };
    const wednesdayNoon: WeeklySlot = { ...wednesday, id: 4, startTime: '12:00', durationMin: 60 };
    // Mercredi 0 h 40 : mardi s'est fini il y a 1 h 10, mercredi midi commence dans 11 h 20.
    expect(
      proposedSession([tuesdayLate, wednesdayNoon], SEASON, at('2026-11-18', '00:40')),
    ).toEqual({
      slotId: 4,
      date: '2026-11-18',
      startTime: '12:00',
    });
  });

  it('à égale distance, préfère la séance finie, puis le créneau au plus petit identifiant', () => {
    // 19 h 30 : la séance de 17 h 30 est finie depuis 30 min, celle de 20 h commence dans 30 min.
    const at20 = { ...evening, durationMin: 60 };
    expect(proposedSession([at20, wednesday], SEASON, at('2026-11-18', '19:30'))?.slotId).toBe(1);
    const twin: WeeklySlot = { ...evening, id: 7 };
    expect(proposedSession([twin, evening], SEASON, at('2026-11-18', '19:30'))?.slotId).toBe(2);
  });

  it('sans séance ce jour-là, propose la plus proche dans le temps', () => {
    const saturday: WeeklySlot = { ...wednesday, id: 5, weekday: 6, startTime: '10:00' };
    // Jeudi 10 h : mercredi fini il y a 15 h, samedi dans 48 h.
    expect(proposedSession([wednesday, saturday], SEASON, at('2026-11-19', '10:00'))).toEqual({
      slotId: 1,
      date: '2026-11-18',
      startTime: '17:30',
    });
  });

  it('propose une séance qui passe minuit tant qu’elle est en cours', () => {
    const night: WeeklySlot = {
      ...wednesday,
      id: 6,
      weekday: 2,
      startTime: '23:00',
      durationMin: 120,
    };
    expect(proposedSession([night, wednesday], SEASON, at('2026-11-18', '00:30'))).toEqual({
      slotId: 6,
      date: '2026-11-17',
      startTime: '23:00',
    });
  });

  it('ne propose rien sans créneau, ni avant la création ou hors de la saison', () => {
    expect(proposedSession([], SEASON, at('2026-11-18', '18:00'))).toBeNull();
    const future = { ...wednesday, createdOn: '2027-01-01' };
    const ended = { startDate: '2026-01-01', endDate: '2026-06-30' };
    expect(
      proposedSession([future], { ...SEASON, endDate: '2026-12-01' }, at('2026-11-18', '18:00')),
    ).toBeNull();
    expect(proposedSession([wednesday], ended, at('2026-11-18', '18:00'))).toBeNull();
  });
});

describe('EX-17 missingRollCalls : séances passées sans appel enregistré', () => {
  const created = { ...wednesday, createdOn: '2026-11-01' };

  it('liste les séances finies sans appel, pas celle en cours', () => {
    expect(missingRollCalls([created], SEASON, [], at('2026-11-18', '18:00'))).toEqual([
      { slotId: 1, date: '2026-11-04', startTime: '17:30' },
      { slotId: 1, date: '2026-11-11', startTime: '17:30' },
    ]);
  });

  it('compte une séance comme manquante dès sa fin (19 h pour 17 h 30 + 90 min)', () => {
    const dates = (time: string) =>
      missingRollCalls([created], SEASON, [], at('2026-11-18', time)).map((m) => m.date);
    expect(dates('18:59')).not.toContain('2026-11-18');
    expect(dates('19:00')).toContain('2026-11-18');
  });

  it('RM-05 retire une date dont la séance est enregistrée pour ce créneau', () => {
    const recorded = [
      { slotId: 1, date: '2026-11-04' },
      { slotId: 9, date: '2026-11-11' },
    ];
    expect(missingRollCalls([created], SEASON, recorded, at('2026-11-18', '20:00'))).toEqual([
      { slotId: 1, date: '2026-11-11', startTime: '17:30' },
      { slotId: 1, date: '2026-11-18', startTime: '17:30' },
    ]);
  });

  it('EX-08 ne réclame rien avant la création ni après la fin de la saison', () => {
    const late = { ...wednesday, createdOn: '2026-11-12' };
    expect(missingRollCalls([late], SEASON, [], at('2026-11-18', '18:00'))).toEqual([]);
    const season = { startDate: '2026-09-01', endDate: '2026-11-10' };
    expect(missingRollCalls([created], season, [], at('2026-11-30', '12:00'))).toEqual([
      { slotId: 1, date: '2026-11-04', startTime: '17:30' },
    ]);
  });

  it('trie plusieurs créneaux le même jour par date puis par heure', () => {
    const morning: WeeklySlot = { ...created, id: 2, startTime: '09:00', durationMin: 60 };
    expect(missingRollCalls([created, morning], SEASON, [], at('2026-11-05', '08:00'))).toEqual([
      { slotId: 2, date: '2026-11-04', startTime: '09:00' },
      { slotId: 1, date: '2026-11-04', startTime: '17:30' },
    ]);
  });

  it('trie deux créneaux à la même heure par identifiant', () => {
    const twin: WeeklySlot = { ...created, id: 0 };
    expect(missingRollCalls([created, twin], SEASON, [], at('2026-11-04', '20:00'))).toEqual([
      { slotId: 0, date: '2026-11-04', startTime: '17:30' },
      { slotId: 1, date: '2026-11-04', startTime: '17:30' },
    ]);
  });

  it('compte une séance qui passe minuit comme manquante à sa fin, le lendemain', () => {
    const night: WeeklySlot = {
      ...created,
      id: 6,
      weekday: 2,
      startTime: '23:00',
      durationMin: 120,
    };
    const missing = (time: string) =>
      missingRollCalls([night], SEASON, [], at('2026-11-04', time)).map((m) => m.date);
    expect(missing('00:59')).toEqual([]);
    expect(missing('01:00')).toEqual(['2026-11-03']);
  });
});
