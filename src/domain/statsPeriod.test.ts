import { customPeriod, monthPeriod, resolvePeriod, seasonPeriod } from '@/domain/statsPeriod';

const season = { startDate: '2026-09-01', endDate: '2027-07-31' };

describe('Période des statistiques (EX-27, RM-04)', () => {
  it('EX-27 « Saison » : du début de la saison active à aujourd’hui', () => {
    expect(seasonPeriod(season, '2026-11-27')).toEqual({
      kind: 'season',
      from: '2026-09-01',
      to: '2026-11-27',
    });
  });

  it('EX-27 « Saison » finie : bornée à sa fin ; à venir : bornée à son début', () => {
    expect(seasonPeriod(season, '2027-09-15').to).toBe('2027-07-31');
    expect(seasonPeriod(season, '2026-08-15')).toEqual({
      kind: 'season',
      from: '2026-09-01',
      to: '2026-09-01',
    });
  });

  it('EX-27 « Ce mois » : du 1er à aujourd’hui (fin de mois, 29 février)', () => {
    expect(monthPeriod('2026-11-27')).toEqual({
      kind: 'month',
      from: '2026-11-01',
      to: '2026-11-27',
    });
    expect(monthPeriod('2026-12-31')).toEqual({
      kind: 'month',
      from: '2026-12-01',
      to: '2026-12-31',
    });
    expect(monthPeriod('2028-02-29')).toEqual({
      kind: 'month',
      from: '2028-02-01',
      to: '2028-02-29',
    });
    expect(monthPeriod('2026-11-01')).toEqual({
      kind: 'month',
      from: '2026-11-01',
      to: '2026-11-01',
    });
  });

  it('EX-27 RM-04 dates libres : bornes comprises, un seul jour permis', () => {
    expect(customPeriod('2026-09-02', '2026-09-02')).toEqual({
      kind: 'custom',
      from: '2026-09-02',
      to: '2026-09-02',
    });
  });

  it('EX-27 RM-04 dates libres : « du » après « au » refusé, date invalide refusée', () => {
    expect(() => customPeriod('2026-11-02', '2026-11-01')).toThrow(
      expect.objectContaining({ code: 'END_BEFORE_START' }),
    );
    expect(() => customPeriod('2026-02-30', '2026-03-01')).toThrow(
      expect.objectContaining({ code: 'DATE_INVALID' }),
    );
    expect(() => customPeriod('2026-11-01', '01/12/2026')).toThrow(
      expect.objectContaining({ code: 'DATE_INVALID' }),
    );
    expect(() => monthPeriod('2026-13-01')).toThrow(
      expect.objectContaining({ code: 'DATE_INVALID' }),
    );
  });

  it('EX-27 période par défaut : la saison active ; sans saison active, « Ce mois »', () => {
    expect(resolvePeriod(null, season, '2026-11-27').kind).toBe('season');
    expect(resolvePeriod(null, null, '2026-11-27')).toEqual(monthPeriod('2026-11-27'));
    expect(resolvePeriod({ kind: 'season' }, null, '2026-11-27').kind).toBe('month');
  });

  it('EX-27 choix explicite : mois ou dates libres validées', () => {
    expect(resolvePeriod({ kind: 'month' }, season, '2026-11-27')).toEqual(
      monthPeriod('2026-11-27'),
    );
    expect(
      resolvePeriod({ kind: 'custom', from: '2026-03-01', to: '2026-03-31' }, season, '2026-11-27'),
    ).toEqual(customPeriod('2026-03-01', '2026-03-31'));
    expect(() =>
      resolvePeriod({ kind: 'custom', from: '2026-04-01', to: '2026-03-31' }, season, '2026-11-27'),
    ).toThrow(expect.objectContaining({ code: 'END_BEFORE_START' }));
  });
});
