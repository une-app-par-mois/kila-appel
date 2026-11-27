// Alertes d'assiduité de l'accueil (maquettes « Accueil complet » et « États vides du lot 2 »,
// EX-25, ticket 022) : les 5 premières, puis « et N autres », comme les appels manquants
// (décision du porteur du 2026-11-27) ; un appui ouvre l'alerte. Sans alerte : l'état vide avec le
// seuil réglé, seulement une fois la liste et le seuil lus. La route ne porte que l'identifiant
// du membre (ABS-04).
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import type { AttendanceAlert } from '@/data/alertsRepo';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Screen';

const SHOWN = 5;
const a = labels.alerts;

/** Ligne d'alerte : nom (600), groupe (Texte secondaire), « N absences » (Plex Mono, Marge). */
const AlertRow = ({ alert }: { alert: AttendanceAlert }) => {
  const router = useRouter();
  const name = labels.memberForm.fullName(alert.firstName, alert.lastName);
  const count = a.absences(alert.streak);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={labels.rowAccessibility(
        labels.rowAccessibility(name, alert.groupName),
        count,
      )}
      onPress={() => router.push(`/alertes/${alert.memberId}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.texts}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.group}>{alert.groupName}</Text>
      </View>
      <Text style={styles.count}>{count}</Text>
    </Pressable>
  );
};

type Props = {
  /** `null` tant que la liste n'est pas lue. */
  alerts: AttendanceAlert[] | null;
  /** `null` tant que le seuil n'est pas lu. */
  threshold: number | null;
};

export const AttendanceAlerts = ({ alerts, threshold }: Props) => {
  if (alerts === null || (alerts.length === 0 && threshold === null)) return null;
  const rest = alerts.length - SHOWN;
  return (
    <>
      <Section title={a.section} />
      <Card>
        {alerts.length === 0 && threshold !== null && (
          <Text style={styles.empty}>{a.empty(threshold)}</Text>
        )}
        {alerts.slice(0, SHOWN).map((alert) => (
          <AlertRow key={alert.memberId} alert={alert} />
        ))}
        {rest > 0 && <Text style={styles.more}>{a.more(rest)}</Text>}
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
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
  texts: { flex: 1 },
  name: { fontFamily: theme.fonts.textSemi, fontSize: 17, color: theme.colors.texte },
  group: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  count: { fontFamily: theme.fonts.digits, fontSize: 15, color: theme.colors.marge },
  empty: { fontFamily: theme.fonts.text, fontSize: 15, color: theme.colors.texte },
  more: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    paddingVertical: theme.spacing * 2,
  },
});
