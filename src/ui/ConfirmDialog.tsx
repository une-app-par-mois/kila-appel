// Confirmation d'une action destructive (EX-01, EX-02, ABS-05) : un titre, ce qui sera effacé,
// « Garder » sur un tiers et l'action destructive en Marge sur deux tiers. Écran entier sur Papier,
// comme la maquette (la charte ne définit pas de voile). Le contenu défile (grand texte, paysage)
// et l'action ne part qu'une fois par ouverture (double appui).
import { useEffect, useRef } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/config/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';

type Props = {
  visible: boolean;
  title: string;
  /** Ce qui sera effacé, et ce qui sera gardé. */
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog = ({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onConfirm,
  onCancel,
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
        <SafeAreaView style={styles.screen}>
          <ScrollView testID="confirm-scroll" contentContainerStyle={styles.content}>
            <Card>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.actions}>
                <Button label={cancelLabel} variant="secondary" flex={1} onPress={onCancel} />
                <Button label={confirmLabel} variant="destructive" flex={2} onPress={confirmOnce} />
              </View>
            </Card>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.papier },
  content: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing * 5 },
  title: {
    fontFamily: theme.fonts.title,
    fontSize: 22,
    letterSpacing: -0.22,
    color: theme.colors.texte,
  },
  message: {
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: theme.colors.texte,
    marginVertical: theme.spacing * 3,
  },
  actions: { flexDirection: 'row', gap: theme.spacing * 2 },
});
