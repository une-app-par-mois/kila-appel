import { InputError, validateMember, validateName, validateSeason } from '@/domain/validation';

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

describe('EX-03 validateMember', () => {
  const today = '2026-11-26';
  it('nettoie nom et prénom ; date de naissance facultative', () => {
    expect(
      validateMember({ firstName: ' Alix ', lastName: ' Exemple ', birthDate: null }, today),
    ).toEqual({
      firstName: 'Alix',
      lastName: 'Exemple',
      birthDate: null,
    });
    expect(
      validateMember({ firstName: 'Alix', lastName: 'Exemple', birthDate: '2015-03-14' }, today)
        .birthDate,
    ).toBe('2015-03-14');
  });

  it('refuse un nom ou un prénom vide', () => {
    expect(() =>
      validateMember({ firstName: ' ', lastName: 'Exemple', birthDate: null }, today),
    ).toThrow(expect.objectContaining({ code: 'NAME_REQUIRED' }));
    expect(() =>
      validateMember({ firstName: 'Alix', lastName: '', birthDate: null }, today),
    ).toThrow(expect.objectContaining({ code: 'NAME_REQUIRED' }));
  });

  it('refuse une date de naissance mal écrite (RM-04) ou dans le futur', () => {
    expect(() =>
      validateMember({ firstName: 'A', lastName: 'B', birthDate: '14/03/2015' }, today),
    ).toThrow(expect.objectContaining({ code: 'DATE_INVALID' }));
    expect(() =>
      validateMember({ firstName: 'A', lastName: 'B', birthDate: '2026-11-27' }, today),
    ).toThrow(expect.objectContaining({ code: 'DATE_IN_FUTURE' }));
    expect(
      validateMember({ firstName: 'A', lastName: 'B', birthDate: today }, today).birthDate,
    ).toBe(today);
  });
});
