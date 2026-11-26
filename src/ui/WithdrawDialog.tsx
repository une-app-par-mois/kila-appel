// Retrait d'un membre d'un groupe (maquette, EX-04) : écran entier sur Papier, date « à partir du »
// modifiable (premier jour sans lui), ce qui est gardé, « Annuler » sur un tiers et l'action sur
// deux tiers. L'action ne part qu'une fois à la fois ; l'erreur reste sous le champ.
import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { parseDisplayDate, toDisplayDate } from '@/domain/formats';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { errorMessage } from '@/ui/errorMessage';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.withdrawal;

type Props = {
  visible: boolean;
  title: string;
  /** Date proposée, stockée (AAAA-MM-JJ). */
  initialDate: string;
  /** Rend une promesse : une erreur (date avant le début…) s'affiche sous le champ. */
  onConfirm: (endDate: string) => Promise<void>;
  onCancel: () => void;
};

export const WithdrawDialog = ({ visible, title, initialDate, onConfirm, onCancel }: Props) => {
  const [date, setDate] = useState(toDisplayDate(initialDate));
  const [error, setError] = useState<string | undefined>();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setDate(toDisplayDate(initialDate));
    setError(undefined);
  }, [visible, initialDate]);

  const confirm = async () => {
    const endDate = parseDisplayDate(date);
    if (endDate === null) {
      setError(labels.errors.DATE_INVALID);
      return;
    }
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await onConfirm(endDate);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <SafeAreaProvider>
        <Screen title={title} onBack={onCancel}>
          <Card>
            <TextField
              label={t.date}
              mono
              value={date}
              onChangeText={(value) => {
                setDate(value);
                setError(undefined);
              }}
              error={error}
            />
            <Text style={styles.note}>{t.kept}</Text>
          </Card>
          <View style={styles.actions}>
            <Button label={t.cancel} variant="secondary" flex={1} onPress={onCancel} />
            <Button label={t.confirm} flex={2} disabled={busy} onPress={() => void confirm()} />
          </View>
        </Screen>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  note: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  actions: { flexDirection: 'row', gap: theme.spacing * 2.5, marginTop: theme.spacing * 3 },
});
