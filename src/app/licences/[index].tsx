// Texte complet d'une licence (EX-42). L'adresse porte la position dans le registre, vérifiée.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import registry from '@/config/licences.json';
import { theme } from '@/config/theme';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';

const t = labels.licences;

/** Entrée du registre pour un paramètre d'adresse, ou undefined s'il ne désigne aucune entrée. */
const entryAt = (param: string | undefined) =>
  // Chiffres seulement : « 0x1 », « 1e1 », « 1 » avec espace ou vide ne désignent rien.
  param !== undefined && /^\d+$/.test(param) ? registry[Number(param)] : undefined;

export default function Licence() {
  const router = useRouter();
  const entry = entryAt(useLocalSearchParams<{ index: string }>().index);
  return (
    <Screen
      title={entry?.name ?? t.title}
      subtitle={entry && <Text style={styles.subtitle}>{t.detailSubtitle(entry)}</Text>}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/licences'))}
      error={entry ? undefined : labels.errors.NOT_FOUND}
    >
      {entry && (
        <Card>
          <Text style={styles.text}>
            {entry.text ??
              t.missingText(entry.license, 'author' in entry ? entry.author : undefined)}
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  text: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texte },
});
