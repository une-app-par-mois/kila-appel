// Statistiques (maquette « Statistiques », EX-27, RM-01, ticket 024) : puces de période, période
// appliquée en clair, taux de présence et séances, puis une ligne par groupe. Affiche ce que
// calcule le ticket 023, sans rien recalculer. La période choisie vit dans l'état de l'onglet,
// jamais en base ; les dates libres reviennent de `stats/periode` en paramètres `du` et `au`.
// Un appui sur un groupe ouvre ses statistiques sur la période affichée (ticket 025).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import type { GroupStatsRow } from '@/data/statsRepo';
import { attendanceRate, formatRate } from '@/domain/attendanceRate';
import { toDisplayDate } from '@/domain/formats';
import type { PeriodChoice, PeriodKind } from '@/domain/statsPeriod';
import { useLocalNow } from '@/hooks/useLocalNow';
import { useNewRollCallRoute } from '@/hooks/useRollCall';
import { useStats } from '@/hooks/useStats';
import { AttendanceBar, AttendanceLegend, barLabel } from '@/ui/AttendanceBar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { FilterChip } from '@/ui/FilterChip';
import { Screen, Section } from '@/ui/Screen';
import { choiceParams, periodParams } from '@/ui/statsPeriodParams';

const t = labels.stats;

/** Carte d'un chiffre de la synthèse (Plex Mono, 26). */
const Figure = ({ testID, title, value }: { testID: string; title: string; value: string }) => (
  <View testID={testID} style={styles.figure}>
    <Card>
      <Text style={styles.subtitle}>{title}</Text>
      <Text style={styles.number}>{value}</Text>
    </Card>
  </View>
);

/** Lecture d'un bloc de la ligne d'un groupe (NF-06) : nom, « Archivé », taux, parts ou « Aucune séance ». */
const groupLabel = (group: GroupStatsRow, rate: string) =>
  [
    group.name,
    ...(group.archived ? [t.archived] : []),
    rate,
    group.sessions === 0 ? t.noSession : barLabel(group.counts),
  ]
    .filter((part) => part !== '')
    .reduce((label, part) => labels.rowAccessibility(label, part));

/**
 * Ligne « Par groupe » : nom (« Archivé » dessous), taux, barre ou « Aucune séance ». Appuyable
 * entière, même archivée ou sans séance ; lue d'un bloc avec un libellé explicite, la barre n'est
 * pas focusable à part (TalkBack ne lirait pas un descendant focusable).
 */
const GroupLine = ({ group, onPress }: { group: GroupStatsRow; onPress: () => void }) => {
  const rate = formatRate(attendanceRate(group.counts));
  return (
    <Pressable
      testID="stats-group"
      accessibilityRole="button"
      accessibilityLabel={groupLabel(group, rate)}
      onPress={onPress}
      style={({ pressed }) => [styles.group, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={styles.name}>
          <Text testID="stats-group-name" style={styles.title}>
            {group.name}
          </Text>
          {group.archived && <Text style={styles.subtitle}>{t.archived}</Text>}
        </View>
        <Text style={styles.rate}>{rate}</Text>
      </View>
      {group.sessions === 0 ? (
        <Text style={styles.subtitle}>{t.noSession}</Text>
      ) : (
        <AttendanceBar counts={group.counts} accessible={false} />
      )}
    </Pressable>
  );
};

export default function StatsScreen() {
  const router = useRouter();
  const now = useLocalNow();
  const newRollCall = useNewRollCallRoute(now);
  const { du, au } = useLocalSearchParams<{ du?: string; au?: string }>();
  const [choice, setChoice] = useState<PeriodChoice | null>(null);
  // Dates libres reçues de l'écran Période : nouvelle période de l'onglet.
  useEffect(() => {
    if (du !== undefined && au !== undefined) setChoice({ kind: 'custom', from: du, to: au });
  }, [du, au]);
  // Vue précédente gardée pendant une relecture (`keepPrevious`) : ni les puces ni les chiffres
  // ne disparaissent au changement de période.
  const { stats, loadFailed, inputError } = useStats(choice);
  const shown = inputError === null ? stats : null;
  const empty = stats?.overview.anyRecorded === false && inputError === null;
  const showFilters = !empty && (stats !== null || inputError !== null);
  const selected: PeriodKind | undefined = choice?.kind ?? stats?.period.kind;
  // « Saison » seulement si une saison active est connue (inconnue : dates reçues invalides).
  const kinds: ('season' | 'month')[] = stats?.season ? ['season', 'month'] : ['month'];
  /** Saison ou mois : les dates reçues sont oubliées, et reviennent si on les réapplique. */
  const choose = (kind: 'season' | 'month') => {
    router.setParams({ du: undefined, au: undefined });
    setChoice({ kind });
  };

  /** Champs de l'écran Période : période affichée, sinon dates demandées (même invalides). */
  const periodScreenParams = (): { du?: string; au?: string } => {
    if (shown) return { du: shown.period.from, au: shown.period.to };
    return choice?.kind === 'custom' ? { du: choice.from, au: choice.to } : {};
  };
  const openPeriod = () =>
    router.push({ pathname: '/stats/periode', params: periodScreenParams() });

  return (
    <Screen title={t.title} error={loadFailed ? labels.common.loadFailed : undefined}>
      {empty && (
        // État vide (maquette « États vides du lot 2 ») : aucune séance enregistrée.
        <Card testID="stats-empty">
          <Text style={styles.text}>{t.empty}</Text>
          <Button
            label={t.start}
            disabled={newRollCall === null}
            onPress={() => newRollCall && router.push(newRollCall)}
          />
        </Card>
      )}
      {showFilters && (
        <View style={styles.filters}>
          {kinds.map((kind) => (
            <FilterChip
              key={kind}
              label={t.periods[kind]}
              selected={selected === kind}
              onPress={() => choose(kind)}
            />
          ))}
          <FilterChip
            label={t.periods.custom}
            selected={selected === 'custom'}
            onPress={openPeriod}
          />
        </View>
      )}
      {inputError !== null && <Text style={styles.error}>{labels.errors[inputError]}</Text>}
      {shown?.overview.anyRecorded && (
        <>
          <Text style={styles.period}>
            {t.periodShown(toDisplayDate(shown.period.from), toDisplayDate(shown.period.to))}
          </Text>
          <View style={styles.figures}>
            <Figure
              testID="stats-rate"
              title={t.rate}
              value={formatRate(attendanceRate(shown.overview.counts))}
            />
            <Figure
              testID="stats-sessions"
              title={t.sessions}
              value={String(shown.overview.sessions)}
            />
          </View>
          <Section title={t.byGroup} />
          <Card>
            {shown.overview.groups.map((group) => (
              <GroupLine
                key={group.groupId}
                group={group}
                onPress={() =>
                  router.push({
                    pathname: '/stats/groupes/[id]',
                    // Période choisie, même si l'ancienne est encore affichée pendant la relecture.
                    params: {
                      id: group.groupId,
                      ...(choice ? choiceParams(choice) : periodParams(shown.period)),
                    },
                  })
                }
              />
            ))}
            {shown.overview.groups.length === 0 && (
              <Text style={styles.subtitle}>{t.noSession}</Text>
            )}
          </Card>
          <AttendanceLegend />
          {/* Rangée de la maquette : « Exporter (CSV) » un tiers ; « Rapport PDF » au ticket 041. */}
          <View style={styles.exports}>
            <Button
              label={labels.attendanceExport.open}
              variant="secondary"
              flex={1}
              onPress={() =>
                router.push({
                  pathname: '/stats/export',
                  params: choice ? choiceParams(choice) : periodParams(shown.period),
                })
              }
            />
            <View style={styles.reserved} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing * 2 },
  period: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing * 2,
  },
  figures: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing * 3 },
  // Côte à côte, l'une sous l'autre quand le texte est agrandi.
  figure: { flexGrow: 1, flexBasis: 140 },
  number: { fontFamily: theme.fonts.digits, fontSize: 26, color: theme.colors.encre },
  exports: { flexDirection: 'row', gap: theme.spacing * 2, marginTop: theme.spacing * 3 },
  reserved: { flex: 2 },
  group: { paddingVertical: theme.spacing * 2.5, minHeight: theme.minTouchTarget },
  pressed: { opacity: 0.6 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: theme.spacing * 2,
  },
  name: { flexShrink: 1 },
  title: { fontFamily: theme.fonts.textSemi, fontSize: 16, color: theme.colors.texte },
  subtitle: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  rate: { fontFamily: theme.fonts.digits, fontSize: 18, color: theme.colors.encre },
  text: {
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: theme.colors.texte,
    marginVertical: theme.spacing * 3,
  },
  error: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.marge,
    marginTop: theme.spacing * 2,
  },
});
