// Licences (maquette, EX-42) : registre généré par scripts/licences.js, embarqué, lisible hors ligne.
import { useRouter } from 'expo-router';
import { labels } from '@/config/libelles';
import registry from '@/config/licences.json';
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
      <Card>
        {registry.map((entry, index) => (
          <ListRow
            key={`${entry.name}@${entry.version}`}
            title={entry.name}
            subtitle={t.subtitle(entry)}
            onPress={() => router.push(`/licences/${index}`)}
          />
        ))}
        <ListRow title={t.generated} chevron={false} />
      </Card>
    </Screen>
  );
}
