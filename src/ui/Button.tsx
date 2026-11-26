// Bouton de la charte (§7) : principal (Encre, un seul par écran), secondaire, destructif.
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { theme } from '@/config/theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'destructiveSecondary'
  /** Petit bouton dans une ligne (« Activer »). */
  | 'compact';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Part de la largeur dans une rangée (« Garder » 1, « Supprimer » 2). */
  flex?: number;
};

const { colors } = theme;
const filled = (backgroundColor: string, color: string) => ({
  box: { backgroundColor, minHeight: 54, paddingVertical: theme.spacing * 2 } satisfies ViewStyle,
  text: { color, fontSize: 17 },
});
const outlined = (color: string) => ({
  box: { backgroundColor: colors.blanc, borderWidth: 1.5, borderColor: colors.quadrillage },
  text: { color, fontSize: 15 },
});

const VARIANTS = {
  primary: filled(colors.encre, colors.blanc),
  secondary: outlined(colors.texteSecondaire),
  destructive: filled(colors.marge, colors.blanc),
  destructiveSecondary: outlined(colors.marge),
  compact: outlined(colors.encre),
};

export const Button = ({ label, onPress, variant = 'primary', disabled = false, flex }: Props) => {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.box,
        v.box,
        flex !== undefined && { flex },
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text style={[styles.text, v.text]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  box: {
    minHeight: theme.minTouchTarget,
    borderRadius: theme.radii.bouton,
    paddingHorizontal: theme.spacing * 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: theme.fonts.textSemi, textAlign: 'center' },
  dimmed: { opacity: 0.6 },
});
