// Paramètres (maquette) : écran d'accueil provisoire jusqu'au ticket 012 (barre d'onglets).
// Seules les lignes qui mènent à un écran existant (décision du porteur du 2026-11-26).
import { useRouter } from 'expo-router';
import { labels } from '@/config/libelles';
import { useSeasons } from '@/hooks/useSeasons';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Screen, Section } from '@/ui/Screen';

const t = labels.settings;

export default function Settings() {
  const router = useRouter();
  const { seasons, loadFailed } = useSeasons();
  const active = seasons?.find((s) => s.isActive);
  return (
    <Screen title={t.title} error={loadFailed ? labels.common.loadFailed : undefined}>
      <Section title={t.organisation} />
      <Card>
        <ListRow
          title={t.seasons}
          subtitle={active ? t.activeSeason(active.name) : t.noActiveSeason}
          onPress={() => router.push('/saisons')}
        />
      </Card>
    </Screen>
  );
}
