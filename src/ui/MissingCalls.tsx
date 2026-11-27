// Appels manquants de l'accueil (maquette Accueil, EX-17) : les 5 plus récents, puis « et N
// autres » (décision du porteur du 2026-11-27) ; chacun ouvre son appel. Rien s'il n'y en a pas.
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { weekdayOfDate } from '@/domain/occurrences';
import type { MissingRollCall } from '@/hooks/useRollCall';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Section } from '@/ui/Screen';

const SHOWN = 5;
const h = labels.home;

export const missingLabel = (call: MissingRollCall) => {
  const [, month, day] = call.date.split('-').map(Number);
  return h.missingRow(
    labels.weekdays[weekdayOfDate(call.date) - 1] ?? '',
    day ?? 0,
    h.months[(month ?? 1) - 1] ?? '',
    call.startTime,
  );
};

export const MissingCalls = ({ missing }: { missing: MissingRollCall[] }) => {
  const router = useRouter();
  if (missing.length === 0) return null;
  const rest = missing.length - SHOWN;
  return (
    <>
      <Section title={h.missing} />
      <Card>
        {missing.slice(0, SHOWN).map((call) => (
          <ListRow
            key={`${call.slotId}|${call.date}`}
            testID="missing-call"
            dot
            title={call.groupName}
            subtitle={missingLabel(call)}
            onPress={() =>
              router.push({ pathname: '/appel', params: { creneau: call.slotId, date: call.date } })
            }
          />
        ))}
        {rest > 0 && <Text style={styles.more}>{h.more(rest)}</Text>}
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  more: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    paddingVertical: theme.spacing * 2,
  },
});
