// Puce de filtre (maquettes Membres, Historique) : rayon 20, bordure Quadrillage ; active, bordure
// et texte Encre en demi-gras. Zone d'appui de 44 pt (NF-06), état sélectionné annoncé ; en case à
// cocher (bascule « Ignorer » de l'import, ticket 035), annoncé « coché ».
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '@/config/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Lu par le lecteur d'écran à la place d'un libellé court (« Me » → « Mercredi »). */
  accessibilityLabel?: string;
  /** `checkbox` : bascule annoncée « coché » ou « non coché » (NF-06). */
  role?: 'button' | 'checkbox';
};

export const FilterChip = ({
  label,
  selected,
  onPress,
  accessibilityLabel,
  role = 'button',
}: Props) => (
  <Pressable
    accessibilityRole={role}
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={role === 'checkbox' ? { checked: selected } : { selected }}
    onPress={onPress}
    style={[styles.chip, selected && styles.selected]}
  >
    <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  chip: {
    minHeight: theme.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing * 3,
    borderWidth: 1.5,
    borderColor: theme.colors.quadrillage,
    borderRadius: 20,
    backgroundColor: theme.colors.blanc,
  },
  selected: { borderColor: theme.colors.encre },
  text: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texte },
  selectedText: { fontFamily: theme.fonts.textSemi, color: theme.colors.encre },
});
