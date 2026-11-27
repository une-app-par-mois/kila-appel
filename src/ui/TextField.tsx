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
  /** Indication après l'étiquette, en Texte secondaire (« facultative »). */
  hint?: string;
  /** En quittant le champ (enregistrement automatique de la fiche d'un membre). */
  onBlur?: () => void;
  /** Étiquette lue par le lecteur d'écran seulement (champ de recherche de la maquette). */
  labelHidden?: boolean;
  /** Clavier téléphonique (contact d'urgence). */
  phone?: boolean;
  /** Clavier ouvert dès l'arrivée (recherche d'un contact d'urgence, EX-06). */
  autoFocus?: boolean;
};

export const TextField = ({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  mono = false,
  hint,
  onBlur,
  labelHidden = false,
  phone = false,
  autoFocus = false,
}: Props) => (
  <View style={styles.field}>
    {!labelHidden && <FieldLabel label={label} hint={hint} />}
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      keyboardType={phone ? 'phone-pad' : 'default'}
      autoFocus={autoFocus}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.texteSecondaire}
      style={[styles.input, mono && styles.mono, error !== undefined && styles.invalid]}
    />
    {error !== undefined && <FieldError error={error} />}
  </View>
);

/** Erreur sous un champ, annoncée au lecteur d'écran (aussi sous un choix de jour). */
export const FieldError = ({ error }: { error: string }) => (
  <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
    {error}
  </Text>
);

/** Étiquette d'un champ, suivie d'une indication facultative (« facultative »). */
export const FieldLabel = ({ label, hint }: { label: string; hint?: string }) => (
  <View style={styles.labelRow}>
    <Text style={styles.label}>{label}</Text>
    {hint !== undefined && <Text style={[styles.label, styles.hint]}>{hint}</Text>}
  </View>
);

const styles = StyleSheet.create({
  field: { marginVertical: theme.spacing * 1.5 },
  label: { fontFamily: theme.fonts.textSemi, fontSize: 14, color: theme.colors.texteSecondaire },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing },
  hint: { fontFamily: theme.fonts.text, fontStyle: 'italic' },
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
