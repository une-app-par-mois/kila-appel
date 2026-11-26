// Puce de filtre, champ de choix et champ facultatif (ticket 007b, décisions du porteur).
import { fireEvent, render, screen } from '@testing-library/react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { FilterChip } from '@/ui/FilterChip';
import { Select } from '@/ui/Select';
import { TextField } from '@/ui/TextField';

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// Données fictives (SEC-13).
const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const options = [
  { value: 1, label: 'Poussins mercredi' },
  { value: 2, label: 'Benjamins lundi' },
];

describe('FilterChip (maquette Membres)', () => {
  it('bouton de 44 pt, état sélectionné annoncé, bordure Encre quand active', async () => {
    const onPress = jest.fn();
    await render(<FilterChip label="Archivés (4)" selected onPress={onPress} />);
    const chip = screen.getByRole('button', { name: 'Archivés (4)' });
    expect(chip.props.accessibilityState).toMatchObject({ selected: true });
    expect(flat(chip.props.style).minHeight).toBeGreaterThanOrEqual(theme.minTouchTarget);
    expect(flat(chip.props.style).borderColor).toBe(theme.colors.encre);
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('au repos : bordure Quadrillage', async () => {
    await render(<FilterChip label="Tous les groupes" selected={false} onPress={() => {}} />);
    const chip = screen.getByRole('button', { name: 'Tous les groupes' });
    expect(flat(chip.props.style).borderColor).toBe(theme.colors.quadrillage);
  });
});

describe('Select : champ « ▾ » et liste plein écran', () => {
  it('affiche le choix en cours ; un appui ouvre la liste, coche sur le choix en cours', async () => {
    const onChange = jest.fn();
    await render(
      <Select label="Groupe" value={2} options={options} placeholder="Aucun" onChange={onChange} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Groupe, Benjamins lundi' }));
    expect(screen.getByRole('header', { name: 'Groupe' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Benjamins lundi' }).props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Poussins mercredi' }));
    expect(onChange).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('header', { name: 'Groupe' })).toBeNull();
  });

  it('sans choix : le texte d’attente ; le retour ferme sans rien changer', async () => {
    const onChange = jest.fn();
    await render(
      <Select
        label="Groupe"
        value={null}
        options={options}
        placeholder="Aucun groupe"
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Groupe, Aucun groupe' }));
    await fireEvent.press(screen.getByRole('button', { name: labels.common.back }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('header', { name: 'Groupe' })).toBeNull();
  });

  it('une indication (« facultatif ») suit l’étiquette', async () => {
    await render(
      <Select
        label="Groupe"
        hint="facultatif"
        value={null}
        options={options}
        placeholder="Aucun"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('facultatif')).toBeTruthy();
  });
});

describe('TextField : indication et sortie du champ', () => {
  it('« facultative » suit l’étiquette ; onBlur est appelé en quittant le champ', async () => {
    const onBlur = jest.fn();
    await render(
      <TextField
        label="Date de naissance"
        hint="facultative"
        value=""
        onChangeText={() => {}}
        onBlur={onBlur}
      />,
    );
    expect(screen.getByText('facultative')).toBeTruthy();
    await fireEvent(screen.getByLabelText('Date de naissance'), 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
