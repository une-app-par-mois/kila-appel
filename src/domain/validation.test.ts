import { InputError, validateName, validateSeason } from '@/domain/validation';

describe('Validation des saisies avant la base', () => {
  it('retire les espaces autour d’un nom', () => {
    expect(validateName('  Poussins  ')).toBe('Poussins');
  });

  it.each(['', '   ', '\t\n'])('refuse un nom vide (%j)', (name) => {
    expect(() => validateName(name)).toThrow(InputError);
    expect(() => validateName(name)).toThrow('NAME_REQUIRED');
  });

  it('EX-01 accepte une saison valide, nom nettoyé', () => {
    expect(
      validateSeason({ name: ' 2026-2027 ', startDate: '2026-09-01', endDate: '2027-07-31' }),
    ).toEqual({ name: '2026-2027', startDate: '2026-09-01', endDate: '2027-07-31' });
  });

  it('accepte une saison d’un seul jour', () => {
    expect(
      validateSeason({ name: 'Stage', startDate: '2026-12-21', endDate: '2026-12-21' }).endDate,
    ).toBe('2026-12-21');
  });

  it.each([
    ['DATE_INVALID', { name: 'S', startDate: '2026-02-30', endDate: '2027-07-31' }],
    ['DATE_INVALID', { name: 'S', startDate: '2026-09-01', endDate: '31/07/2027' }],
    ['END_BEFORE_START', { name: 'S', startDate: '2026-09-01', endDate: '2026-08-31' }],
    ['NAME_REQUIRED', { name: ' ', startDate: '2026-09-01', endDate: '2027-07-31' }],
  ])('RM-04 refuse avec le code %s', (code, input) => {
    expect(() => validateSeason(input)).toThrow(code);
  });

  it('ABS-04 le message d’erreur ne contient pas la saisie', () => {
    try {
      validateSeason({ name: 'Alix Exemple', startDate: 'x', endDate: 'y' });
    } catch (error) {
      expect(String(error)).not.toContain('Alix');
      expect((error as InputError).code).toBe('DATE_INVALID');
    }
    expect.assertions(2);
  });
});
