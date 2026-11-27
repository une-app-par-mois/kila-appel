// Historique (maquette Historique, EX-16, EX-17, ticket 013) : séances enregistrées et appels
// manquants mêlés, la plus récente en haut ; filtres Groupe et Période (30 derniers jours, saison
// active, toutes les saisons : décision du porteur du 2026-11-27). Un appel manquant ouvre son
// appel, une séance son détail. Séances annulées ou non planifiées : jalon 2 (F-13).
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { toDisplayDate } from '@/domain/formats';
import type { HistoryPeriod } from '@/domain/history';
import { weekdayOfDate } from '@/domain/occurrences';
import { type HistoryRow, useHistory } from '@/hooks/useHistory';
import { useLocalNow } from '@/hooks/useLocalNow';
import { useNewRollCallRoute } from '@/hooks/useRollCall';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { FilterChip } from '@/ui/FilterChip';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { ChoiceList } from '@/ui/Select';

const h = labels.history;
const PERIODS: HistoryPeriod[] = ['last30Days', 'season', 'allSeasons'];

/** « Lun. 24/11 » (maquette). */
const dayOf = (date: string) =>
  h.day(labels.weekdaysAbbr[weekdayOfDate(date) - 1] ?? '', toDisplayDate(date).slice(0, 5));

export default function HistoryScreen() {
  const router = useRouter();
  const now = useLocalNow();
  const [groupId, setGroupId] = useState<number | null>(null);
  const [period, setPeriod] = useState<HistoryPeriod>('last30Days');
  const [choosing, setChoosing] = useState<'group' | 'period' | null>(null);
  const { history, rows, loadFailed } = useHistory(now, { groupId, period });
  // « Faire l'appel » de l'état vide mène où mène l'onglet « Nouvel appel ».
  const newRollCall = useNewRollCallRoute(now);

  // Un groupe choisi qui n'est plus proposé (groupe supprimé ailleurs) : retour à tous.
  const groupGone =
    history !== null && groupId !== null && !history.groups[period].some((g) => g.id === groupId);
  useEffect(() => {
    if (groupGone) setGroupId(null);
  }, [groupGone]);

  const groupChoices = [
    { value: null as number | null, label: h.allGroups },
    ...(history?.groups[period] ?? []).map((g) => ({
      value: g.id as number | null,
      label: g.activeSeason ? g.name : h.groupOfSeason(g.name, g.seasonName),
    })),
  ];
  const groupLabel = groupChoices.find((c) => c.value === groupId)?.label ?? h.allGroups;

  // Autre période : un groupe qui n'y est pas proposé redevient « Tous les groupes » dans le même
  // rendu (ni lecture de trop, ni « Aucun appel pour ces filtres » de passage).
  const choosePeriod = (next: HistoryPeriod) => {
    setPeriod(next);
    if (groupId !== null && !history?.groups[next].some((g) => g.id === groupId)) setGroupId(null);
  };

  const open = (row: HistoryRow) =>
    row.kind === 'missing'
      ? router.push({ pathname: '/appel', params: { creneau: row.slotId, date: row.date } })
      : router.push({ pathname: '/seances/[id]', params: { id: row.id } });

  return (
    <Screen title={h.title} error={loadFailed ? labels.common.loadFailed : undefined}>
      {history !== null && !history.anything && (
        // État vide (maquette « États vides », P1) : rien d'enregistré ni de manquant.
        <Card testID="history-empty">
          <Text style={styles.text}>{h.empty}</Text>
          <Button
            label={h.start}
            disabled={newRollCall === null}
            onPress={() => newRollCall && router.push(newRollCall)}
          />
        </Card>
      )}
      {history?.anything && (
        <>
          <View style={styles.filters}>
            <FilterChip label={groupLabel} selected onPress={() => setChoosing('group')} />
            <FilterChip
              label={h.periods[period]}
              selected={period !== 'last30Days'}
              onPress={() => setChoosing('period')}
            />
          </View>
          {rows !== null && (
            <Card>
              {rows.map((row) => (
                <ListRow
                  key={row.kind === 'missing' ? `m${row.slotId}|${row.date}` : `s${row.id}`}
                  testID="history-row"
                  dot={row.kind === 'missing'}
                  title={
                    row.kind === 'missing'
                      ? h.missingRow(row.groupName)
                      : (row.groupName ?? h.removedGroup)
                  }
                  subtitle={
                    row.kind === 'missing'
                      ? h.missingWhen(dayOf(row.date), row.startTime)
                      : h.sessionWhen(dayOf(row.date), row.present, row.total)
                  }
                  onPress={() => open(row)}
                />
              ))}
              {rows.length === 0 && <Text style={styles.text}>{h.noMatch}</Text>}
            </Card>
          )}
        </>
      )}
      <ChoiceList
        visible={choosing === 'group'}
        title={h.groupFilter}
        value={groupId}
        options={groupChoices}
        onChange={setGroupId}
        onClose={() => setChoosing(null)}
      />
      <ChoiceList
        visible={choosing === 'period'}
        title={h.periodFilter}
        value={period}
        options={PERIODS.map((p) => ({ value: p, label: h.periods[p] }))}
        onChange={choosePeriod}
        onClose={() => setChoosing(null)}
      />
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
