import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { theme } from '@/config/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Icon } from '@/ui/Icon';
import { ListRow } from '@/ui/ListRow';

// Données fictives (SEC-13). Les textes viennent normalement de libelles.ts (CONV-03).
const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe('Button (charte §7)', () => {
  it('appelle onPress, se présente comme un bouton, respecte la zone d’appui (NF-06)', async () => {
    const onPress = jest.fn();
    await render(<Button label="Enregistrer" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Enregistrer' });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(flat(button.props.style).minHeight).toBeGreaterThanOrEqual(theme.minTouchTarget);
  });

  it.each([
    ['primary', theme.colors.encre, theme.colors.blanc],
    ['secondary', theme.colors.blanc, theme.colors.texteSecondaire],
    ['destructive', theme.colors.marge, theme.colors.blanc],
    ['destructiveSecondary', theme.colors.blanc, theme.colors.marge],
  ] as const)('variante %s : fond et texte de la charte', async (variant, background, color) => {
    await render(<Button label="Action" variant={variant} onPress={() => {}} />);
    expect(flat(screen.getByRole('button').props.style).backgroundColor).toBe(background);
    expect(flat(screen.getByText('Action').props.style).color).toBe(color);
  });

  it('désactivé : n’appelle rien et le dit à l’accessibilité', async () => {
    const onPress = jest.fn();
    await render(<Button label="Enregistrer" onPress={onPress} disabled />);
    const button = screen.getByRole('button');
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('Card', () => {
  it('rayon 16, bordure Quadrillage ; bordure Marge en avertissement', async () => {
    await render(
      <>
        <Card testID="normale">
          <Text>A</Text>
        </Card>
        <Card testID="alerte" warning>
          <Text>B</Text>
        </Card>
      </>,
    );
    expect(flat(screen.getByTestId('normale').props.style)).toMatchObject({
      borderRadius: theme.radii.carte,
      borderColor: theme.colors.quadrillage,
      backgroundColor: theme.colors.blanc,
    });
    expect(flat(screen.getByTestId('alerte').props.style).borderColor).toBe(theme.colors.marge);
  });
});

describe('ListRow', () => {
  it('titre, sous-titre, appui ; zone d’appui de 44 pt', async () => {
    const onPress = jest.fn();
    await render(<ListRow title="Poussins mercredi" subtitle="12 membres" onPress={onPress} />);
    const row = screen.getByRole('button', { name: 'Poussins mercredi, 12 membres' });
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalled();
    expect(flat(row.props.style).minHeight).toBeGreaterThanOrEqual(theme.minTouchTarget);
    expect(screen.getByTestId('chevron')).toBeTruthy();
  });

  it('sans onPress : simple ligne, sans chevron ni rôle de bouton', async () => {
    await render(<ListRow title="Benjamins" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByTestId('chevron')).toBeNull();
  });
});

describe('ConfirmDialog (EX-01, EX-02)', () => {
  const props = {
    title: 'Supprimer Poussins mercredi ?',
    message: 'Seront effacés : ses inscriptions et ses liens aux créneaux.',
    cancelLabel: 'Garder',
    confirmLabel: 'Supprimer définitivement',
  };

  it('dit ce qui sera effacé ; « Garder » sur un tiers, action destructive sur deux tiers', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(<ConfirmDialog visible {...props} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('header', { name: props.title })).toBeTruthy();
    expect(screen.getByText(props.message)).toBeTruthy();
    const keep = screen.getByRole('button', { name: 'Garder' });
    const remove = screen.getByRole('button', { name: 'Supprimer définitivement' });
    expect(flat(keep.props.style).flex).toBe(1);
    expect(flat(remove.props.style)).toMatchObject({
      flex: 2,
      backgroundColor: theme.colors.marge,
    });
    await fireEvent.press(keep);
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    await fireEvent.press(remove);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('caché : rien n’est affiché', async () => {
    await render(
      <ConfirmDialog visible={false} {...props} onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.queryByText(props.title)).toBeNull();
  });
});

describe('Icon (charte §8)', () => {
  it('trait de 2, grille de 24 ; Texte secondaire au repos, Encre à l’état actif', async () => {
    await render(
      <>
        <Icon name="add" testID="repos" />
        <Icon name="add" active testID="actif" />
      </>,
    );
    const rest = screen.getByTestId('repos', { includeHiddenElements: true });
    expect(rest.props).toMatchObject({ width: 24, height: 24, strokeWidth: 2 });
    expect(rest.props.stroke).toBe(theme.colors.texteSecondaire);
    expect(screen.getByTestId('actif', { includeHiddenElements: true }).props.stroke).toBe(
      theme.colors.encre,
    );
  });
});
