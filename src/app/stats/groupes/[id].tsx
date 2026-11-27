// Statistiques d'un groupe (maquette « Statistiques d'un groupe (podium) », EX-27, RM-01,
// ticket 025) : période et nombre de séances, puis « Par membre » (nom, taux), triés par nom. Le
// podium (F-14) arrive au jalon 5. Affiche ce que calcule le ticket 023, sans rien recalculer.
// Période en paramètres de route (`periode`, ou `du` et `au`), transmise à l'écran d'un membre.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import type { MemberStatsRow } from '@/data/statsRepo';
import { attendanceRate, formatRate } from '@/domain/attendanceRate';
import { toDisplayDate } from '@/domain/formats';
import { type StatsContext, useGroupStats } from '@/hooks/useStats';
import { Card } from '@/ui/Card';
import { Screen, Section } from '@/ui/Screen';
import { choiceFromParams, periodParams, type StatsPeriodParams } from '@/ui/statsPeriodParams';

const t = labels.stats;
const g = labels.stats.groupScreen;

/** Identifiant de l'adresse : chiffres seulement, sinon 0 (aucun groupe), comme la fiche membre. */
const idFrom = (param: string | undefined) => (param && /^\d+$/.test(param) ? Number(param) : 0);

/** « Saison 2026-2027 » ou « Du 01/11/2026 au 27/11/2026 ». */
const periodName = ({ season, period }: StatsContext) =>
  period.kind === 'season' && season
    ? season.name
    : t.periodShown(toDisplayDate(period.from), toDisplayDate(period.to));

/** Ligne « Par membre » : appuyable entière, sans chevron ; nom, « Archivé » et taux lus d'un bloc. */
const MemberLine = ({ member, onPress }: { member: MemberStatsRow; onPress: () => void }) => {
  const name = labels.memberForm.fullName(member.firstName, member.lastName);
  const rate = formatRate(attendanceRate(member.counts));
  const title = member.archived ? labels.rowAccessibility(name, t.archived) : name;
  return (
    <Pressable
      testID="stats-member"
      accessibilityRole="button"
      accessibilityLabel={labels.rowAccessibility(title, rate)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.name}>
        <Text testID="stats-member-name" style={styles.text}>
          {name}
        </Text>
        {member.archived && <Text style={styles.subtitle}>{t.archived}</Text>}
      </View>
      <Text style={styles.rate}>{rate}</Text>
    </Pressable>
  );
};

export default function StatsGroupScreen() {
  const router = useRouter();
  const { id, ...params } = useLocalSearchParams<StatsPeriodParams & { id: string }>();
  const groupId = idFrom(id);
  const { stats, loaded, loadFailed, inputError } = useGroupStats(
    groupId,
    choiceFromParams(params),
  );
  const group = stats?.group ?? null;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/stats'));
  const error = loadFailed
    ? labels.common.loadFailed
    : inputError !== null
      ? labels.errors[inputError]
      : loaded && group === null
        ? labels.errors.NOT_FOUND
        : undefined;
  const openMember = (memberId: number) =>
    stats &&
    router.push({
      pathname: '/stats/membres/[id]',
      params: { id: memberId, groupe: groupId, ...periodParams(stats.period) },
    });

  return (
    <Screen
      title={group?.name ?? t.title}
      subtitle={
        stats &&
        group && (
          <View style={styles.header}>
            <Text style={styles.subtitle}>{g.subtitle(periodName(stats), group.sessions)}</Text>
            {group.archived && <Text style={styles.subtitle}>{t.archived}</Text>}
          </View>
        )
      }
      onBack={back}
      error={error}
    >
      {group && inputError === null && (
        <>
          <Section title={g.byMember} />
          <Card>
            {group.members.map((member) => (
              <MemberLine
                key={member.memberId}
                member={member}
                onPress={() => openMember(member.memberId)}
              />
            ))}
            {group.members.length === 0 && <Text style={styles.subtitle}>{g.noMember}</Text>}
          </Card>
          {group.members.length > 0 && (
            <Text style={styles.subtitle}>{g.sorted(group.members.length)}</Text>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing * 2 },
  row: {
    minHeight: theme.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing * 2,
    paddingVertical: theme.spacing * 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.quadrillage,
  },
  pressed: { opacity: 0.6 },
  name: { flex: 1 },
  text: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
  subtitle: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  rate: { fontFamily: theme.fonts.digits, fontSize: 16, color: theme.colors.texte },
});
