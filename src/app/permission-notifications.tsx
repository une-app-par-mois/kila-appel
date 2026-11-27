// Demande de permission de notification (maquette, EX-29, ticket 029) : affiché à l'activation de
// la relance, juste avant la demande du système. « Continuer » demande la permission et active la
// relance, accordée ou non (décision du porteur du 2026-11-27 : refusée, le réglage affiche le
// bandeau) ; « Pas maintenant » et le retour reviennent sans rien activer ni demander. Demande en
// échec : message, relance non activée ; dialogue fermé sans réponse : simple retour. Une seule
// demande par appui ; pas de retour (en-tête, système, geste) tant qu'elle est en cours.
import { usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // Un seul appui pris en compte, même avant que l'écran ne se redessine.
  const started = useRef(false);
  usePreventRemove(busy);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/relance'));
  // Retour une fois le blocage levé (effet déclaré après usePreventRemove), une seule fois.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `back` relit le routeur à l'appel.
  useEffect(() => {
    if (leaving) back();
  }, [leaving]);
  const confirm = async () => {
    if (started.current) return;
    started.current = true;
    setBusy(true);
    setError(undefined);
    let done = false;
    try {
      const result = await confirmPermission();
      done = result !== 'failed';
      if (done) setLeaving(true);
      else setError(labels.errors.unknown);
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(false);
    // Écran quitté : l'appui reste bloqué ; sinon un nouvel essai est possible.
    if (!done) started.current = false;
  };
  return (
    <Screen title={p.title} onBack={busy || leaving ? undefined : back} error={error}>
      <Card>
        <Text style={styles.text}>{p.why}</Text>
        <Text style={styles.note}>{p.privacy}</Text>
      </Card>
      <View style={styles.actions}>
        <Button label={p.continue} onPress={() => void confirm()} disabled={busy || leaving} />
        <Button label={p.notNow} onPress={back} variant="secondary" disabled={busy || leaving} />
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
