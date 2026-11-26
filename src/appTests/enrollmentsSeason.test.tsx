// Inscriptions dans les dates de la saison (ticket 007e, EX-04), sur une vraie base node:sqlite.
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

describe('Inscriptions dans les dates de la saison (EX-04)', () => {
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

  it('EX-04 ajout hors des dates de la saison : refusé sous le champ, rien n’est écrit', async () => {
    await open(`/groupes/${s.groupId}/inscrire`);
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Noah Girard' }));
    await fireEvent.changeText(screen.getByLabelText(t.enrollment.startDate), '01/08/2027');
    await fireEvent.press(screen.getByRole('button', { name: t.enrollment.submit(1) }));
    expect(await screen.findByText(t.errors.DATE_OUTSIDE_SEASON)).toBeTruthy();
    expect(await count(db, 'enrollments', 'member_id = ?', [noah])).toBe(0);
  });

  it('EX-04 saison pas encore commencée : la date proposée est son premier jour', async () => {
    await db.execute(
      "UPDATE seasons SET start_date = '2099-09-01', end_date = '2100-07-31' WHERE id = ?",
      [s.seasonId],
    );
    await open(`/groupes/${s.groupId}/inscrire`);
    await waitFor(() =>
      expect(screen.getByLabelText(t.enrollment.startDate).props.value).toBe('01/09/2099'),
    );
  });

  it('EX-04 nouveau membre avec un groupe, saison pas commencée : inscrit au premier jour', async () => {
    await db.execute(
      "UPDATE seasons SET start_date = '2099-09-01', end_date = '2100-07-31' WHERE id = ?",
      [s.seasonId],
    );
    await open(`/membres/nouveau?groupe=${s.groupId}`);
    await fireEvent.changeText(await screen.findByLabelText(t.memberForm.firstName), 'Yanis');
    await fireEvent.changeText(screen.getByLabelText(t.memberForm.lastName), 'Colin');
    expect(await button(`${t.memberForm.group}, Poussins`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.memberForm.create }));
    await waitFor(async () =>
      expect(
        await count(db, 'enrollments', 'group_id = ? AND start_date = ?', [
          s.groupId,
          '2099-09-01',
        ]),
      ).toBe(1),
    );
  });

  it('EX-04 nouveau membre, date reçue hors saison : refusé avec le message, rien n’est écrit', async () => {
    await open(`/membres/nouveau?groupe=${s.groupId}&debut=2027-08-01`);
    await fireEvent.changeText(await screen.findByLabelText(t.memberForm.firstName), 'Yanis');
    await fireEvent.changeText(screen.getByLabelText(t.memberForm.lastName), 'Colin');
    expect(await button(`${t.memberForm.group}, Poussins`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.memberForm.create }));
    expect(await screen.findByText(t.errors.DATE_OUTSIDE_SEASON)).toBeTruthy();
    expect(await count(db, 'members', "first_name = 'Yanis'")).toBe(0);
  });

  it('EX-04 « + Ajouter à un groupe », saison pas commencée : inscrit à son premier jour', async () => {
    await db.execute(
      "UPDATE seasons SET start_date = '2099-09-01', end_date = '2100-07-31' WHERE id = ?",
      [s.seasonId],
    );
    const { lastInsertRowId: benjamins } = await db.execute(
      "INSERT INTO groups (season_id, name) VALUES (?, 'Benjamins lundi')",
      [s.seasonId],
    );
    await open(`/membres/${s.otherMemberId}`);
    await fireEvent.press(await button(t.memberGroups.add));
    await fireEvent.press(await button('Benjamins lundi'));
    await waitFor(async () =>
      expect(
        await count(db, 'enrollments', 'member_id = ? AND group_id = ? AND start_date = ?', [
          s.otherMemberId,
          benjamins,
          '2099-09-01',
        ]),
      ).toBe(1),
    );
  });

  it('EX-04 « Nouveau membre » avec une date hors saison : refusé sous le champ, on reste sur l’ajout', async () => {
    const router = await open(`/groupes/${s.groupId}/inscrire`);
    await fireEvent.changeText(await screen.findByLabelText(t.enrollment.startDate), '01/08/2027');
    await fireEvent.press(screen.getByRole('button', { name: t.enrollment.newMember }));
    expect(await screen.findByText(t.errors.DATE_OUTSIDE_SEASON)).toBeTruthy();
    expect(router.getPathname()).toBe(`/groupes/${s.groupId}/inscrire`);
  });
});
