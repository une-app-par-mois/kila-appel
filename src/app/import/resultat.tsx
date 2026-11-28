// Import CSV : résultat (maquette « Import CSV : résultat », ticket 035, F-07, EX-30). Les six
// compteurs de `confirm` (034) arrivent en paramètres de route, relus comme des entiers ≥ 0
// (aucun nom en paramètre, ABS-04) ; une phrase n'apparaît que si son compteur est non nul
// (décision du porteur du 2026-11-28). « Voir les membres » revient à la liste des membres.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import type { ImportCounts } from '@/config/libelles/import';
import { theme } from '@/config/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';

const t = labels.memberImport;
const KEYS = [
  'added',
  'enrolled',
  'duplicatesIgnored',
  'invalid',
  'duplicatesEnrolled',
  'unarchived',
] as const;

/** Paramètre lu comme un entier ≥ 0 ; autre chose (absent, texte, négatif, décimal) : 0. */
const count = (value: string | string[] | undefined) =>
  typeof value === 'string' && /^\d{1,6}$/.test(value) ? Number(value) : 0;

export default function ImportResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const counts = Object.fromEntries(KEYS.map((key) => [key, count(params[key])])) as ImportCounts;
  const showMembers = () => router.dismissTo('/membres');
  const sentence = t.resultText(counts);
  const hasSentence = sentence.length > 0;

  return (
    <Screen title={t.resultTitle(counts.added)} onBack={showMembers}>
      {hasSentence && (
        <Card>
          <Text style={styles.text}>{sentence}</Text>
        </Card>
      )}
      <Button label={t.showMembers} onPress={showMembers} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
});
