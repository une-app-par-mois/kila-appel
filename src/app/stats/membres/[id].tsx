// Statistiques d'un membre dans un groupe (maquette « Statistiques d'un membre », EX-27, RM-01,
// RM-03, ticket 025) : taux en grand, barre par statut, comptes des quatre statuts, puis une case
// par séance du groupe dans la période, de la plus ancienne à la plus récente. Case vide : séance
// hors inscription ou sans statut. Affiche ce que calcule le ticket 023, sans rien recalculer.
// Paramètres : `groupe`, puis `periode` (saison, mois) ou `du` et `au`.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { attendanceRate, formatRate } from '@/domain/attendanceRate';
import { toDisplayDate } from '@/domain/formats';
import { type StatsContext, useMemberStats } from '@/hooks/useStats';
import { AttendanceBar } from '@/ui/AttendanceBar';
import { Card } from '@/ui/Card';
import { Screen, Section } from '@/ui/Screen';
import { SessionSquares } from '@/ui/SessionSquares';
import { choiceFromParams, type StatsPeriodParams } from '@/ui/statsPeriodParams';

const m = labels.stats.memberScreen;

/** Identifiant de l'adresse : chiffres seulement, sinon 0 (aucun), comme la fiche membre. */
const idFrom = (param: string | undefined) => (param && /^\d+$/.test(param) ? Number(param) : 0);

/** « saison 2026-2027 » ou « du 01/11/2026 au 27/11/2026 ». */
const periodName = ({ season, period }: StatsContext) =>
  period.kind === 'season' && season
    ? m.season(season.name)
    : m.range(toDisplayDate(period.from), toDisplayDate(period.to));

export default function StatsMemberScreen() {
  const router = useRouter();
  const { id, groupe, ...params } = useLocalSearchParams<
    StatsPeriodParams & { id: string; groupe?: string }
  >();
  const { stats, loaded, loadFailed, inputError } = useMemberStats(
    idFrom(id),
    idFrom(groupe),
    choiceFromParams(params),
  );
  const member = stats?.member ?? null;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/stats'));
  const error = loadFailed
    ? labels.common.loadFailed
    : inputError !== null
      ? labels.errors[inputError]
      : loaded && member === null
        ? labels.errors.NOT_FOUND
        : undefined;

  return (
    <Screen
      title={
        member ? labels.memberForm.fullName(member.firstName, member.lastName) : labels.stats.title
      }
      subtitle={
        stats &&
        member && (
          <Text style={[styles.subtitle, styles.header]}>
            {m.subtitle(member.groupName, periodName(stats))}
          </Text>
        )
      }
      onBack={back}
      error={error}
    >
      {member && inputError === null && (
        <>
          <Card>
            <Text testID="member-rate" style={styles.number}>
              {formatRate(attendanceRate(member.counts))}
            </Text>
            <AttendanceBar counts={member.counts} />
            <Text style={[styles.subtitle, styles.counts]}>{m.counts(member.counts)}</Text>
          </Card>
          <Section title={m.bySession} />
          <Card>
            {member.sessions.length === 0 ? (
              <Text style={styles.subtitle}>{m.noSession}</Text>
            ) : (
              <>
                <SessionSquares sessions={member.sessions} />
                <Text style={styles.subtitle}>{m.legend}</Text>
              </>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing * 2 },
  number: { fontFamily: theme.fonts.digits, fontSize: 26, color: theme.colors.texte },
  subtitle: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  // Comptes en Plex Mono (maquette : « l-sous mono »).
  counts: { fontFamily: theme.fonts.digits, marginTop: theme.spacing * 2 },
});
