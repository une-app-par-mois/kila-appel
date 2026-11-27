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
      'Seront effacés définitivement : les saisons 2022-2023 et 2023-2024, leurs 5 groupes et 1 présence.',
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
