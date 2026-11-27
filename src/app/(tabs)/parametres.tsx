// Paramètres (maquette Paramètres, onglet, ticket 012) : seules les lignes qui mènent à un écran
// existant (décision du porteur du 2026-11-26). Relance, alertes : jalons suivants ; conservation et
// tout effacer : ticket 015b.
import { useRouter } from 'expo-router';
import { labels } from '@/config/libelles';
import { toIsoDate } from '@/domain/formats';
import { toLastBackup, useLastBackup } from '@/hooks/useBackupExport';
import { useGroups } from '@/hooks/useGroups';
import { useLocalNow } from '@/hooks/useLocalNow';
import { useMembers } from '@/hooks/useMembers';
import { useSeasons } from '@/hooks/useSeasons';
import { useSlots } from '@/hooks/useSlots';
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
  const { slots, loadFailed: slotsFailed } = useSlots(active?.id ?? null);
  const { lastBackup, loaded: backupLoaded, loadFailed: backupFailed } = useLastBackup();
  // Horloge partagée (ticket 012) : « aujourd'hui » devient « hier » après minuit, page ouverte.
  const now = useLocalNow();
  return (
    <Screen
      title={t.title}
      error={
        loadFailed || groupsFailed || membersFailed || slotsFailed || backupFailed
          ? labels.common.loadFailed
          : undefined
      }
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
        <ListRow
          title={t.slots}
          subtitle={
            seasons === null
              ? undefined
              : active === undefined
                ? t.noActiveSeason
                : slots === null
                  ? undefined
                  : labels.slots.count(slots.length)
          }
          onPress={() => router.push('/creneaux')}
        />
      </Card>
      <Section title={t.data} />
      <Card>
        <ListRow
          title={t.backup}
          subtitle={
            backupLoaded ? labels.backup.settingsRow(toLastBackup(lastBackup, now.date)) : undefined
          }
          onPress={() => router.push('/donnees')}
        />
      </Card>
      <Section title={t.about} />
      <Card>
        <ListRow title={t.licences} onPress={() => router.push('/licences')} />
      </Card>
    </Screen>
  );
}
