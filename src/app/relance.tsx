// Réglage de la relance (maquette « Réglage de la relance », EX-28, EX-29, ticket 029).
// L'interrupteur montre l'état effectif : préférence et permission du système. L'activer ne
// demande la permission qu'après l'écran « Autoriser les notifications ? » ; le désactiver ne
// demande rien. Préférence active et permission refusée : bandeau et « Ouvrir les réglages du
// téléphone » (Linking.openSettings, sans réseau). Délai de 10 à 60 min, liste de choix commune.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { log } from '@/data/log';
import { REMINDER_DELAYS } from '@/domain/reminders';
import { effectiveReminder, useReminderSettings } from '@/hooks/useReminderSettings';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { errorMessage } from '@/ui/errorMessage';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { ChoiceList } from '@/ui/Select';

const r = labels.reminderSetting;
const CHOICES = REMINDER_DELAYS.map((n) => ({ value: n as number, label: r.delay(n) }));

export default function ReminderSetting() {
  const router = useRouter();
  const { view, loadFailed, turnOn, turnOff, setDelay } = useReminderSettings();
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const run = async (action: () => Promise<void>) => {
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const toggle = (on: boolean) =>
    run(async () => {
      if (!on) await turnOff();
      else if ((await turnOn()) === 'askFirst') router.push('/permission-notifications');
    });
  const openSettings = () => {
    Linking.openSettings().catch(() => {
      log('OPEN_SETTINGS_FAILED');
      setError(labels.errors.unknown);
    });
  };
  const effective = view === null ? null : effectiveReminder(view);
  return (
    <Screen
      title={r.title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/parametres'))}
      error={loadFailed ? labels.common.loadFailed : error}
    >
      {view !== null && effective !== null && (
        <>
          <Card>
            <View style={styles.row}>
              <View style={styles.label}>
                <Text style={styles.title}>{r.toggle}</Text>
                <Text style={styles.note}>{r.onDevice}</Text>
                <Text style={styles.note}>{r.lockScreen}</Text>
              </View>
              <Switch
                accessibilityLabel={r.toggle}
                accessibilityState={{ checked: effective.switchOn }}
                value={effective.switchOn}
                onValueChange={(on) => void toggle(on)}
                trackColor={{ false: theme.colors.quadrillage, true: theme.colors.encre }}
                thumbColor={theme.colors.blanc}
                ios_backgroundColor={theme.colors.quadrillage}
              />
            </View>
            <View style={styles.line}>
              <Text style={styles.text}>{r.after}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={r.delayAccessibility(view.delayMin)}
                onPress={() => setChoosing(true)}
                style={styles.choice}
              >
                <Text style={styles.value}>{r.delay(view.delayMin)}</Text>
                <Icon name="choices" />
              </Pressable>
              <Text style={styles.text}>{r.afterStart}</Text>
            </View>
            <ChoiceList
              visible={choosing}
              title={r.delayTitle}
              value={view.delayMin}
              options={CHOICES}
              onChange={(n) => void run(() => setDelay(n))}
              onClose={() => setChoosing(false)}
            />
          </Card>
          {effective.denied && (
            <Card warning>
              <Text style={styles.title}>{r.deniedTitle}</Text>
              <Text style={[styles.note, styles.spaced]}>{r.deniedBody}</Text>
              <Button label={r.openSettings} onPress={openSettings} variant="secondary" />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing * 2,
  },
  label: { flex: 1 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing * 2,
    marginTop: theme.spacing * 3,
  },
  choice: {
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing * 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing,
    backgroundColor: theme.colors.blanc,
    borderWidth: 1.5,
    borderColor: theme.colors.quadrillage,
    borderRadius: theme.radii.champ,
  },
  title: { fontFamily: theme.fonts.textSemi, fontSize: 16, color: theme.colors.texte },
  text: { fontFamily: theme.fonts.text, fontSize: 15, color: theme.colors.texte },
  value: { fontFamily: theme.fonts.digits, fontSize: 16, color: theme.colors.texte },
  note: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  spaced: { marginVertical: theme.spacing * 2 },
});
