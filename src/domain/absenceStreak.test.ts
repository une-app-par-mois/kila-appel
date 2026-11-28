// Série d'absences (RM-02) et alerte d'assiduité (EX-25, EX-26) : domaine pur, zone sensible.
import { currentStreak, isAlertShown, type StatusOnDate } from '@/domain/absenceStreak';
import type { AttendanceStatus } from '@/domain/validation';

const letters: Record<string, AttendanceStatus> = {
  A: 'absent',
  P: 'present',
  R: 'late',
  E: 'excused',
};
const statuses = (s: string) => s.split(' ').map((l) => letters[l] as AttendanceStatus);
/** Une séance par jour à partir du 1er novembre 2026, dans l'ordre. */
const onDates = (s: string): StatusOnDate[] =>
  statuses(s).map((status, i) => ({ status, date: `2026-11-${String(i + 1).padStart(2, '0')}` }));

describe('currentStreak : longueur (RM-02)', () => {
  it.each([
    ['A A E A', 3],
    ['A A P A', 1],
    ['E E E', 0],
    ['A R A A', 2],
    ['A A R', 0],
    ['P A A A', 3],
    ['A E E A E', 2],
  ])('RM-02 %s → %i', (s, expected) => {
    expect(currentStreak(onDates(s)).length).toBe(expected);
  });

  it('RM-02 aucune séance → 0', () => {
    expect(currentStreak([]).length).toBe(0);
  });
});

describe('currentStreak (RM-02, EX-26)', () => {
  it('RM-02 série interrompue : début et fin datés sur les absences de la série en cours', () => {
    expect(currentStreak(onDates('A P A E A E'))).toEqual({
      length: 2,
      start: '2026-11-03',
      end: '2026-11-05',
    });
  });

  it('RM-02 que des excusés ou aucune séance : série nulle, sans date', () => {
    expect(currentStreak(onDates('E E E'))).toEqual({ length: 0, start: null, end: null });
    expect(currentStreak([])).toEqual({ length: 0, start: null, end: null });
  });
});

describe('isAlertShown (EX-25, EX-26)', () => {
  const streak = { length: 3, start: '2026-11-10', end: '2026-11-20' };

  it('EX-25 seuil atteint : alerte ; en dessous : aucune', () => {
    expect(isAlertShown({ streak, threshold: 3, acks: [] })).toBe(true);
    expect(isAlertShown({ streak: { ...streak, length: 2 }, threshold: 3, acks: [] })).toBe(false);
    expect(isAlertShown({ streak, threshold: 5, acks: [] })).toBe(false);
  });

  it('EX-26 traitée à cette longueur le jour de la dernière absence ou après : masquée', () => {
    for (const ackedAt of ['2026-11-20', '2026-11-21'])
      expect(isAlertShown({ streak, threshold: 3, acks: [{ streakLength: 3, ackedAt }] })).toBe(
        false,
      );
  });

  it('EX-26 la série s’allonge au-delà de la longueur traitée : l’alerte revient', () => {
    const acks = [{ streakLength: 3, ackedAt: '2026-11-25' }];
    expect(isAlertShown({ streak: { ...streak, length: 4 }, threshold: 3, acks })).toBe(true);
  });

  it('EX-26 série raccourcie après correction (EX-18) : reste masquée si elle atteint le seuil', () => {
    const acks = [{ streakLength: 4, ackedAt: '2026-11-20' }];
    expect(isAlertShown({ streak, threshold: 3, acks })).toBe(false);
  });

  it('EX-26 traitée avant le début de la série en cours (série retombée puis revenue) : montrée', () => {
    const acks = [{ streakLength: 3, ackedAt: '2026-11-09' }];
    expect(isAlertShown({ streak, threshold: 3, acks })).toBe(true);
  });

  it('EX-26 traitée avant la dernière absence de la série (décision du 2026-11-27) : montrée', () => {
    for (const ackedAt of ['2026-11-10', '2026-11-19'])
      expect(isAlertShown({ streak, threshold: 3, acks: [{ streakLength: 3, ackedAt }] })).toBe(
        true,
      );
  });

  it('EX-26 plusieurs traitements : un seul qui couvre la série suffit', () => {
    const acks = [
      { streakLength: 3, ackedAt: '2026-10-01' },
      { streakLength: 5, ackedAt: '2026-11-21' },
    ];
    expect(isAlertShown({ streak, threshold: 3, acks })).toBe(false);
  });
});
