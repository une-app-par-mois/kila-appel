// Puce de filtre (maquettes Membres, Historique) : rayon 20, bordure Quadrillage ; active, bordure
// et texte Encre en demi-gras. Zone d'appui de 44 pt (NF-06), état sélectionné annoncé.
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '@/config/theme';

type Props = { label: string; selected: boolean; onPress: () => void };

export const FilterChip = ({ label, selected, onPress }: Props) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected }}
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
