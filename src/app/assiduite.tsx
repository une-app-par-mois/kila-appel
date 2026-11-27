// Réglage des alertes d'assiduité (maquette, EX-25, ticket 022) : « Alerter après [N ▾] absences de
// suite », de 2 à 10, avec la liste de choix commune. Le choix s'enregistre aussitôt ; l'accueil
// et Paramètres suivent sans redémarrer (dataChanged).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { useAlertThreshold } from '@/hooks/useAlerts';
import { Card } from '@/ui/Card';
import { errorMessage } from '@/ui/errorMessage';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { ChoiceList } from '@/ui/Select';

const a = labels.alerts;
const CHOICES = [2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: n, label: a.choice(n) }));

export default function AlertThresholdSetting() {
  const router = useRouter();
  const { threshold, loadFailed, setThreshold } = useAlertThreshold();
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const choose = async (n: number) => {
    setError(undefined);
    try {
      await setThreshold(n);
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <Screen
      title={a.settingTitle}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/parametres'))}
      error={loadFailed ? labels.common.loadFailed : error}
    >
      {threshold !== null && (
        <Card>
          <View style={styles.line}>
            <Text style={styles.text}>{a.alertAfter}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={a.choiceAccessibility(threshold)}
              onPress={() => setChoosing(true)}
              style={styles.choice}
            >
              <Text style={styles.value}>{threshold}</Text>
              <Icon name="choices" />
            </Pressable>
            <Text style={styles.text}>{a.absencesInARow}</Text>
          </View>
          <Text style={styles.note}>{a.onlyUnexcused}</Text>
          <ChoiceList
            visible={choosing}
            title={a.choiceTitle}
            value={threshold}
            options={CHOICES}
            onChange={(n) => void choose(n)}
            onClose={() => setChoosing(false)}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing * 2 },
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
  text: { fontFamily: theme.fonts.text, fontSize: 15, color: theme.colors.texte },
  value: { fontFamily: theme.fonts.digits, fontSize: 16, color: theme.colors.texte },
  note: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing * 2,
  },
});
