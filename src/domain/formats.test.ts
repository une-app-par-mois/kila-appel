import {
  isIsoDate,
  parseDisplayDate,
  previousDay,
  startInSeason,
  toDisplayDate,
  toIsoDate,
  toLocalTime,
} from '@/domain/formats';

describe('RM-04 : dates stockées en AAAA-MM-JJ, affichées en JJ/MM/AAAA', () => {
  describe('isIsoDate', () => {
    it.each(['2026-11-26', '2028-02-29', '2000-02-29', '2026-12-31', '2026-01-01'])(
      'RM-04 accepte la date stockée %s',
      (iso) => {
        expect(isIsoDate(iso)).toBe(true);
      },
    );

    it.each([
      ['29 février d’une année non bissextile', '2027-02-29'],
      ['29 février d’un siècle non bissextile', '1900-02-29'],
      ['31 avril', '2026-04-31'],
      ['mois 13', '2026-13-01'],
      ['mois 0', '2026-00-10'],
      ['jour 0', '2026-05-00'],
      ['format d’affichage', '26/11/2026'],
      ['chiffres manquants', '2026-1-5'],
      ['espaces autour', ' 2026-11-26 '],
      ['date et heure', '2026-11-26T10:00'],
      ['texte vide', ''],
    ])('RM-04 refuse %s (%s)', (_cas, iso) => {
      expect(isIsoDate(iso)).toBe(false);
    });

    it('RM-04 accepte les bornes 1900-01-01 et 2100-12-31', () => {
      expect(isIsoDate('1900-01-01')).toBe(true);
      expect(isIsoDate('2100-12-31')).toBe(true);
    });

    it.each(['1899-12-31', '2101-01-01', '0000-02-29', '0202-05-12'])(
      'RM-04 refuse une année hors de 1900 à 2100 (%s)',
      (iso) => {
        expect(isIsoDate(iso)).toBe(false);
      },
    );
  });

  describe('toDisplayDate', () => {
    it('RM-04 affiche une date stockée en JJ/MM/AAAA', () => {
      expect(toDisplayDate('2026-11-26')).toBe('26/11/2026');
      expect(toDisplayDate('2028-02-29')).toBe('29/02/2028');
      expect(toDisplayDate('2027-01-05')).toBe('05/01/2027');
    });

    it('RM-04 lève une erreur sur une date stockée invalide', () => {
      expect(() => toDisplayDate('2027-02-29')).toThrow();
    });

    it('ABS-04 le message d’erreur ne contient pas la date reçue', () => {
      // La date peut être une date de naissance : elle ne sort jamais de l'écran.
      expect(() => toDisplayDate('2027-02-29')).toThrow(/^(?!.*2027).*$/);
    });
  });

  describe('parseDisplayDate', () => {
    it('RM-04 convertit une saisie JJ/MM/AAAA en date stockée', () => {
      expect(parseDisplayDate('26/11/2026')).toBe('2026-11-26');
      expect(parseDisplayDate('29/02/2028')).toBe('2028-02-29');
      expect(parseDisplayDate('05/01/2027')).toBe('2027-01-05');
    });

    it('RM-04 tolère les espaces autour de la saisie', () => {
      expect(parseDisplayDate('  26/11/2026 ')).toBe('2026-11-26');
    });

    it.each([
      ['29 février d’une année non bissextile', '29/02/2027'],
      ['31 avril', '31/04/2026'],
      ['mois 13', '01/13/2026'],
      ['jour 0', '00/05/2026'],
      ['jour et mois sans zéro', '5/1/2027'],
      ['année sur deux chiffres', '26/11/26'],
      ['format stocké', '2026-11-26'],
      ['autre séparateur', '26-11-2026'],
      ['lettres', 'aa/bb/cccc'],
      ['texte vide', ''],
      ['année hors bornes', '01/01/0001'],
    ])('RM-04 refuse la saisie : %s (%s)', (_cas, saisie) => {
      expect(parseDisplayDate(saisie)).toBeNull();
    });

    it('RM-04 aller-retour : afficher puis relire redonne la date stockée', () => {
      expect(parseDisplayDate(toDisplayDate('2026-07-31'))).toBe('2026-07-31');
    });
  });

  describe('toIsoDate', () => {
    it('RM-04 date locale du jour (pas UTC), sur deux chiffres', () => {
      // 1er mars 2026 à 0 h 30, heure locale : la date reste le 1er mars quel que soit le fuseau.
      expect(toIsoDate(new Date(2026, 2, 1, 0, 30))).toBe('2026-03-01');
      expect(toIsoDate(new Date(2026, 10, 26, 23, 59))).toBe('2026-11-26');
    });
  });
});

describe('previousDay : dernier jour d’une inscription dont la fin est exclue (EX-04)', () => {
  it('recule d’un jour, à travers mois, années et 29 février', () => {
    expect(previousDay('2026-12-01')).toBe('2026-11-30');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
    expect(previousDay('2026-03-30')).toBe('2026-03-29');
  });

  it('refuse une date mal écrite (RM-04)', () => {
    expect(() => previousDay('01/12/2026')).toThrow();
  });

  describe('EX-04 date de début proposée : aujourd’hui, ramené dans la saison', () => {
    const season = { startDate: '2026-09-01', endDate: '2027-07-31' };
    it.each([
      ['2026-11-26', '2026-11-26'],
      ['2026-07-15', '2026-09-01'],
      ['2027-08-10', '2027-07-31'],
      ['2027-07-31', '2027-07-31'],
    ])('EX-04 le %s donne %s', (today, expected) => {
      expect(startInSeason(today, season)).toBe(expected);
    });
    it('sans saison active : aujourd’hui', () => {
      expect(startInSeason('2026-11-26', null)).toBe('2026-11-26');
    });
  });
});

describe('EX-09 heure locale', () => {
  it('écrit l’heure locale en HH:MM', () => {
    expect(toLocalTime(new Date(2026, 10, 18, 9, 5))).toBe('09:05');
    expect(toLocalTime(new Date(2026, 10, 18, 23, 59))).toBe('23:59');
  });
});
