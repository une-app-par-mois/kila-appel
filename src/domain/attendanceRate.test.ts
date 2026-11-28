import {
  attendanceRate,
  formatRate,
  NBSP,
  ratePercent,
  type StatusCounts,
  statusShares,
} from '@/domain/attendanceRate';

const counts = (present: number, late: number, excused: number, absent: number): StatusCounts => ({
  present,
  late,
  excused,
  absent,
});

describe('Taux de présence (RM-01, EX-27)', () => {
  it('RM-01 maquette « Statistiques d’un membre » : 6 P, 1 R, 1 E, 4 A → 7/11 = « 64 % », barre 50, 8, 8, 34', () => {
    const hugo = counts(6, 1, 1, 4);
    expect(attendanceRate(hugo)).toEqual({ attended: 7, counted: 11 });
    expect(formatRate(attendanceRate(hugo))).toBe(`64${NBSP}%`);
    expect(statusShares(hugo)).toEqual({ present: 50, late: 8, excused: 8, absent: 34 });
  });

  it('RM-01 Excusé hors du calcul : que des excusés → « — »', () => {
    expect(attendanceRate(counts(0, 0, 5, 0))).toBeNull();
    expect(formatRate(attendanceRate(counts(0, 0, 5, 0)))).toBe('—');
  });

  it('RM-01 aucune séance → « — », jamais « 0 % »', () => {
    expect(attendanceRate(counts(0, 0, 0, 0))).toBeNull();
    expect(formatRate(null)).toBe('—');
  });

  it('RM-01 Retard compte comme présent ; que des absents → « 0 % » (valeur exacte)', () => {
    expect(formatRate(attendanceRate(counts(0, 3, 0, 0)))).toBe(`100${NBSP}%`);
    expect(formatRate(attendanceRate(counts(0, 0, 0, 3)))).toBe(`0${NBSP}%`);
  });

  it('RM-01 arrondi à l’entier, la moitié vers le haut', () => {
    expect(formatRate({ attended: 1, counted: 8 })).toBe(`13${NBSP}%`); // 12,5
    expect(formatRate({ attended: 7, counted: 8 })).toBe(`88${NBSP}%`); // 87,5
    expect(formatRate({ attended: 2, counted: 3 })).toBe(`67${NBSP}%`); // 66,67
    expect(formatRate({ attended: 1, counted: 3 })).toBe(`33${NBSP}%`); // 33,33
  });

  it('RM-01 « 100 % » et « 0 % » réservés aux valeurs exactes (99,5 → 99, 0,4 → 1)', () => {
    expect(formatRate({ attended: 199, counted: 200 })).toBe(`99${NBSP}%`); // 99,5
    expect(formatRate({ attended: 249, counted: 250 })).toBe(`99${NBSP}%`); // 99,6
    expect(formatRate({ attended: 1, counted: 250 })).toBe(`1${NBSP}%`); // 0,4
    expect(formatRate({ attended: 1, counted: 1000 })).toBe(`1${NBSP}%`); // 0,1
  });

  it('EX-27 parts de la barre : plus forts restes, total 100, égalité au plus grand compte', () => {
    expect(statusShares(counts(1, 1, 1, 0))).toEqual({
      present: 34,
      late: 33,
      excused: 33,
      absent: 0,
    });
    expect(statusShares(counts(37, 1, 3, 5))).toEqual({
      present: 80,
      late: 2,
      excused: 7,
      absent: 11,
    });
    expect(statusShares(counts(0, 0, 2, 0))).toEqual({
      present: 0,
      late: 0,
      excused: 100,
      absent: 0,
    });
  });

  it('EX-27 parts de la barre : tout statut non nul a au moins 1 point, pris sur la plus grande part', () => {
    expect(statusShares(counts(299, 0, 0, 1))).toEqual({
      present: 99,
      late: 0,
      excused: 0,
      absent: 1,
    });
    expect(statusShares(counts(249, 1, 0, 0))).toEqual({
      present: 99,
      late: 1,
      excused: 0,
      absent: 0,
    });
    expect(statusShares(counts(997, 1, 1, 1))).toEqual({
      present: 97,
      late: 1,
      excused: 1,
      absent: 1,
    });
  });

  it('RM-01 taux sans dénominateur ou compte non entier refusé', () => {
    expect(() => ratePercent({ attended: 0, counted: 0 })).toThrow();
    expect(() => ratePercent({ attended: 1, counted: -2 })).toThrow();
    expect(() => ratePercent({ attended: 0.5, counted: 2 })).toThrow();
    expect(() => ratePercent({ attended: 3, counted: 2 })).toThrow();
    expect(() => ratePercent({ attended: -1, counted: 2 })).toThrow();
  });

  it('EX-27 espace insécable avant « % » (U+00A0)', () => {
    expect(NBSP).toBe('\u00a0');
  });

  it('EX-27 parts de la barre sans aucune présence : toutes à 0', () => {
    expect(statusShares(counts(0, 0, 0, 0))).toEqual({
      present: 0,
      late: 0,
      excused: 0,
      absent: 0,
    });
  });

  it('EX-27 compte invalide refusé (négatif ou non entier)', () => {
    expect(() => attendanceRate(counts(-1, 0, 0, 0))).toThrow();
    expect(() => statusShares(counts(0.5, 0, 0, 0))).toThrow();
  });
});
