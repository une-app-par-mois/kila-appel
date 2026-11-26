import { log } from '@/data/log';

describe('Module de journal unique (SEC-12, ABS-04)', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    spy.mockRestore();
  });

  const written = () => JSON.stringify(spy.mock.calls);

  it('SEC-12 écrit un code et des identifiants', () => {
    log('DB_OPEN_FAILED', { memberId: 12, sessionCount: 3, version: 1, ok: false });
    expect(spy).toHaveBeenCalledWith('[kila] DB_OPEN_FAILED', {
      memberId: 12,
      sessionCount: 3,
      version: 1,
      ok: false,
    });
  });

  it.each([
    'first_name',
    'last_name',
    'phone',
    'birth_date',
    'phoneNumber',
    'dateOfBirth',
    'Phone',
    'label',
    'name',
  ])('ABS-04 refuse la clé %s (liste blanche) : seule la ligne LOG_REFUSED est écrite', (key) => {
    log('MEMBER_SAVED', { [key]: 612345678 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('[kila] LOG_REFUSED MEMBER_SAVED');
    expect(written()).not.toContain('612345678');
  });

  it('ABS-04 refuse une valeur texte ou objet, sans lever d’erreur et sans l’écrire', () => {
    const text = { memberId: 'Alix Exemple' } as unknown as Record<string, number>;
    const nested = { memberId: { first_name: 'Alix' } } as unknown as Record<string, number>;
    expect(() => log('MEMBER_SAVED', text)).not.toThrow();
    expect(() => log('MEMBER_SAVED', nested)).not.toThrow();
    expect(written()).not.toContain('Alix');
    expect(spy).toHaveBeenCalledWith('[kila] LOG_REFUSED MEMBER_SAVED');
  });

  it.each(['member saved', 'Alix Exemple', '', 'db_open'])(
    'refuse un code qui n’est pas en MAJUSCULES_SOULIGNÉES, sans l’écrire (%s)',
    (code) => {
      log(code, { memberId: 1 });
      expect(spy).toHaveBeenCalledWith('[kila] LOG_REFUSED');
      expect(spy).toHaveBeenCalledTimes(1);
    },
  );
});
