import { LOG_REFUSED, log } from '@/data/log';

describe('Module de journal unique (SEC-12, ABS-04)', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    spy.mockRestore();
  });

  it('SEC-12 écrit un code et des identifiants', () => {
    log('DB_OPEN_FAILED', { memberId: 12, retried: true });
    expect(spy).toHaveBeenCalledWith('[kila] DB_OPEN_FAILED', { memberId: 12, retried: true });
  });

  it.each([
    'first_name',
    'last_name',
    'phone',
    'birth_date',
    'firstName',
    'lastName',
    'birthDate',
    'label',
  ])('ABS-04 refuse un champ %s, même avec une valeur numérique', (key) => {
    expect(() => log('MEMBER_SAVED', { [key]: 1 })).toThrow(LOG_REFUSED);
    expect(spy).not.toHaveBeenCalled();
  });

  it('ABS-04 refuse toute valeur texte ou objet, et le message ne la contient pas', () => {
    const details = { memberId: 'Alix Exemple' } as unknown as Record<string, number>;
    expect(() => log('MEMBER_SAVED', details)).toThrow(/^(?!.*Alix).*$/);
    const nested = { member: { first_name: 'Alix' } } as unknown as Record<string, number>;
    expect(() => log('MEMBER_SAVED', nested)).toThrow(LOG_REFUSED);
    expect(spy).not.toHaveBeenCalled();
  });

  it.each(['member saved', 'Alix Exemple', '', 'db_open'])(
    'refuse un code qui n’est pas en MAJUSCULES_SOULIGNÉES (%s)',
    (code) => {
      expect(() => log(code)).toThrow(LOG_REFUSED);
      expect(spy).not.toHaveBeenCalled();
    },
  );
});
