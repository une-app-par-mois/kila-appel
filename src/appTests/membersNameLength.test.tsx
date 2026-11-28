// Nom et prénom d'un membre à la saisie (ticket 032b, EX-03, SEC-06, NF-06) : 100 caractères au
// plus après trim(), sans caractère invisible ; message sous le champ, annoncé, rien d'enregistré.
// Vraie base node:sqlite et jeu fictif (SEC-13).
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
const NAME_100 = 'A'.repeat(100);
const NAME_101 = 'A'.repeat(101);
/** Erreur sous un champ : rôle « alert », annoncée au lecteur d'écran (NF-06). */
const fieldAlert = (message: string) => screen.findByRole('alert', { name: message });

describe('Nom et prénom de 100 caractères au plus, sans caractère invisible (SEC-06)', () => {
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

  const fillNew = async (firstName: string, lastName: string) => {
    await open('/membres/nouveau');
    await fireEvent.changeText(await screen.findByLabelText(t.memberForm.firstName), firstName);
    await fireEvent.changeText(screen.getByLabelText(t.memberForm.lastName), lastName);
    await fireEvent.press(screen.getByRole('button', { name: t.memberForm.create }));
  };

  it('EX-03 SEC-06 NF-06 création : 101 caractères dans Nom → message annoncé, rien d’écrit', async () => {
    await fillNew('Yanis', NAME_101);
    expect(await fieldAlert(t.errors.NAME_TOO_LONG)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.memberForm.create })).not.toBeDisabled();
    expect(await count(db, 'members')).toBe(2);
  });

  it('EX-03 SEC-06 création : 100 caractères dans Nom → enregistré', async () => {
    await fillNew('Yanis', NAME_100);
    await waitFor(async () =>
      expect(await count(db, 'members', 'last_name = ?', [NAME_100])).toBe(1),
    );
  });

  it('SEC-06 création : 100 caractères entourés d’espaces → enregistré sans les espaces', async () => {
    await fillNew('Yanis', `  ${NAME_100}  `);
    await waitFor(async () =>
      expect(await count(db, 'members', 'last_name = ?', [NAME_100])).toBe(1),
    );
  });

  it('SEC-06 NF-06 création : une tabulation dans Prénom → message annoncé, rien d’écrit', async () => {
    await fillNew('Ya\tnis', 'Colin');
    expect(await fieldAlert(t.errors.NAME_INVALID_CHAR)).toBeTruthy();
    expect(await count(db, 'members')).toBe(2);
  });

  const editField = async (label: string, value: string) => {
    const field = await screen.findByLabelText(label);
    await fireEvent.changeText(field, value);
    await fireEvent(field, 'blur');
  };

  it('EX-03 SEC-06 NF-06 fiche : 101 caractères dans Nom → message annoncé, rien d’écrit', async () => {
    await open(`/membres/${s.memberId}`);
    await editField(t.memberForm.lastName, NAME_101);
    expect(await fieldAlert(t.errors.NAME_TOO_LONG)).toBeTruthy();
    expect(await count(db, 'members', "last_name = 'Exemple' AND id = ?", [s.memberId])).toBe(1);
  });

  it('EX-03 SEC-06 fiche : 100 caractères dans Nom (entourés d’espaces) → enregistré', async () => {
    await open(`/membres/${s.memberId}`);
    await editField(t.memberForm.lastName, ` ${NAME_100} `);
    await waitFor(async () =>
      expect(await count(db, 'members', 'last_name = ? AND id = ?', [NAME_100, s.memberId])).toBe(
        1,
      ),
    );
  });

  it('SEC-06 NF-06 fiche : une tabulation dans Prénom → message annoncé, rien d’écrit', async () => {
    await open(`/membres/${s.memberId}`);
    await editField(t.memberForm.firstName, 'Al\tix');
    expect(await fieldAlert(t.errors.NAME_INVALID_CHAR)).toBeTruthy();
    expect(await count(db, 'members', "first_name = 'Alix' AND id = ?", [s.memberId])).toBe(1);
  });

  it('SEC-06 fiche : en quittant l’écran, un nom invalide est écarté, le prénom valide enregistré', async () => {
    const router = await open('/membres');
    await fireEvent.press(await screen.findByRole('button', { name: /Alix Exemple/ }));
    await fireEvent.changeText(await screen.findByLabelText(t.memberForm.firstName), 'Léa');
    await fireEvent.changeText(screen.getByLabelText(t.memberForm.lastName), NAME_101);
    await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
    await waitFor(() => expect(router.getPathname()).toBe('/membres'));
    await waitFor(async () =>
      expect(
        await count(db, 'members', "first_name = 'Léa' AND last_name = 'Exemple' AND id = ?", [
          s.memberId,
        ]),
      ).toBe(1),
    );
  });
});
