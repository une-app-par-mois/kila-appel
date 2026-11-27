// Demande de permission de notification (maquette, EX-29, ticket 029) : affiché à l'activation de
// la relance, juste avant la demande du système. « Continuer » demande la permission et active la
// relance, accordée ou non (décision du porteur du 2026-11-27 : refusée, le réglage affiche le
// bandeau) ; « Pas maintenant » et le retour reviennent sans rien activer ni demander.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { useReminderActions } from '@/hooks/useReminderSettings';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { errorMessage } from '@/ui/errorMessage';
import { Screen } from '@/ui/Screen';

const p = labels.notificationPermission;

export default function NotificationPermission() {
  const router = useRouter();
  const { confirmPermission } = useReminderActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/relance'));
  const confirm = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await confirmPermission();
      back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };
  return (
    <Screen title={p.title} onBack={back} error={error}>
      <Card>
        <Text style={styles.text}>{p.why}</Text>
        <Text style={styles.note}>{p.privacy}</Text>
      </Card>
      <View style={styles.actions}>
        <Button label={p.continue} onPress={() => void confirm()} disabled={busy} />
        <Button label={p.notNow} onPress={back} variant="secondary" disabled={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: theme.fonts.text, fontSize: 15, color: theme.colors.texte },
  note: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing * 2,
  },
  actions: { gap: theme.spacing * 2 },
});
