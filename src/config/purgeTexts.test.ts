/**
 * @jest-environment node
 */
// Textes de la conservation et de la purge (ticket 015b, EX-24), au caractère près : réponse du
// porteur du 2026-11-27 pour la confirmation chiffrée.
import { labels, type PurgeCounts } from '@/config/libelles';

const k = labels.retention;
const p = labels.purge;
const message = (names: string[], c: PurgeCounts) =>
  `${p.messageBefore}${p.messageStrong}${p.messageAfter(names, c)}`;
const counts = (c: Partial<PurgeCounts>): PurgeCounts => ({
  groups: 0,
  slots: 0,
  sessions: 0,
  attendances: 0,
  members: 0,
  rollCallDraft: false,
  ...c,
});

describe('EX-24 textes de la purge', () => {
  it('confirmation du porteur, au caractère près', () => {
    const c = counts({ groups: 3, slots: 2, sessions: 31, attendances: 412, members: 12 });
    expect(message(['2023-2024'], c)).toBe(
      'Seront effacés définitivement : la saison 2023-2024, ses 3 groupes, 2 créneaux, 31 séances et 412 présences.',
    );
    expect(p.note(c)).toBe(
      '12 membres qui ne figurent plus dans aucune saison conservée seront aussi effacés.',
    );
    expect(p.note({ ...c, rollCallDraft: true })).toBe(
      '12 membres qui ne figurent plus dans aucune saison conservée seront aussi effacés.\nL’appel en cours sera aussi effacé.',
    );
    expect(p.title(['2023-2024'])).toBe('Purger 2023-2024 ?');
  });

  it('plusieurs saisons, comptes nuls omis, un seul membre ou aucun', () => {
    expect(message(['2022-2023', '2023-2024'], counts({ groups: 5, attendances: 1 }))).toBe(
      'Seront effacés définitivement : les saisons 2022-2023 et 2023-2024, leurs 5 groupes et leur présence.',
    );
    expect(message(['2023-2024'], counts({}))).toBe(
      'Seront effacés définitivement : la saison 2023-2024.',
    );
    expect(p.title(['2022-2023', '2023-2024'])).toBe('Purger 2 saisons ?');
    expect(p.note(counts({ members: 1 }))).toBe(
      '1 membre qui ne figure plus dans aucune saison conservée sera aussi effacé.',
    );
    expect(p.note(counts({}))).toBe('Aucun membre ne sera effacé.');
    expect(p.failed).toBe('La purge n’a pas abouti. Rien n’a été effacé.');
  });

  it('section Conservation et ligne de Paramètres', () => {
    expect(k.none).toBe('Aucune saison ne dépasse cette durée.');
    expect(k.over(['2023-2024'])).toBe('1 saison dépasse cette durée : 2023-2024.');
    expect(k.over(['2022-2023', '2023-2024'])).toBe(
      '2 saisons dépassent cette durée : 2022-2023, 2023-2024.',
    );
    expect(k.purge(['2023-2024'])).toBe('Purger 2023-2024…');
    expect(k.purge(['2022-2023', '2023-2024'])).toBe('Purger 2 saisons…');
    expect(k.settingsRow(3)).toBe('3 saisons');
    expect(k.settingsRow(1)).toBe('1 saison');
  });
});

// Ticket 020, réponses du porteur du 2026-11-27 : possessif accordé à chaque compte de 1, sans
// chiffre ; une suite d'éléments au pluriel garde un seul « ses » (ou « leurs ») en tête.
describe('EX-24 accords au singulier (ticket 020)', () => {
  const one = ['2023-2024'];
  const two = ['2022-2023', '2023-2024'];

  it('une saison : son, sa, et « ses » devant une suite au pluriel', () => {
    expect(message(one, counts({ groups: 1, slots: 1, sessions: 1, attendances: 3 }))).toBe(
      'Seront effacés définitivement : la saison 2023-2024, son groupe, son créneau, sa séance et ses 3 présences.',
    );
    expect(message(one, counts({ groups: 2, slots: 1, sessions: 3, attendances: 4 }))).toBe(
      'Seront effacés définitivement : la saison 2023-2024, ses 2 groupes, son créneau, ses 3 séances et 4 présences.',
    );
    expect(message(one, counts({ attendances: 1 }))).toBe(
      'Seront effacés définitivement : la saison 2023-2024, sa présence.',
    );
    expect(message(one, counts({ slots: 2 }))).toBe(
      'Seront effacés définitivement : la saison 2023-2024, ses 2 créneaux.',
    );
  });

  it('plusieurs saisons : « leur » au compte de 1, « leurs » devant une suite au pluriel', () => {
    expect(message(two, counts({ groups: 5, attendances: 1 }))).toBe(
      'Seront effacés définitivement : les saisons 2022-2023 et 2023-2024, leurs 5 groupes et leur présence.',
    );
    expect(message(two, counts({ groups: 1, slots: 1, sessions: 2, attendances: 2 }))).toBe(
      'Seront effacés définitivement : les saisons 2022-2023 et 2023-2024, leur groupe, leur créneau, leurs 2 séances et 2 présences.',
    );
    expect(message(two, counts({}))).toBe(
      'Seront effacés définitivement : les saisons 2022-2023 et 2023-2024.',
    );
  });

  // Chaque combinaison de comptes 0, 1 et 2 : aucune virgule ni aucun possessif orphelin.
  const items = [
    ['groups', 'groupe', 'groupes', 'son'],
    ['slots', 'créneau', 'créneaux', 'son'],
    ['sessions', 'séance', 'séances', 'sa'],
    ['attendances', 'présence', 'présences', 'sa'],
  ] as const;
  const combos: number[][] = [];
  for (let i = 0; i < 81; i += 1) combos.push([0, 1, 2, 3].map((d) => Math.floor(i / 3 ** d) % 3));

  it.each([
    ['une saison', one],
    ['deux saisons', two],
  ])('%s : toutes les combinaisons de comptes 0, 1 et 2', (_label, names) => {
    const several = names.length > 1;
    for (const values of combos) {
      const c = counts(Object.fromEntries(items.map(([key], i) => [key, values[i]])));
      const text = p.messageAfter(names, c);
      expect(text).not.toMatch(/,\s*[,.]|\bet\s*[,.]|\s{2}|\bet et\b/);
      expect(text).not.toMatch(/\b(son|sa|ses|leur|leurs)\s*[,.]/);
      expect(text).not.toMatch(/\b(ses|leurs) 1\b|\b1 (groupe|créneau|séance|présence)\b/);
      expect(text).not.toMatch(several ? /\b(son|sa|ses)\b/ : /\b(leur|leurs)\b/);
      expect(text.endsWith('.')).toBe(true);
      let previousPlural = false;
      let possessives = 0;
      items.forEach(([, single, many, gender], i) => {
        const n = values[i] ?? 0;
        if (n === 1) {
          expect(text).toContain(`${several ? 'leur' : gender} ${single}`);
          possessives += 1;
        }
        if (n === 2) {
          expect(text).toContain(`2 ${many}`);
          if (!previousPlural) possessives += 1;
        }
        if (n > 0) previousPlural = n > 1;
      });
      expect(text.match(/\b(son|sa|ses|leur|leurs)\b/g)?.length ?? 0).toBe(possessives);
    }
  });

  it('conservation : « Garder la dernière saison » pour 1, inchangée pour 2 et 3', () => {
    expect(`${k.keepBefore(1)} ${k.keepAfter(1)}`).toBe('Garder la dernière saison');
    expect(k.accessibility(1)).toBe('Garder la dernière saison');
    expect(`${k.keepBefore(2)} 2 ${k.keepAfter(2)}`).toBe('Garder les 2 dernières saisons');
    expect(k.accessibility(2)).toBe('Garder les 2 dernières saisons');
    expect(k.accessibility(3)).toBe('Garder les 3 dernières saisons');
    expect(k.choice(1)).toBe('1 saison');
  });
});
