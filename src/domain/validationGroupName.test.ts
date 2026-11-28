// SEC-06 (ticket 044) : un nom de groupe suit la liste des caractères invisibles des noms de membre.
import { InputError, validateGroupName } from '@/domain/validation';

describe('validateGroupName (SEC-06, ticket 044)', () => {
  it('SEC-06 garde un nom nettoyé, comme validateName', () => {
    expect(validateGroupName('  Poussins mercredi ')).toBe('Poussins mercredi');
  });

  it.each(['', '   ', '\t\n'])('EX-02 refuse un nom vide (%j) : NAME_REQUIRED', (name) => {
    expect(() => validateGroupName(name)).toThrow(
      expect.objectContaining({ code: 'NAME_REQUIRED' }),
    );
  });

  // Même liste que les noms de membre (isInvisible) : contrôle, sens d'affichage, U+200B, U+FEFF…
  it.each([
    0x00, 0x09, 0x0a, 0x1f, 0x7f, 0x9f, 0x2028, 0x2029, 0x202a, 0x202e, 0x2066, 0x2069, 0x061c,
    0x200b, 0x200e, 0x200f, 0xfeff, 0xd800, 0xdfff,
  ])('SEC-06 refuse le caractère invisible de code %i (NAME_INVALID_CHAR)', (code) => {
    const name = `Pous${String.fromCodePoint(code)}sins`;
    expect(() => validateGroupName(name)).toThrow(InputError);
    expect(() => validateGroupName(name)).toThrow(
      expect.objectContaining({ code: 'NAME_INVALID_CHAR' }),
    );
  });

  it('SEC-06 accepte U+200D dans un émoji composé', () => {
    const team = `Poussins ${String.fromCodePoint(0x1f469, 0x200d, 0x1f467)}`;
    expect(validateGroupName(team)).toBe(team);
  });

  it('SEC-06 pas de longueur maximale pour un nom de groupe (D6)', () => {
    expect(validateGroupName('x'.repeat(150))).toHaveLength(150);
  });

  it('ABS-04 l’erreur ne porte que le code, jamais le nom saisi', () => {
    const name = `Benjamins${String.fromCodePoint(0x202e)}lundi`;
    let caught: unknown;
    try {
      validateGroupName(name);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(InputError);
    const message = (caught as Error).message;
    expect(message).toBe('Saisie invalide : NAME_INVALID_CHAR');
    expect(message).not.toContain('Benjamins');
  });
});
