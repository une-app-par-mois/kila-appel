// Paramètres (maquette) : écran d'accueil provisoire jusqu'au ticket 012 (barre d'onglets).
// Seules les lignes qui mènent à un écran existant (décision du porteur du 2026-11-26).
import { useRouter } from 'expo-router';
import { labels } from '@/config/libelles';
import { toIsoDate } from '@/domain/formats';
import { useGroups } from '@/hooks/useGroups';
import { useMembers } from '@/hooks/useMembers';
import { useSeasons } from '@/hooks/useSeasons';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Screen, Section } from '@/ui/Screen';

const t = labels.settings;

export default function Settings() {
  const router = useRouter();
  const { seasons, loadFailed } = useSeasons();
  const active = seasons?.find((s) => s.isActive);
  const { groups, loadFailed: groupsFailed } = useGroups(active?.id ?? null);
  const { members, loadFailed: membersFailed } = useMembers({ today: toIsoDate(new Date()) });
  return (
    <Screen
      title={t.title}
      error={loadFailed || groupsFailed || membersFailed ? labels.common.loadFailed : undefined}
    >
      <Section title={t.organisation} />
      <Card>
        <ListRow
          title={t.seasons}
          subtitle={
            seasons === null ? undefined : active ? t.activeSeason(active.name) : t.noActiveSeason
          }
          onPress={() => router.push('/saisons')}
        />
        <ListRow
          title={t.groups}
          subtitle={
            seasons === null
              ? undefined
              : active === undefined
                ? t.noActiveSeason
                : groups === null
                  ? undefined
                  : t.groupCount(groups.length)
          }
          onPress={() => router.push('/groupes')}
        />
        <ListRow
          title={t.members}
          subtitle={members === null ? undefined : t.memberCount(members.length)}
          onPress={() => router.push('/membres')}
        />
      </Card>
      <Section title={t.about} />
      <Card>
        <ListRow title={t.licences} onPress={() => router.push('/licences')} />
      </Card>
    </Screen>
  );
}
