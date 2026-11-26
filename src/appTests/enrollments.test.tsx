// Écrans des inscriptions (ticket 007c, EX-04), sur une vraie base node:sqlite et le jeu fictif.
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import GroupDetail from '@/app/groupes/[id]/index';
import Enroll from '@/app/groupes/[id]/inscrire';
import Member from '@/app/membres/[id]';
import NewMember from '@/app/membres/nouveau';
import { labels } from '@/config/libelles';
import type { Db } from '@/data/db';
import { openNodeDb } from '@/data/nodeDb';
import { prepareDatabase } from '@/data/open';
import { toDisplayDate, toIsoDate } from '@/domain/formats';

let mockDb: Db | null = null;
jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => mockDb }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = {
  'groupes/[id]/index': GroupDetail,
  'groupes/[id]/inscrire': Enroll,
  'membres/nouveau': NewMember,
  'membres/[id]': Member,
};
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const t = labels;
const button = (name: string | RegExp) => screen.findByRole('button', { name });
const TODAY = toIsoDate(new Date());

describe('Écrans des inscriptions (EX-04)', () => {
  let db: Db;
  let s: Seeded;
  let noah: number;
  beforeEach(async () => {
    db = await prepareDatabase(openNodeDb());
    s = await seed(db);
    noah = (
      await db.execute("INSERT INTO members (first_name, last_name) VALUES ('Noah', 'Girard')")
    ).lastInsertRowId;
    await db.execute("INSERT INTO members (first_name, last_name) VALUES ('Jade', 'Laurent')");
    mockDb = db;
  });
  afterEach(async () => {
    mockDb = null;
    await db.close();
  });

  it('fiche du groupe : nombre d’inscrits du jour, « Inscrit depuis le … », vers la fiche du membre', async () => {
    const router = await open(`/groupes/${s.groupId}`);
    expect(await screen.findByText(t.group.memberCount(2))).toBeTruthy();
    const since = t.group.period(toDisplayDate('2026-09-01'), null);
    await fireEvent.press(await button(`Alix Exemple, ${since}`));
    expect(router.getPathname()).toBe(`/membres/${s.memberId}`);
  });

  it('retrait prévu : « Jusqu’au » (veille de la fin) ; arrivée future : section « À venir »', async () => {
    await db.execute('UPDATE enrollments SET end_date = ? WHERE member_id = ? AND group_id = ?', [
      '2099-12-01',
      s.memberId,
      s.groupId,
    ]);
    await db.execute('INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)', [
      noah,
      s.groupId,
      '2099-01-05',
    ]);
    await open(`/groupes/${s.groupId}`);
    expect(
      await button(`Alix Exemple, ${t.group.period(toDisplayDate('2026-09-01'), '30/11/2099')}`),
    ).toBeTruthy();
    expect(screen.getByText(t.group.upcoming)).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: `Noah Girard, ${t.group.from(toDisplayDate('2099-01-05'))}`,
      }),
    ).toBeTruthy();
  });

  it('ajout : cases à cocher, date du jour par défaut, « Inscrire 2 membres »', async () => {
    const router = await open(`/groupes/${s.groupId}`);
    await fireEvent.press(await button(t.group.addMembers));
    expect(
      await screen.findByRole('header', { name: t.enrollment.title('Poussins') }),
    ).toBeTruthy();
    expect(screen.getByLabelText(t.enrollment.startDate).props.value).toBe(toDisplayDate(TODAY));
    expect(screen.queryByRole('checkbox', { name: /Alix Exemple/ })).toBeNull();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Noah Girard' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Jade Laurent' }));
    expect(
      screen.getByRole('checkbox', { name: 'Jade Laurent' }).props.accessibilityState,
    ).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByRole('button', { name: t.enrollment.submit(2) }));
    await waitFor(() => expect(router.getPathname()).toBe(`/groupes/${s.groupId}`));
    expect(
      await count(db, 'enrollments', 'group_id = ? AND start_date = ?', [s.groupId, TODAY]),
    ).toBe(2);
    expect(await screen.findByText(t.group.memberCount(4))).toBeTruthy();
  });

  it('ajout : rien de coché, bouton inactif ; date invalide refusée sous le champ', async () => {
    await open(`/groupes/${s.groupId}/inscrire`);
    const submit = await button(t.enrollment.submit(0));
    expect(submit.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Noah Girard' }));
    await fireEvent.changeText(screen.getByLabelText(t.enrollment.startDate), '31/02/2026');
    await fireEvent.press(screen.getByRole('button', { name: t.enrollment.submit(1) }));
    expect(await screen.findByText(t.errors.DATE_INVALID)).toBeTruthy();
    expect(await count(db, 'enrollments', 'member_id = ?', [noah])).toBe(0);
  });

  it('« Nouveau membre » depuis l’ajout : groupe préchoisi, date choisie, puis retour à l’ajout', async () => {
    const router = await open(`/groupes/${s.groupId}/inscrire`);
    await fireEvent.changeText(await screen.findByLabelText(t.enrollment.startDate), '05/01/2027');
    await fireEvent.press(await button(t.enrollment.newMember));
    expect(await button(`${t.memberForm.group}, Poussins`)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(t.memberForm.firstName), 'Yanis');
    await fireEvent.changeText(screen.getByLabelText(t.memberForm.lastName), 'Colin');
    await fireEvent.press(screen.getByRole('button', { name: t.memberForm.create }));
    await waitFor(() => expect(router.getPathname()).toBe(`/groupes/${s.groupId}/inscrire`));
    expect(
      await count(
        db,
        'enrollments',
        "group_id = ? AND start_date = ? AND member_id = (SELECT id FROM members WHERE first_name = 'Yanis')",
        [s.groupId, '2027-01-05'],
      ),
    ).toBe(1);
  });

  it('fiche du membre : ses groupes ; retrait à une date, présences conservées', async () => {
    await open(`/membres/${s.memberId}`);
    expect(
      await screen.findByText(t.memberGroups.period(toDisplayDate('2026-09-01'), null)),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: `${t.memberGroups.withdraw}, Poussins` }),
    );
    expect(
      await screen.findByRole('header', { name: t.withdrawal.title('Alix Exemple', 'Poussins') }),
    ).toBeTruthy();
    expect(screen.getByText(t.withdrawal.kept)).toBeTruthy();
    expect(screen.getByLabelText(t.withdrawal.date).props.value).toBe(toDisplayDate(TODAY));
    await fireEvent.press(screen.getByRole('button', { name: t.withdrawal.confirm }));
    await waitFor(async () =>
      expect(
        await count(db, 'enrollments', 'member_id = ? AND group_id = ? AND end_date = ?', [
          s.memberId,
          s.groupId,
          TODAY,
        ]),
      ).toBe(1),
    );
    expect(await count(db, 'attendances', 'member_id = ?', [s.memberId])).toBe(1);
    // Fenêtre fermée, fiche relue : plus aucun groupe en cours.
    expect(await screen.findByText(t.memberGroups.none)).toBeTruthy();
    expect(
      screen.queryByRole('header', { name: t.withdrawal.title('Alix Exemple', 'Poussins') }),
    ).toBeNull();
  });

  it('retrait : date avant le début refusée ; « Annuler » ne change rien', async () => {
    await open(`/membres/${s.memberId}`);
    await fireEvent.press(await button(`${t.memberGroups.withdraw}, Poussins`));
    await fireEvent.changeText(await screen.findByLabelText(t.withdrawal.date), '31/08/2026');
    await fireEvent.press(screen.getByRole('button', { name: t.withdrawal.confirm }));
    expect(await screen.findByText(t.errors.END_BEFORE_START)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.withdrawal.cancel }));
    expect(
      await count(db, 'enrollments', 'member_id = ? AND end_date IS NOT NULL', [s.memberId]),
    ).toBe(0);
  });

  it('« + Ajouter à un groupe » : groupes où il n’est pas, inscrit aujourd’hui', async () => {
    const { lastInsertRowId: benjamins } = await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (?, 'Benjamins lundi')",
      [s.seasonId],
    );
    await open(`/membres/${s.memberId}`);
    await fireEvent.press(await button(t.memberGroups.add));
    expect(screen.queryByRole('button', { name: 'Poussins' })).toBeNull();
    await fireEvent.press(await button('Benjamins lundi'));
    await waitFor(async () =>
      expect(
        await count(db, 'enrollments', 'member_id = ? AND group_id = ? AND start_date = ?', [
          s.memberId,
          benjamins,
          TODAY,
        ]),
      ).toBe(1),
    );
  });

  it('groupe d’une saison inactive : pas d’« Ajouter des membres »', async () => {
    const [old] = await db.query<{ id: number }>('SELECT id FROM groups WHERE season_id = ?', [
      s.otherSeasonId,
    ]);
    await open(`/groupes/${old?.id}`);
    expect(await screen.findByText(t.group.memberCount(2))).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.group.addMembers })).toBeNull();
  });

  it('ajout à une date passée : seuls les membres libres à cette date sont proposés', async () => {
    await db.execute(
      'INSERT INTO enrollments (member_id, group_id, start_date, end_date) VALUES (?, ?, ?, ?)',
      [noah, s.groupId, '2020-01-01', '2020-06-01'],
    );
    await open(`/groupes/${s.groupId}/inscrire`);
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Noah Girard' }));
    await fireEvent.changeText(screen.getByLabelText(t.enrollment.startDate), '01/03/2020');
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Noah Girard' })).toBeNull());
    expect(
      screen.getByRole('button', { name: t.enrollment.submit(0) }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });

  it('inscription à venir : « Annuler » l’efface après confirmation', async () => {
    await db.execute('INSERT INTO enrollments (member_id, group_id, start_date) VALUES (?, ?, ?)', [
      noah,
      s.groupId,
      '2099-01-05',
    ]);
    await open(`/membres/${noah}`);
    expect(
      screen.queryByRole('button', { name: `${t.memberGroups.withdraw}, Poussins` }),
    ).toBeNull();
    await fireEvent.press(await button(`${t.memberGroups.cancel}, Poussins`));
    expect(await screen.findByText(t.cancellation.title('Noah Girard', 'Poussins'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.cancellation.confirm }));
    await waitFor(async () =>
      expect(await count(db, 'enrollments', 'member_id = ?', [noah])).toBe(0),
    );
    expect(await screen.findByText(t.memberGroups.none)).toBeTruthy();
  });

  it('nouveau membre avec un groupe préchoisi qui n’est plus proposé : aucun groupe, comme affiché', async () => {
    await db.execute('UPDATE groups SET archived_at = ? WHERE id = ?', [TODAY, s.groupId]);
    await open(`/membres/nouveau?groupe=${s.groupId}`);
    expect(await button(`${t.memberForm.group}, ${t.memberForm.noGroup}`)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(t.memberForm.firstName), 'Yanis');
    await fireEvent.changeText(screen.getByLabelText(t.memberForm.lastName), 'Colin');
    await fireEvent.press(screen.getByRole('button', { name: t.memberForm.create }));
    await waitFor(async () => expect(await count(db, 'members', "first_name = 'Yanis'")).toBe(1));
    expect(
      await count(
        db,
        'enrollments',
        "member_id = (SELECT id FROM members WHERE first_name = 'Yanis')",
      ),
    ).toBe(0);
  });
});
