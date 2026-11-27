// Paramètres (maquette) : écran d'accueil provisoire jusqu'au ticket 012 (barre d'onglets).
// Seules les lignes qui mènent à un écran existant (décision du porteur du 2026-11-26). En tête,
// l'entrée de la recherche d'un contact d'urgence, à sa place dans l'accueil du 012 (EX-06), et
// « Nouvel appel » vers la séance proposée (EX-09) ; sans séance à faire, vers l'appel sans créneau
// (EX-39, décision du porteur du 2026-11-27).
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { toDisplayDate, toIsoDate, toLocalTime } from '@/domain/formats';
import { weekdayOfDate } from '@/domain/occurrences';
import { useGroups } from '@/hooks/useGroups';
import { useMembers } from '@/hooks/useMembers';
import { useProposedSession } from '@/hooks/useRollCall';
import { useSeasons } from '@/hooks/useSeasons';
import { useSlots } from '@/hooks/useSlots';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
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
  // L'heure avance d'elle-même : la séance proposée suit sans autre action (une fois par minute).
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const proposed = useProposedSession({ date: toIsoDate(now), time: toLocalTime(now) });
  const call = proposed.session;
  const callParts =
    call &&
    ([
      call.group.name,
      labels.weekdaysAbbr[weekdayOfDate(call.date) - 1] ?? '',
      toDisplayDate(call.date).slice(0, 5),
      call.startTime,
    ] as const);
  return (
    <Screen
      title={t.title}
      error={
        loadFailed || groupsFailed || membersFailed || slotsFailed || proposed.loadFailed
          ? labels.common.loadFailed
          : undefined
      }
    >
      <Card>
        {call && callParts && !call.recorded ? (
          <ListRow
            title={labels.rollCall.entry}
            subtitle={labels.rollCall.proposed(...callParts)}
            onPress={() =>
              router.push({
                pathname: '/appel',
                params: { creneau: call.slot.id, date: call.date },
              })
            }
          />
        ) : (
          <ListRow
            title={labels.rollCall.entry}
            subtitle={
              callParts
                ? labels.rollCall.proposedRecorded(...callParts)
                : proposed.loaded
                  ? labels.rollCall.noSession
                  : undefined
            }
            onPress={() => router.push('/appel-libre')}
          />
        )}
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labels.emergency.entry}
        onPress={() => router.push('/urgence')}
        style={({ pressed }) => [styles.search, pressed && styles.pressed]}
      >
        <Icon name="search" />
        <Text style={styles.searchText}>{labels.emergency.entry}</Text>
      </Pressable>
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
      <Section title={t.about} />
      <Card>
        <ListRow title={t.licences} onPress={() => router.push('/licences')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: theme.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: theme.spacing * 2,
    paddingHorizontal: theme.spacing * 3,
    marginVertical: theme.spacing * 1.5,
    backgroundColor: theme.colors.blanc,
    borderWidth: 1.5,
    borderColor: theme.colors.quadrillage,
    borderRadius: theme.radii.champ,
  },
  pressed: { opacity: 0.6 },
  searchText: {
    flex: 1,
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: theme.colors.texteSecondaire,
  },
});
