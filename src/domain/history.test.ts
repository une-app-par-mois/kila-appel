import { newestFirst, periodStart } from '@/domain/history';

describe('Historique (EX-16)', () => {
  it('EX-16 « 30 derniers jours » : aujourd’hui et les 29 jours d’avant', () => {
    expect(periodStart('2026-11-27')).toBe('2026-10-29');
    expect(periodStart('2026-03-15')).toBe('2026-02-14');
    // Changement d'heure du 25/10/2026 : aucun décalage d'un jour.
    expect(periodStart('2026-11-20')).toBe('2026-10-22');
  });

  it('EX-16 la plus récente en haut : date puis heure décroissantes, ordre stable sinon', () => {
    const rows = [
      { id: 1, date: '2026-11-19', startTime: '14:00' },
      { id: 2, date: '2026-11-24', startTime: '18:00' },
      { id: 3, date: '2026-11-19', startTime: '18:00' },
      { id: 4, date: '2026-11-19', startTime: '14:00' },
    ];
    expect(newestFirst(rows).map((r) => r.id)).toEqual([2, 3, 1, 4]);
    // L'entrée n'est pas modifiée.
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3, 4]);
  });
});
