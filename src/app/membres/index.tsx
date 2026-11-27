// Membres (maquette, EX-03) : recherche, filtre par groupe (la puce ouvre la liste des groupes de
// la saison active), bascule sur les archivés (décisions du porteur du 2026-11-26).
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { toIsoDate } from '@/domain/formats';
import { useGroups } from '@/hooks/useGroups';
import { useMembers } from '@/hooks/useMembers';
import { useSeasons } from '@/hooks/useSeasons';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { FilterChip } from '@/ui/FilterChip';
import { ListRow } from '@/ui/ListRow';
import { NoMatch } from '@/ui/NoMatch';
import { Screen } from '@/ui/Screen';
import { ChoiceList } from '@/ui/Select';
import { TextField } from '@/ui/TextField';

const t = labels.members;

export default function Members() {
  const router = useRouter();
  const today = toIsoDate(new Date());
  const [query, setQuery] = useState('');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [archived, setArchived] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const { seasons, loadFailed: seasonsFailed } = useSeasons();
  const active = seasons?.find((s) => s.isActive);
  const { groups, loadFailed: groupsFailed } = useGroups(active?.id ?? null);
  // Un groupe choisi qui n'existe plus (archivé, supprimé, autre saison) : retour à tous.
  const groupGone = groups !== null && groupId !== null && !groups.some((g) => g.id === groupId);
  useEffect(() => {
    if (groupGone) setGroupId(null);
  }, [groupGone]);
  const filterGroup = archived || groupGone ? null : groupId;
  const { members, loadFailed } = useMembers({ today, archived, groupId: filterGroup, query });
  const { members: archivedMembers, loadFailed: archivedFailed } = useMembers({
    today,
    archived: true,
  });
  const failed = loadFailed || archivedFailed || seasonsFailed || groupsFailed;
  // Aucun membre du tout (ni recherche ni filtre) : « Nouveau membre » dans la carte, un seul bouton.
  const searching = query.trim() !== '';
  const empty =
    members !== null && members.length === 0 && !archived && filterGroup === null && !searching;
  const groupChoices = [
    { value: null, label: t.allGroups },
    ...(groups ?? []).map((g) => ({ value: g.id as number | null, label: g.name })),
  ];
  const groupLabel = groupChoices.find((c) => c.value === groupId)?.label ?? t.allGroups;

  return (
    <Screen
      title={t.title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      error={failed ? labels.common.loadFailed : undefined}
    >
      <TextField
        label={t.search}
        labelHidden
        placeholder={t.search}
        value={query}
        onChangeText={setQuery}
      />
      <View style={styles.filters}>
        <FilterChip label={groupLabel} selected={!archived} onPress={() => setChoosing(true)} />
        <FilterChip
          label={t.archived(archivedMembers?.length ?? 0)}
          selected={archived}
          onPress={() => setArchived((value) => !value)}
        />
      </View>
      <ChoiceList
        visible={choosing}
        title={t.groupFilter}
        value={groupId}
        options={groupChoices}
        onChange={(value) => {
          setGroupId(value);
          setArchived(false);
        }}
        onClose={() => setChoosing(false)}
      />
      {members !== null && members.length > 0 && (
        <Card>
          {members.map((m) => (
            <ListRow
              key={m.id}
              title={labels.memberForm.fullName(m.firstName, m.lastName)}
              subtitle={m.groups.length > 0 ? m.groups.join(', ') : t.noGroup}
              onPress={() => router.push(`/membres/${m.id}`)}
            />
          ))}
        </Card>
      )}
      {/* États vides (maquette, P1, NF-06) : la carte remplace la liste. */}
      {members !== null && members.length === 0 && searching && (
        <Card>
          <NoMatch query={query} />
        </Card>
      )}
      {members !== null && members.length === 0 && !searching && (
        <Card>
          <Text style={styles.text}>
            {filterGroup !== null
              ? t.noMatchGroup
              : archived
                ? t.emptyArchived
                : (archivedMembers?.length ?? 0) > 0
                  ? t.emptyAllArchived
                  : t.empty}
          </Text>
          {empty && <Button label={t.create} onPress={() => router.push('/membres/nouveau')} />}
        </Card>
      )}
      {!archived && !empty && (
        <Button label={t.create} onPress={() => router.push('/membres/nouveau')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing * 2 },
  text: {
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: theme.colors.texte,
    marginVertical: theme.spacing * 3,
  },
});
