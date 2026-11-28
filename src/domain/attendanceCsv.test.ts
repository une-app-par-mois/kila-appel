// Contenu du CSV des présences (ticket 036, F-08, EX-31, RM-04, SEC-07, EX-39). Données fictives.
import { labels } from '@/config/libelles';
import { type AttendanceCsvLabels, attendanceCsv, type ExportRow } from '@/domain/attendanceCsv';

const L: AttendanceCsvLabels = {
  ...labels.stats.csv,
  statuses: labels.statuses,
  weekdays: labels.weekdays,
};
const HEAD = '\uFEFFDate;Créneau;Groupe;Nom;Prénom;Statut\r\n';

const row = (over: Partial<ExportRow> = {}): ExportRow => ({
  date: '2026-11-25',
  startTime: '17:30',
  hasSlot: true,
  slotName: 'Poussins mercredi',
  groups: ['Poussins'],
  lastName: 'Blanc',
  firstName: 'Zoé',
  status: 'present',
  ...over,
});

describe('attendanceCsv (EX-31)', () => {
  it('EX-31 en-tête accentué et une ligne : date JJ/MM/AAAA (RM-04), statut en toutes lettres', () => {
    expect(attendanceCsv([row()], L)).toBe(
      `${HEAD}25/11/2026;Poussins mercredi;Poussins;Blanc;Zoé;Présent\r\n`,
    );
  });

  it('EX-31 période vide : en-tête seul', () => {
    expect(attendanceCsv([], L)).toBe(HEAD);
  });

  it('EX-31 les quatre statuts en toutes lettres', () => {
    const csv = attendanceCsv(
      (['present', 'late', 'excused', 'absent'] as const).map((status) => row({ status })),
      L,
    );
    expect(csv.split('\r\n').map((line) => line.split(';')[5])).toEqual([
      'Statut',
      'Présent',
      'Retard',
      'Excusé',
      'Absent',
      undefined,
    ]);
  });

  it('EX-31 créneau sans nom : jour de la date de la séance et heure de la séance', () => {
    const csv = attendanceCsv([row({ slotName: null }), row({ slotName: '  ' })], L);
    expect(csv).toBe(
      `${HEAD}25/11/2026;Mercredi 17:30;Poussins;Blanc;Zoé;Présent\r\n` +
        `25/11/2026;Mercredi 17:30;Poussins;Blanc;Zoé;Présent\r\n`,
    );
  });

  it('EX-31 EX-39 séance sans créneau (créneau supprimé ou appel sans créneau) : « Sans créneau » et l’heure', () => {
    const csv = attendanceCsv(
      [row({ hasSlot: false, slotName: null, date: '2026-11-29', startTime: '18:00' })],
      L,
    );
    expect(csv).toBe(`${HEAD}29/11/2026;Sans créneau 18:00;Poussins;Blanc;Zoé;Présent\r\n`);
  });

  it('EX-31 RM-03 présence qui compte pour deux groupes : une seule ligne, « A, B »', () => {
    const csv = attendanceCsv([row({ groups: ['Benjamins', 'Vétérans'] })], L);
    expect(csv).toBe(
      `${HEAD}25/11/2026;Poussins mercredi;"Benjamins, Vétérans";Blanc;Zoé;Présent\r\n`,
    );
  });

  it('EX-31 présence qui ne compte pour aucun groupe : « Sans groupe »', () => {
    const csv = attendanceCsv([row({ groups: [] })], L);
    expect(csv).toBe(`${HEAD}25/11/2026;Poussins mercredi;Sans groupe;Blanc;Zoé;Présent\r\n`);
  });

  it('SEC-07 nom, prénom, groupe et créneau neutralisés ; « ; » et « " » entourés', () => {
    const csv = attendanceCsv(
      [
        row({
          slotName: '+Créneau',
          groups: ['=Groupe', 'B'],
          lastName: '-Marie',
          firstName: '@SOMME',
        }),
        row({ lastName: 'Dupont;Martin', firstName: 'Zoé "Zaza"', groups: ["O'Brien"] }),
        row({ lastName: 'Marie-Ève', firstName: '\tTab' }),
      ],
      L,
    );
    expect(csv).toBe(
      `${HEAD}25/11/2026;'+Créneau;"'=Groupe, B";'-Marie;'@SOMME;Présent\r\n` +
        `25/11/2026;Poussins mercredi;O'Brien;"Dupont;Martin";"Zoé ""Zaza""";Présent\r\n` +
        `25/11/2026;Poussins mercredi;Poussins;Marie-Ève;"'\tTab";Présent\r\n`,
    );
  });

  it('ABS-04 date stockée invalide : erreur sans aucun nom', () => {
    const thrown = (() => {
      try {
        attendanceCsv([row({ date: '2026-13-01', lastName: 'Blanc', firstName: 'Zoé' })], L);
        return null;
      } catch (error) {
        return error;
      }
    })();
    expect(String(thrown)).toMatch('Date stockée invalide (RM-04)');
    expect(String(thrown)).not.toMatch(/Blanc|Zoé|2026-13-01/);
  });

  it('ABS-04 libellé du jour manquant : erreur sans aucun nom', () => {
    const broken = { ...L, weekdays: [] as unknown as AttendanceCsvLabels['weekdays'] };
    expect(() => attendanceCsv([row({ slotName: null, lastName: 'Blanc' })], broken)).toThrow(
      /^Libellé du jour manquant$/,
    );
  });
});
