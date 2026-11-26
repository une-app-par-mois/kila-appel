// Groupes de la saison active (maquette, EX-02) ; `?archives=1` pour les groupes archivés.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { useGroups } from '@/hooks/useGroups';
import { useSeasons } from '@/hooks/useSeasons';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';

const t = labels.groups;

export default function Groups() {
  const router = useRouter();
  const archived = useLocalSearchParams<{ archives?: string }>().archives === '1';
  const { seasons, loadFailed: seasonsFailed } = useSeasons();
  const active = seasons?.find((s) => s.isActive);
  const seasonId = active?.id ?? null;
  const { groups, loadFailed } = useGroups(seasonId, { archived });
  const { groups: archivedGroups } = useGroups(archived ? null : seasonId, { archived: true });
  const archivedCount = archivedGroups?.length ?? 0;
  const failed = seasonsFailed || loadFailed;

  return (
    <Screen
      title={archived ? t.archivedTitle : t.title}
      subtitle={active && <Text style={styles.subtitle}>{active.name}</Text>}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      error={failed ? labels.common.loadFailed : undefined}
    >
      {seasons !== null && active === undefined && (
        <Card>
          <Text style={styles.text}>{t.noActiveSeason}</Text>
          <Button label={t.toSeasons} onPress={() => router.push('/saisons')} />
        </Card>
      )}
      {groups !== null && groups.length > 0 && (
        <Card>
          {groups.map((group) => (
            <ListRow
              key={group.id}
              title={group.name}
              onPress={() => router.push(`/groupes/${group.id}`)}
            />
          ))}
        </Card>
      )}
      {groups !== null && groups.length === 0 && archived && (
        <Text style={styles.text}>{t.emptyArchived}</Text>
      )}
      {groups !== null && groups.length === 0 && !archived && (
        <Card>
          <Text style={styles.text}>{t.empty}</Text>
          <Button label={t.createFirst} onPress={() => router.push('/groupes/nouveau')} />
        </Card>
      )}
      {groups !== null && groups.length > 0 && !archived && (
        <Button label={t.create} onPress={() => router.push('/groupes/nouveau')} />
      )}
      {!archived && archivedCount > 0 && (
        <Button
          label={t.showArchived(archivedCount)}
          variant="compact"
          onPress={() => router.push('/groupes?archives=1')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  text: {
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: theme.colors.texte,
    marginBottom: theme.spacing * 3,
  },
});
