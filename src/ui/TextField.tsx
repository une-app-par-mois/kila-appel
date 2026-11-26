// Champ de saisie (charte §6, maquettes) : étiquette au-dessus, fond blanc, rayon 12 ;
// erreur sous le champ, bordure Marge, annoncée au lecteur d'écran (NF-06, CONV-15).
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '@/config/theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  /** Chiffres en Plex Mono (dates, heures). */
  mono?: boolean;
};

export const TextField = ({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  mono = false,
}: Props) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.texteSecondaire}
      style={[styles.input, mono && styles.mono, error !== undefined && styles.invalid]}
    />
    {error !== undefined && (
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
        {error}
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  field: { marginVertical: theme.spacing * 1.5 },
  label: { fontFamily: theme.fonts.textSemi, fontSize: 14, color: theme.colors.texteSecondaire },
  input: {
    minHeight: theme.minTouchTarget,
    marginTop: theme.spacing * 1.5,
    paddingHorizontal: theme.spacing * 3,
    paddingVertical: theme.spacing * 2.5,
    backgroundColor: theme.colors.blanc,
    borderWidth: 1.5,
    borderColor: theme.colors.quadrillage,
    borderRadius: theme.radii.champ,
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: theme.colors.texte,
  },
  mono: { fontFamily: theme.fonts.digits },
  invalid: { borderColor: theme.colors.marge },
  error: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.marge,
    marginTop: theme.spacing,
  },
});
