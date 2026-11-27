// Champ de choix « ▾ » (maquettes) et sa liste plein écran sur Papier : une ligne par choix, coche
// sur le choix en cours (décision du porteur du 2026-11-26 : composant maison, sans dépendance).
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { FieldError, FieldLabel } from '@/ui/TextField';

export type Choice<T> = { value: T; label: string };

type ListProps<T> = {
  visible: boolean;
  title: string;
  /** Choix en cours, coché ; `null` : aucun. */
  value: T | null;
  options: Choice<T>[];
  onChange: (value: T) => void;
  onClose: () => void;
};

/** Liste plein écran ; un choix ferme la liste. Le retour ferme sans rien changer. */
export const ChoiceList = <T,>({
  visible,
  title,
  value,
  options,
  onChange,
  onClose,
}: ListProps<T>) => (
  <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
    <SafeAreaProvider>
      <Screen title={title} onBack={onClose}>
        <Card>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={String(option.value)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                onPress={() => {
                  onClose();
                  onChange(option.value);
                }}
                style={styles.choice}
              >
                <Text style={[styles.choiceText, selected && styles.selectedText]}>
                  {option.label}
                </Text>
                {selected && <Icon name="check" active />}
              </Pressable>
            );
          })}
        </Card>
      </Screen>
    </SafeAreaProvider>
  </Modal>
);

type Props<T> = {
  label: string;
  value: T | null;
  options: Choice<T>[];
  /** Affiché tant que rien n'est choisi (« Aucun groupe »). */
  placeholder: string;
  onChange: (value: T) => void;
  /** Indication après l'étiquette (« facultatif »). */
  hint?: string;
  /** Erreur sous le champ, bordure Marge, comme un champ de saisie. */
  error?: string;
};

export const Select = <T,>({
  label,
  value,
  options,
  placeholder,
  onChange,
  hint,
  error,
}: Props<T>) => {
  const [open, setOpen] = useState(false);
  const shown = options.find((o) => o.value === value)?.label ?? placeholder;
  return (
    <View style={styles.field}>
      <FieldLabel label={label} hint={hint} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labels.rowAccessibility(label, shown)}
        onPress={() => setOpen(true)}
        style={[styles.input, error !== undefined && styles.invalid]}
      >
        <Text style={[styles.value, value === null && styles.placeholder]}>{shown}</Text>
        <Icon name="choices" />
      </Pressable>
      {error !== undefined && <FieldError error={error} />}
      <ChoiceList
        visible={open}
        title={label}
        value={value}
        options={options}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  field: { marginVertical: theme.spacing * 1.5 },
  input: {
    minHeight: theme.minTouchTarget,
    marginTop: theme.spacing * 1.5,
    paddingHorizontal: theme.spacing * 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.blanc,
    borderWidth: 1.5,
    borderColor: theme.colors.quadrillage,
    borderRadius: theme.radii.champ,
  },
  invalid: { borderColor: theme.colors.marge },
  value: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
  placeholder: { color: theme.colors.texteSecondaire },
  choice: {
    minHeight: theme.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing * 2,
  },
  choiceText: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
  selectedText: { fontFamily: theme.fonts.textSemi, color: theme.colors.encre },
});
