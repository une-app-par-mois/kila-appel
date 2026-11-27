// Confirmation d'une action destructive (EX-01, EX-02, ABS-05), comme la maquette : écran entier,
// titre en en-tête, ce qui sera effacé dans une carte bordée de Marge, ce qui est gardé en dessous,
// « Garder » sur un tiers et l'action destructive en Marge sur deux tiers. L'action ne part
// qu'une fois par ouverture (double appui).
import { type ReactNode, useEffect, useRef } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '@/config/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';

type Props = {
  visible: boolean;
  title: string;
  /** Ce qui sera effacé ; texte, ou textes imbriqués pour un mot en gras (purge, ticket 015b). */
  message: ReactNode;
  /** Ce qui est gardé (« Les membres sont conservés. »). */
  note?: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Confirmation sans effacement (« Faire un autre appel ») : bouton principal, pas rouge. */
  harmless?: boolean;
};

export const ConfirmDialog = ({
  visible,
  title,
  message,
  note,
  cancelLabel,
  confirmLabel,
  onConfirm,
  onCancel,
  harmless = false,
}: Props) => {
  const confirmed = useRef(false);
  useEffect(() => {
    if (visible) confirmed.current = false;
  }, [visible]);
  const confirmOnce = () => {
    if (confirmed.current) return;
    confirmed.current = true;
    onConfirm();
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <SafeAreaProvider>
        <Screen title={title} onBack={onCancel}>
          <Card warning>
            <Text style={styles.message}>{message}</Text>
            {note !== undefined && <Text style={styles.note}>{note}</Text>}
          </Card>
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="secondary" flex={1} onPress={onCancel} />
            <Button
              label={confirmLabel}
              variant={harmless ? 'primary' : 'destructive'}
              flex={2}
              onPress={confirmOnce}
            />
          </View>
        </Screen>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  message: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
  note: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing * 2,
  },
  actions: { flexDirection: 'row', gap: theme.spacing * 2.5, marginTop: theme.spacing * 3 },
});
