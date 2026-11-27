import {
  countStatuses,
  matchesName,
  nextStatus,
  SEARCH_FROM,
  STATUS_CYCLE,
} from '@/domain/attendance';
import { foldText } from '@/domain/formats';
import { isSlotDate, weekdayOfDate } from '@/domain/occurrences';

describe('Présences (EX-10, EX-11)', () => {
  it('EX-10 cycle Présent → Absent → Retard → Excusé → Présent : Absent en 1 appui, Retard en 2', () => {
    expect(STATUS_CYCLE).toEqual(['present', 'absent', 'late', 'excused']);
    expect(nextStatus('present')).toBe('absent');
    expect(nextStatus(nextStatus('present'))).toBe('late');
    expect(nextStatus('late')).toBe('excused');
    expect(nextStatus('excused')).toBe('present');
  });

  it('EX-10 compteur : un nombre par statut, zéro compris', () => {
    expect(countStatuses(['present', 'absent', 'present', 'excused'])).toEqual({
      present: 2,
      absent: 1,
      late: 0,
      excused: 1,
    });
    expect(countStatuses([])).toEqual({ present: 0, absent: 0, late: 0, excused: 0 });
  });

  it('EX-11 recherche au-delà de 20 membres, sans accent ni casse, prénom ou nom', () => {
    expect(SEARCH_FROM).toBe(21);
    const zoe = { firstName: 'Zoé', lastName: 'Lefèvre' };
    for (const query of ['zoe', 'LEFEV', ' zoé ', 'zoé lef', '']) {
      expect(matchesName(query, zoe)).toBe(true);
    }
    expect(matchesName('alix', zoe)).toBe(false);
  });

  it('EX-11 texte replié : sans accent ni casse', () => {
    expect(foldText('Élodie Çelik')).toBe('elodie celik');
  });

  it('EX-17 une date de créneau : son jour, depuis sa date d’effet, jamais future', () => {
    const slot = {
      id: 1,
      weekday: 3 as const,
      startTime: '17:30',
      durationMin: 90,
      scheduleFrom: '2026-11-04',
    };
    expect(isSlotDate(slot, '2026-11-18', '2026-11-18')).toBe(true);
    expect(isSlotDate(slot, '2026-11-25', '2026-11-18')).toBe(false);
    expect(isSlotDate(slot, '2026-11-16', '2026-11-18')).toBe(false);
    expect(isSlotDate(slot, '2026-10-28', '2026-11-18')).toBe(false);
  });

  it('EX-09 jour de la semaine d’une date (1 = lundi)', () => {
    expect(weekdayOfDate('2026-12-02')).toBe(3);
    expect(weekdayOfDate('2026-12-07')).toBe(1);
    expect(weekdayOfDate('2026-12-06')).toBe(7);
  });
});
