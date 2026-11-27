// Cases des dernières séances (maquette « Alerte d'assiduité », ticket 022 ; reprises par le 025) :
// une case de 22 pt par séance, la plus récente d'abord, non cliquable. Couleur, icône et libellé
// d'accessibilité (statut et date) ensemble, jamais la couleur seule (NF-06).
import { StyleSheet, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import type { RecentStatus } from '@/data/alertsRepo';
import { toDisplayDate } from '@/domain/formats';
import { Icon } from '@/ui/Icon';

const SIZE = 22;

/** `sessions` : déjà dans l'ordre, de la plus récente à la plus ancienne. */
export const SessionSquares = ({ sessions }: { sessions: RecentStatus[] }) => (
  <View style={styles.squares}>
    {sessions.map(({ sessionId, date, status }) => {
      const colors = theme.statuses[status];
      return (
        <View
          key={sessionId}
          testID="session-square"
          accessible
          accessibilityLabel={labels.alerts.square(labels.statuses[status], toDisplayDate(date))}
          style={[styles.square, { backgroundColor: colors.fond }]}
        >
          <Icon name={status} color={colors.texte} size={14} />
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  squares: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing, marginVertical: 6 },
  square: {
    width: SIZE,
    height: SIZE,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
