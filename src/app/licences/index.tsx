// Licences (maquette, EX-42) : registre généré par scripts/licences.js, embarqué, lisible hors ligne.
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import registry from '@/config/licences.json';
import { theme } from '@/config/theme';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';

const t = labels.licences;

export default function Licences() {
  const router = useRouter();
  return (
    <Screen
      title={t.title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    >
      <Text style={styles.note}>{t.generated}</Text>
      <Card>
        {registry.map((entry, index) => (
          <ListRow
            key={`${entry.name}@${entry.version}`}
            title={entry.name}
            subtitle={t.subtitle(entry)}
            onPress={() => router.push(`/licences/${index}`)}
          />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
});
