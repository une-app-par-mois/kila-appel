import { firstSeason } from '@/domain/seasons';

describe('P1 saison créée à la première ouverture (ticket 012b)', () => {
  it.each([
    ['2026-11-27', '2026-2027', '2026-09-01', '2027-08-31'],
    ['2026-09-01', '2026-2027', '2026-09-01', '2027-08-31'],
    ['2026-08-31', '2026-2027', '2026-09-01', '2027-08-31'],
    ['2026-07-01', '2026-2027', '2026-09-01', '2027-08-31'],
    ['2026-06-30', '2025-2026', '2025-09-01', '2026-08-31'],
    ['2027-01-01', '2026-2027', '2026-09-01', '2027-08-31'],
  ])(
    'le %s : %s, du %s au %s (1er septembre au 31 août, la suivante dès le 1er juillet : décisions du 2026-11-27)',
    (today, name, startDate, endDate) => {
      expect(firstSeason(today)).toEqual({ name, startDate, endDate });
    },
  );
});
