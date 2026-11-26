// Écrans des licences (ticket 006e, EX-42), sur le registre généré src/config/licences.json.
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import Settings from '@/app/index';
import Licence from '@/app/licences/[index]';
import Licences from '@/app/licences/index';
import { labels } from '@/config/libelles';
import registry from '@/config/licences.json';

jest.mock('@/hooks/useDatabase', () => ({ useDatabase: () => null }));
jest.mock('@/data/log', () => ({ log: jest.fn() }));

const routes = { index: Settings, 'licences/index': Licences, 'licences/[index]': Licence };
const open = (initialUrl: string) => renderRouter(routes, { initialUrl });
const t = labels.licences;
type Entry = (typeof registry)[number];
/** Entrée du registre réel qui vérifie la condition ; le test échoue s'il n'y en a pas. */
const entryWhere = (test: (e: Entry) => boolean): Entry => {
  const entry = registry.find(test);
  if (!entry) throw new Error('Entrée attendue absente du registre');
  return entry;
};

describe('Licences embarquées (EX-42)', () => {
  it('Paramètres › À propos › Licences mène à la liste', async () => {
    const router = await open('/');
    expect(await screen.findByText(labels.settings.about)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: labels.settings.licences }));
    expect(router.getPathname()).toBe('/licences');
  });

  it('liste chaque entrée du registre (polices comprises), lisible hors ligne', async () => {
    await open('/licences');
    expect(await screen.findByText(t.generated)).toBeTruthy();
    for (const entry of registry) {
      expect(screen.getByText(entry.name)).toBeTruthy();
    }
    expect(screen.getByText('IBM Plex Sans, IBM Plex Mono')).toBeTruthy();
  });

  it('un appui ouvre le texte complet de la licence', async () => {
    const entry = entryWhere((e) => e.name === 'react');
    await open('/licences');
    await fireEvent.press(
      await screen.findByRole('button', { name: `react, ${t.subtitle(entry)}` }),
    );
    expect(await screen.findByRole('header', { name: 'react' })).toBeTruthy();
    expect(screen.getByText(entry.text ?? '')).toBeTruthy();
  });

  it('un paquet sans fichier de licence : licence et auteur, avec un message', async () => {
    const entry = entryWhere((e) => e.text === null);
    const index = registry.indexOf(entry);
    await open(`/licences/${index}`);
    expect(
      await screen.findByText(
        t.missingText(entry.license, 'author' in entry ? entry.author : undefined),
      ),
    ).toBeTruthy();
  });

  it.each(['999', '-1', 'abc', '1.5', '0x1', '1e1', ' 1', '%20'])(
    'une adresse invalide (%s) : introuvable',
    async (index) => {
      await open(`/licences/${index}`);
      expect(await screen.findByText(labels.errors.NOT_FOUND)).toBeTruthy();
    },
  );
});
