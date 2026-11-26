// Carte de la charte (§7) : fond blanc, bordure Quadrillage, rayon 16, ombre de papier.
// `warning` : bordure Marge (avertissements, dont celui de la sauvegarde, ABS-06).
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/config/theme';

type Props = { children: ReactNode; warning?: boolean; testID?: string };

export const Card = ({ children, warning = false, testID }: Props) => (
  <View testID={testID} style={[styles.card, warning && styles.warning]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.blanc,
    borderWidth: 1,
    borderColor: theme.colors.quadrillage,
    borderRadius: theme.radii.carte,
    padding: theme.spacing * 3.5,
    marginVertical: theme.spacing * 2.5,
    // Ombre de papier : 0 2 pt 0, Encre à 6 %, sans flou.
    shadowColor: theme.colors.encre,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 0,
    elevation: 1,
  },
  warning: { borderWidth: 1.5, borderColor: theme.colors.marge },
});
