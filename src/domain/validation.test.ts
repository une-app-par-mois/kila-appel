import {
  InputError,
  validateMember,
  validateName,
  validateRollCall,
  validateSeason,
  validateSlot,
} from '@/domain/validation';

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

  const member = (firstName: string, lastName = 'Exemple') =>
    validateMember({ firstName, lastName, birthDate: null }, today);

  it('SEC-06 accepte 100 caractères, comptés en points de code après trim()', () => {
    expect(member(` ${'a'.repeat(100)} `).firstName).toHaveLength(100);
    // Un émoji (deux unités UTF-16) compte pour un.
    expect(member('😀'.repeat(100)).firstName).toBe('😀'.repeat(100));
  });

  it('SEC-06 refuse un nom ou un prénom de 101 caractères (NAME_TOO_LONG)', () => {
    expect(() => member('a'.repeat(101))).toThrow(
      expect.objectContaining({ code: 'NAME_TOO_LONG' }),
    );
    expect(() => member('Alix', 'é'.repeat(101))).toThrow(
      expect.objectContaining({ code: 'NAME_TOO_LONG' }),
    );
  });

  // U+0000 à U+001F, U+007F à U+009F, U+2028, U+2029, U+202A à U+202E, U+2066 à U+2069 ; et
  // (porteur, 2026-11-28) U+061C, U+200B, U+200E, U+200F, U+FEFF, demi-caractères isolés.
  it.each([
    0x00, 0x09, 0x0a, 0x0d, 0x1f, 0x7f, 0x80, 0x9f, 0x2028, 0x2029, 0x202a, 0x202e, 0x2066, 0x2069,
    0x061c, 0x200b, 0x200e, 0x200f, 0xfeff, 0xd800, 0xdbff, 0xdc00, 0xdfff,
  ])('SEC-06 refuse le caractère invisible de code %i dans un nom (NAME_INVALID_CHAR)', (code) => {
    const char = String.fromCodePoint(code);
    expect(() => member(`Al${char}ix`)).toThrow(
      expect.objectContaining({ code: 'NAME_INVALID_CHAR' }),
    );
    expect(() => member('Alix', `Exe${char}mple`)).toThrow(
      expect.objectContaining({ code: 'NAME_INVALID_CHAR' }),
    );
  });

  it('SEC-06 accepte U+200D dans un émoji composé (paire de demi-caractères complète)', () => {
    const family = String.fromCodePoint(0x1f469, 0x200d, 0x1f467);
    expect(member(`Alix ${family}`).firstName).toBe(`Alix ${family}`);
  });

  it.each([0x20, 0xa0, 0xe9, 0x2019, 0x202f, 0x2065, 0x206a, 0x061b, 0x200c, 0x200d, 0x2010])(
    'SEC-06 accepte le caractère de code %i au milieu d’un nom (voisins des plages refusées)',
    (code) => {
      expect(member(`Al${String.fromCodePoint(code)}ix`).firstName).toHaveLength(5);
    },
  );

  it('SEC-06 garde les espaces autour comme avant ; accents, apostrophes et tirets acceptés', () => {
    expect(member('\tAlix\n').firstName).toBe('Alix');
    expect(member('Zoé-Léa', 'O’Brien d’Arc').lastName).toBe('O’Brien d’Arc');
    expect(member(' Alix ').firstName).toBe('Alix');
  });

  it('ABS-04 l’erreur de longueur ou de caractère ne contient pas la saisie', () => {
    for (const name of [`Alix${'x'.repeat(100)}`, 'Al\tix']) {
      try {
        member(name);
      } catch (error) {
        expect(String(error)).not.toContain('Alix');
        expect(String(error)).not.toContain('Al\tix');
      }
    }
    expect.assertions(4);
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

describe('EX-07 créneau hebdomadaire', () => {
  const slot = {
    weekday: 3,
    startTime: '14:00',
    durationMin: 90,
    place: '  Gymnase  ',
    name: '   ',
    groupId: 4,
  };

  it('EX-07 accepte un créneau valide ; lieu nettoyé, nom vide → aucun', () => {
    expect(validateSlot(slot)).toEqual({
      weekday: 3,
      startTime: '14:00',
      durationMin: 90,
      place: 'Gymnase',
      name: null,
      groupId: 4,
    });
    expect(validateSlot({ ...slot, place: null, name: 'Technique' })).toMatchObject({
      place: null,
      name: 'Technique',
    });
  });

  it.each([0, 8, 2.5, Number.NaN])('EX-07 refuse le jour %p', (weekday) => {
    expect(() => validateSlot({ ...slot, weekday })).toThrow(
      expect.objectContaining({ code: 'WEEKDAY_INVALID' }),
    );
  });

  it.each(['24:00', '9:00', '14:60', '14h00', ''])('EX-07 refuse l’heure %j', (startTime) => {
    expect(() => validateSlot({ ...slot, startTime })).toThrow(
      expect.objectContaining({ code: 'TIME_INVALID' }),
    );
  });

  it.each([0, 1441, 30.5, Number.NaN])('EX-07 refuse la durée %p', (durationMin) => {
    expect(() => validateSlot({ ...slot, durationMin })).toThrow(
      expect.objectContaining({ code: 'DURATION_INVALID' }),
    );
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'EX-07 refuse le groupe %p (aucun groupe choisi)',
    (groupId) => {
      expect(() => validateSlot({ ...slot, groupId })).toThrow(
        expect.objectContaining({ code: 'GROUP_REQUIRED' }),
      );
    },
  );

  it('EX-07 ne garde que les champs du créneau', () => {
    expect(Object.keys(validateSlot({ ...slot, extra: 1 } as typeof slot)).sort()).toEqual([
      'durationMin',
      'groupId',
      'name',
      'place',
      'startTime',
      'weekday',
    ]);
  });

  it('EX-07 durées limites : 1 min et 24 h', () => {
    expect(validateSlot({ ...slot, durationMin: 1 }).durationMin).toBe(1);
    expect(validateSlot({ ...slot, durationMin: 1440 }).durationMin).toBe(1440);
  });
});

describe('EX-15 appel à enregistrer', () => {
  const call = {
    slotId: 3,
    groupId: 2,
    date: '2026-12-02',
    startTime: '17:30',
    statuses: [
      { memberId: 1, status: 'present' as const },
      { memberId: 2, status: 'absent' as const },
    ],
    comment: '  Gymnase fermé, séance au dojo  ',
  };

  it('EX-13 EX-15 accepte un appel ; commentaire nettoyé, vide → aucun', () => {
    expect(validateRollCall(call)).toEqual({ ...call, comment: 'Gymnase fermé, séance au dojo' });
    expect(validateRollCall({ ...call, comment: '   ', slotId: null }).comment).toBeNull();
  });

  it('EX-13 commentaire de 500 caractères au plus (décision du porteur du 2026-11-27)', () => {
    expect(validateRollCall({ ...call, comment: 'a'.repeat(500) }).comment).toHaveLength(500);
    expect(() => validateRollCall({ ...call, comment: 'a'.repeat(501) })).toThrow(
      expect.objectContaining({ code: 'COMMENT_TOO_LONG' }),
    );
  });

  it('EX-10 refuse un statut inconnu ou un membre en double', () => {
    expect(() =>
      validateRollCall({
        ...call,
        statuses: [{ memberId: 1, status: 'unknown' as unknown as 'present' }],
      }),
    ).toThrow(expect.objectContaining({ code: 'STATUS_INVALID' }));
    expect(() =>
      validateRollCall({
        ...call,
        statuses: [
          { memberId: 1, status: 'present' },
          { memberId: 1, status: 'absent' },
        ],
      }),
    ).toThrow(expect.objectContaining({ code: 'STATUS_INVALID' }));
  });

  it('EX-15 refuse un créneau ou un membre sans identifiant entier positif', () => {
    for (const slotId of [0, -1, 1.5, Number.NaN]) {
      expect(() => validateRollCall({ ...call, slotId })).toThrow(
        expect.objectContaining({ code: 'SLOT_INVALID' }),
      );
    }
    for (const memberId of [0, Number.NaN]) {
      expect(() =>
        validateRollCall({ ...call, statuses: [{ memberId, status: 'present' }] }),
      ).toThrow(expect.objectContaining({ code: 'STATUS_INVALID' }));
    }
  });

  it('EX-13 la limite compte les caractères vus, pas les unités UTF-16', () => {
    expect(validateRollCall({ ...call, comment: '⚽'.repeat(300) }).comment).toBe('⚽'.repeat(300));
  });

  it('refuse une date, une heure ou un groupe invalides (RM-04)', () => {
    expect(() => validateRollCall({ ...call, date: '02/12/2026' })).toThrow(
      expect.objectContaining({ code: 'DATE_INVALID' }),
    );
    expect(() => validateRollCall({ ...call, startTime: '9:00' })).toThrow(
      expect.objectContaining({ code: 'TIME_INVALID' }),
    );
    expect(() => validateRollCall({ ...call, groupId: 0 })).toThrow(
      expect.objectContaining({ code: 'GROUP_REQUIRED' }),
    );
  });
});
