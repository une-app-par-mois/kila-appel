import { formatPhone, parsePhone } from '@/domain/phone';

describe('Téléphone d’un contact d’urgence : français seulement (EX-05, décision du 2026-11-26)', () => {
  it('accepte 10 chiffres commençant par 0, avec espaces, points ou tirets ; rend 10 chiffres', () => {
    expect(parsePhone('0600000001')).toBe('0600000001');
    expect(parsePhone(' 06 00 00 00 01 ')).toBe('0600000001');
    expect(parsePhone('01.23.45.67.89')).toBe('0123456789');
    expect(parsePhone('09-00-00-00-02')).toBe('0900000002');
  });

  it('accepte +33 suivi de 9 chiffres, rendu au format national', () => {
    expect(parsePhone('+33600000001')).toBe('0600000001');
    expect(parsePhone('+33 6 00 00 00 01')).toBe('0600000001');
  });

  it('refuse le reste : longueur, 00 en tête, autre pays, lettres, vide', () => {
    for (const input of [
      '',
      '060000000',
      '06000000011',
      '0060000000',
      '+3360000000',
      '+33060000000',
      '+32600000001',
      '0033600000001',
      '06 00 00 00 0a',
      '(06) 00 00 00 01',
    ]) {
      expect(parsePhone(input)).toBeNull();
    }
  });

  it('affiche par paires : 06 00 00 00 01', () => {
    expect(formatPhone('0600000001')).toBe('06 00 00 00 01');
  });

  it('un numéro stocké hors format (sauvegarde, import) s’affiche tel quel, sans erreur', () => {
    expect(formatPhone('+32 470 00 00 00')).toBe('+32 470 00 00 00');
    expect(formatPhone('06 00')).toBe('06 00');
  });
});
