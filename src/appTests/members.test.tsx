// Écrans des membres (ticket 007b, EX-03), sur une vraie base node:sqlite et le jeu fictif (SEC-13).
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import Member from '@/app/membres/[id]';
import Members from '@/app/membres/index';
import NewMember from '@/app/membres/nouveau';
import { tabRoutes } from '@/appTests/tabRoutes';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { notifyDataChanged } from '@/hooks/dataChanged';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = {
  ...tabRoutes,
  'membres/index': Members,
  'membres/nouveau': NewMember,
  'membres/[id]': Member,
};
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const t = labels;
const button = (name: string | RegExp) => screen.findByRole('button', { name });

describe('Écrans des membres (EX-03)', () => {
  let db: Db;
  let s: Seeded;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    mockDb = db;
  });
  afterEach(async () => {
    mockDb = null;
    await db.close();
  });

  it('Paramètres › Membres : nombre de membres, puis la liste avec leurs groupes', async () => {
    const router = await open('/parametres');
    await fireEvent.press(await button(`${t.settings.members}, ${t.settings.memberCount(2)}`));
    expect(router.getPathname()).toBe('/membres');
    expect(await button(`Alix Exemple, Poussins`)).toBeTruthy();
    expect(await button(`Sam Fictif, Poussins`)).toBeTruthy();
  });

  it('P1 NF-06 recherche sans accents ni casse ; sans résultat, la carte de la maquette', async () => {
    await open('/membres');
    await button(/Alix Exemple/);
    await fireEvent.changeText(screen.getByLabelText(t.members.search), 'FICT');
    expect(screen.queryByRole('button', { name: /Alix Exemple/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Sam Fictif/ })).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(t.members.search), 'xyz');
    expect(await screen.findByText(t.members.noMatch('xyz'))).toBeTruthy();
    expect(screen.getByText(t.members.noMatchHint)).toBeTruthy();
  });

  it('P1 NF-06 aucun membre : la carte « Aucun membre pour l’instant » et « Nouveau membre »', async () => {
    await db.execute('DELETE FROM members');
    const router = await open('/membres');
    expect(await screen.findByText(t.members.empty)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: t.members.create })).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: t.members.create }));
    expect(router.getPathname()).toBe('/membres/nouveau');
  });

  it('filtre par groupe (la puce ouvre la liste) et bascule sur les archivés', async () => {
    await db.execute("INSERT INTO members (first_name, last_name) VALUES ('Mila', 'Fournier')");
    await db.execute(
      "INSERT INTO members (first_name, last_name, archived_at) VALUES ('Zoé', 'Blanc', '2026-11-01')",
    );
    await open('/membres');
    expect(await button(`Mila Fournier, ${t.members.noGroup}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.members.allGroups }));
    await fireEvent.press(await button('Poussins'));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Mila Fournier/ })).toBeNull());
    expect(screen.getByRole('button', { name: 'Poussins' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Poussins' }));
    await fireEvent.press(await button(t.members.allGroups));
    await fireEvent.press(await button(t.members.archived(1)));
    expect(await button(/Zoé Blanc/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Mila Fournier/ })).toBeNull();
  });

  it('EX-03 crée un membre (date de naissance dite facultative, groupe facultatif), puis sa fiche', async () => {
    const router = await open('/membres');
    await fireEvent.press(await button(t.members.create));
    expect(await screen.findByText(t.memberForm.optionalFeminine)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(t.memberForm.firstName), ' Yanis ');
    await fireEvent.changeText(screen.getByLabelText(t.memberForm.lastName), 'Colin');
    await fireEvent.changeText(screen.getByLabelText(t.memberForm.birthDate), '14/03/2017');
    await fireEvent.press(
      screen.getByRole('button', { name: `${t.memberForm.group}, ${t.memberForm.noGroup}` }),
    );
    await fireEvent.press(await button('Poussins'));
    await fireEvent.press(screen.getByRole('button', { name: t.memberForm.create }));
    await waitFor(() => expect(router.getPathname()).toMatch(/^\/membres\/\d+$/));
    expect(await screen.findByRole('header', { name: 'Yanis Colin' })).toBeTruthy();
    const [row] = await db.query<{ id: number; birth_date: string }>(
      "SELECT id, birth_date FROM members WHERE first_name = 'Yanis'",
    );
    expect(row?.birth_date).toBe('2017-03-14');
    expect(
      await count(db, 'enrollments', 'member_id = ? AND group_id = ?', [row?.id ?? 0, s.groupId]),
    ).toBe(1);
  });

  it('création refusée : erreurs sous les champs, rien d’écrit', async () => {
    await open('/membres/nouveau');
    await fireEvent.changeText(await screen.findByLabelText(t.memberForm.lastName), 'Colin');
    await fireEvent.changeText(screen.getByLabelText(t.memberForm.birthDate), '31/02/2017');
    await fireEvent.press(screen.getByRole('button', { name: t.memberForm.create }));
    expect(await screen.findByText(t.errors.NAME_REQUIRED)).toBeTruthy();
    expect(screen.getByText(t.errors.DATE_INVALID)).toBeTruthy();
    expect(await count(db, 'members')).toBe(2);
  });

  it('fiche : un champ s’enregistre en le quittant ; une saisie invalide n’est pas enregistrée', async () => {
    await open(`/membres/${s.memberId}`);
    const lastName = await screen.findByLabelText(t.memberForm.lastName);
    await fireEvent.changeText(lastName, 'Exemple-Test');
    await fireEvent(lastName, 'blur');
    await waitFor(async () =>
      expect(await count(db, 'members', "last_name = 'Exemple-Test'")).toBe(1),
    );
    const birth = screen.getByLabelText(t.memberForm.birthDate);
    expect(birth.props.value).toBe('14/03/2015');
    await fireEvent.changeText(birth, '01/01/2099');
    await fireEvent(birth, 'blur');
    expect(await screen.findByText(t.errors.DATE_IN_FUTURE)).toBeTruthy();
    expect(await count(db, 'members', "birth_date = '2015-03-14'")).toBe(1);
    // Vider la date de naissance l'efface (elle est facultative).
    await fireEvent.changeText(birth, '');
    await fireEvent(birth, 'blur');
    await waitFor(async () =>
      expect(await count(db, 'members', 'birth_date IS NULL AND id = ?', [s.memberId])).toBe(1),
    );
  });

  it('archive puis désarchive depuis la fiche', async () => {
    await open(`/membres/${s.memberId}`);
    await fireEvent.press(await button(t.memberForm.archive));
    await button(t.memberForm.unarchive);
    expect(await count(db, 'members', 'archived_at IS NOT NULL AND id = ?', [s.memberId])).toBe(1);
    await fireEvent.press(screen.getByRole('button', { name: t.memberForm.unarchive }));
    await button(t.memberForm.archive);
    expect(await count(db, 'members', 'archived_at IS NULL AND id = ?', [s.memberId])).toBe(1);
  });

  it('ABS-05 suppression : la confirmation dit ce qui sera effacé, puis tout est effacé', async () => {
    const router = await open('/membres');
    await fireEvent.press(await button(/Alix Exemple/));
    await fireEvent.press(await button(t.memberForm.delete));
    expect(
      await screen.findByText(
        t.memberDeletion.message({
          contacts: 1,
          attendances: 1,
          enrollments: 2,
          rollCallDraft: true,
          hasBirthDate: true,
        }),
      ),
    ).toBeTruthy();
    expect(screen.getByText(t.memberDeletion.kept)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.common.deleteForever }));
    await waitFor(() => expect(router.getPathname()).toBe('/membres'));
    expect(await count(db, 'members', 'id = ?', [s.memberId])).toBe(0);
    expect(await count(db, 'attendances', 'member_id = ?', [s.memberId])).toBe(0);
    expect(await count(db, 'emergency_contacts', 'member_id = ?', [s.memberId])).toBe(0);
  });

  it('message de suppression : inscriptions citées, date de naissance seulement si elle existe', () => {
    expect(
      t.memberDeletion.message({
        contacts: 2,
        attendances: 41,
        enrollments: 2,
        rollCallDraft: true,
        hasBirthDate: true,
      }),
    ).toBe(
      'Seront effacés définitivement : sa fiche et sa date de naissance ; ses 2 contacts d’urgence ; ses 41 présences ; ses 2 inscriptions ; son statut dans l’appel en cours.',
    );
    expect(
      t.memberDeletion.message({
        contacts: 0,
        attendances: 0,
        enrollments: 1,
        rollCallDraft: false,
        hasBirthDate: false,
      }),
    ).toBe('Seront effacés définitivement : sa fiche ; son inscription.');
  });

  it('suppression déjà faite ailleurs (introuvable) : retour à la liste', async () => {
    const router = await open('/membres');
    await fireEvent.press(await button(/Alix Exemple/));
    await fireEvent.press(await button(t.memberForm.delete));
    await db.execute('DELETE FROM members WHERE id = ?', [s.memberId]);
    await fireEvent.press(await button(t.common.deleteForever));
    await waitFor(() => expect(router.getPathname()).toBe('/membres'));
  });

  it('fiche : deux champs quittés l’un après l’autre sont tous deux enregistrés, nettoyés à l’écran', async () => {
    await open(`/membres/${s.memberId}`);
    const first = await screen.findByLabelText(t.memberForm.firstName);
    const last = screen.getByLabelText(t.memberForm.lastName);
    await fireEvent.changeText(first, ' Léa ');
    await fireEvent(first, 'blur');
    await fireEvent.changeText(last, 'Exemple-Test');
    await fireEvent(last, 'blur');
    await waitFor(async () =>
      expect(await count(db, 'members', "first_name = 'Léa' AND last_name = 'Exemple-Test'")).toBe(
        1,
      ),
    );
    await waitFor(() =>
      expect(screen.getByLabelText(t.memberForm.firstName).props.value).toBe('Léa'),
    );
  });

  it('fiche : une saisie non quittée est enregistrée en quittant l’écran', async () => {
    const router = await open('/membres');
    await fireEvent.press(await button(/Alix Exemple/));
    await fireEvent.changeText(
      await screen.findByLabelText(t.memberForm.lastName),
      'Exemple-Retour',
    );
    await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
    await waitFor(() => expect(router.getPathname()).toBe('/membres'));
    await waitFor(async () =>
      expect(await count(db, 'members', "last_name = 'Exemple-Retour'")).toBe(1),
    );
  });

  it('archivés : le filtre de groupe ne s’applique pas ; un groupe disparu remet « Tous les groupes »', async () => {
    await db.execute(
      "INSERT INTO members (first_name, last_name, archived_at) VALUES ('Zoé', 'Blanc', '2026-11-01')",
    );
    await open('/membres');
    await fireEvent.press(await button(t.members.allGroups));
    await fireEvent.press(await button('Poussins'));
    await fireEvent.press(await button(t.members.archived(1)));
    expect(await button(/Zoé Blanc/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.members.archived(1) }));
    await db.execute('UPDATE groups SET archived_at = ? WHERE id = ?', ['2026-11-26', s.groupId]);
    notifyDataChanged();
    expect(await button(t.members.allGroups)).toBeTruthy();
    expect(await button(/Alix Exemple/)).toBeTruthy();
  });

  it('P1 un groupe filtré sans membre : « aucun membre dans ce groupe », pas « aucun membre »', async () => {
    await db.execute('UPDATE enrollments SET end_date = ? WHERE group_id = ?', [
      '2026-09-01',
      s.groupId,
    ]);
    await open('/membres');
    await fireEvent.press(await button(t.members.allGroups));
    await fireEvent.press(await button('Poussins'));
    expect(await screen.findByText(t.members.noMatchGroup)).toBeTruthy();
    expect(screen.queryByText(t.members.empty)).toBeNull();
  });

  it('« Garder » ferme la confirmation sans rien effacer', async () => {
    await open(`/membres/${s.memberId}`);
    await fireEvent.press(await button(t.memberForm.delete));
    await fireEvent.press(await button(t.common.keep));
    expect(await count(db, 'members', 'id = ?', [s.memberId])).toBe(1);
  });

  it.each(['999', 'abc'])('une fiche introuvable (%s) le dit', async (id) => {
    await open(`/membres/${id}`);
    expect(await screen.findByText(t.errors.NOT_FOUND)).toBeTruthy();
  });
});
