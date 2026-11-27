// Écrans des contacts d'urgence (ticket 008b, EX-05, EX-06), sur une vraie base node:sqlite.
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Linking } from 'react-native';
import { count, type Seeded, seed } from '@/__fixtures__/seed';
import Contact from '@/app/contacts/[id]';
import Member from '@/app/membres/[id]';
import Emergency from '@/app/urgence';
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
  urgence: Emergency,
  'membres/[id]': Member,
  'contacts/[id]': Contact,
};
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const t = labels;
const button = (name: string | RegExp) => screen.findByRole('button', { name });
const phones = async (db: Db, memberId: number) =>
  (
    await db.query<{ label: string; phone: string }>(
      'SELECT label, phone FROM emergency_contacts WHERE member_id = ? ORDER BY position, id',
      [memberId],
    )
  ).map((r) => `${r.label} ${r.phone}`);

describe('Écrans des contacts d’urgence (EX-05, EX-06)', () => {
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
    jest.restoreAllMocks();
  });

  it('fiche : contacts dans l’ordre, numéro par paires ; « Ajouter un contact » puis retour', async () => {
    const router = await open(`/membres/${s.memberId}`);
    expect(await screen.findByText(t.contacts.title)).toBeTruthy();
    expect(screen.getByText('06 00 00 00 00')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t.contacts.add }));
    expect(await screen.findByRole('header', { name: t.contactForm.title })).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(t.contactForm.label), 'Sa mère');
    await fireEvent.changeText(screen.getByLabelText(t.contactForm.phone), '+33 6 00 00 00 01');
    await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(router.getPathname()).toBe(`/membres/${s.memberId}`));
    expect(await screen.findByText('06 00 00 00 01')).toBeTruthy();
    expect(await phones(db, s.memberId)).toEqual(['Parent 0600000000', 'Sa mère 0600000001']);
  });

  it('formulaire : nom vide et téléphone refusé sous leurs champs, rien n’est écrit', async () => {
    await open(`/contacts/nouveau?membre=${s.memberId}`);
    await fireEvent.changeText(await screen.findByLabelText(t.contactForm.phone), '06 00');
    await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
    expect(await screen.findByText(t.errors.NAME_REQUIRED)).toBeTruthy();
    expect(screen.getByText(t.errors.PHONE_INVALID)).toBeTruthy();
    expect(await count(db, 'emergency_contacts', 'member_id = ?', [s.memberId])).toBe(1);
  });

  it('modifier puis « Supprimer ce contact » : effacé pour de bon', async () => {
    const [contact] = await db.query<{ id: number }>(
      'SELECT id FROM emergency_contacts WHERE member_id = ?',
      [s.memberId],
    );
    const router = await open(`/membres/${s.memberId}`);
    await fireEvent.press(await button(`Parent, 06 00 00 00 00`));
    expect(router.getPathname()).toBe(`/contacts/${contact?.id}`);
    const phone = await screen.findByLabelText(t.contactForm.phone);
    expect(phone.props.value).toBe('06 00 00 00 00');
    await fireEvent.changeText(screen.getByLabelText(t.contactForm.label), 'Son père');
    await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(router.getPathname()).toBe(`/membres/${s.memberId}`));
    expect(await phones(db, s.memberId)).toEqual(['Son père 0600000000']);
    await fireEvent.press(await button(`Son père, 06 00 00 00 00`));
    await fireEvent.press(await button(t.contactForm.delete));
    await waitFor(() => expect(router.getPathname()).toBe(`/membres/${s.memberId}`));
    expect(await count(db, 'emergency_contacts', 'member_id = ?', [s.memberId])).toBe(0);
    expect(await screen.findByText(t.contacts.none('Alix Exemple'))).toBeTruthy();
  });

  it('ordre : la poignée se déplace aussi au lecteur d’écran (« Monter », « Descendre »)', async () => {
    await db.execute(
      "INSERT INTO emergency_contacts (member_id, label, phone, position) VALUES (?, 'Sa mère', '0600000001', 1)",
      [s.memberId],
    );
    await open(`/membres/${s.memberId}`);
    const handle = await screen.findByLabelText(t.contacts.handle('Sa mère'));
    expect(handle.props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
      t.contacts.moveUp,
      t.contacts.moveDown,
    ]);
    await fireEvent(handle, 'accessibilityAction', { nativeEvent: { actionName: 'moveUp' } });
    const handles = () =>
      screen.getAllByLabelText(/^Déplacer /).map((h) => h.props.accessibilityLabel);
    const order = [t.contacts.handle('Sa mère'), t.contacts.handle('Parent')];
    // L'écran affiche le nouvel ordre, relu dans la base.
    await waitFor(() => expect(handles()).toEqual(order));
    expect(await phones(db, s.memberId)).toEqual(['Sa mère 0600000001', 'Parent 0600000000']);
    // Déjà en tête : « Monter » ne change rien.
    await fireEvent(screen.getByLabelText(order[0] ?? ''), 'accessibilityAction', {
      nativeEvent: { actionName: 'moveUp' },
    });
    expect(handles()).toEqual(order);
    expect(await phones(db, s.memberId)).toEqual(['Sa mère 0600000001', 'Parent 0600000000']);
  });

  it('EX-06 accueil → recherche → « Appeler » : 2 appuis après la saisie, composeur du système', async () => {
    const call = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const router = await open('/');
    await fireEvent.press(await button(t.emergency.entry));
    expect(router.getPathname()).toBe('/urgence');
    await fireEvent.changeText(await screen.findByLabelText(t.emergency.search), 'alix');
    expect(await screen.findByText('Alix Exemple')).toBeTruthy();
    expect(screen.getByText('Poussins')).toBeTruthy();
    expect(screen.queryByText('Sam Fictif')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: t.emergency.callLabel('Parent') }));
    expect(call).toHaveBeenCalledWith('tel:0600000000');
  });

  it('recherche : rien pour une saisie vide ; « aucun membre ne correspond » ; archivé absent', async () => {
    await db.execute('UPDATE members SET archived_at = ? WHERE id = ?', ['2026-11-01', s.memberId]);
    await open('/urgence');
    const field = await screen.findByLabelText(t.emergency.search);
    expect(screen.queryByText(t.members.noMatchHint)).toBeNull();
    await fireEvent.changeText(field, 'alix');
    // P1 NF-06 : la carte « Recherche sans résultat » de la maquette.
    expect(await screen.findByText(t.members.noMatch('alix'))).toBeTruthy();
    expect(screen.getByText(t.members.noMatchHint)).toBeTruthy();
  });

  it('appel impossible (tablette sans téléphonie) : un message, pas de plantage', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('NO_DIALER'));
    await open('/urgence');
    await fireEvent.changeText(await screen.findByLabelText(t.emergency.search), 'sam');
    await fireEvent.press(await button(t.emergency.callLabel('Parent')));
    expect(await screen.findByText(t.emergency.callFailed)).toBeTruthy();
  });

  it('contact introuvable (999, abc) : le dit', async () => {
    await open('/contacts/999');
    expect(await screen.findByText(t.errors.NOT_FOUND)).toBeTruthy();
  });

  it('deux déplacements coup sur coup : les deux comptent', async () => {
    await db.execute(
      "INSERT INTO emergency_contacts (member_id, label, phone, position) VALUES (?, 'Sa mère', '0600000001', 1), (?, 'Son père', '0600000002', 2)",
      [s.memberId, s.memberId],
    );
    await open(`/membres/${s.memberId}`);
    const handle = await screen.findByLabelText(t.contacts.handle('Parent'));
    await fireEvent(handle, 'accessibilityAction', { nativeEvent: { actionName: 'moveDown' } });
    await fireEvent(screen.getByLabelText(t.contacts.handle('Parent')), 'accessibilityAction', {
      nativeEvent: { actionName: 'moveDown' },
    });
    await waitFor(async () =>
      expect(await phones(db, s.memberId)).toEqual([
        'Sa mère 0600000001',
        'Son père 0600000002',
        'Parent 0600000000',
      ]),
    );
  });

  it('contacts illisibles : la section le dit au lieu de disparaître', async () => {
    await db.execute('DROP TABLE emergency_contacts');
    await open(`/membres/${s.memberId}`);
    expect(await screen.findByText(t.contacts.title)).toBeTruthy();
    expect(await screen.findByText(t.common.loadFailed)).toBeTruthy();
  });

  it('recherche : les résultats restent affichés pendant la frappe suivante', async () => {
    await open('/urgence');
    const field = await screen.findByLabelText(t.emergency.search);
    await fireEvent.changeText(field, 'ali');
    expect(await screen.findByText('Alix Exemple')).toBeTruthy();
    await fireEvent.changeText(field, 'alix');
    expect(screen.getByText('Alix Exemple')).toBeTruthy();
  });

  it('nouveau contact sans membre valide : introuvable, pas de formulaire', async () => {
    await open('/contacts/nouveau?membre=abc');
    expect(await screen.findByText(t.errors.NOT_FOUND)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.common.save })).toBeNull();
  });
});
