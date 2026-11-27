// Cases des séances (maquettes « Alerte d'assiduité », ticket 022, et « Statistiques d'un membre »,
// ticket 025) : une case de 22 pt par séance, dans l'ordre reçu, non cliquable. Couleur, icône et
// libellé d'accessibilité (statut et date) ensemble, jamais la couleur seule (NF-06). Sans statut :
// case vide (fond Quadrillage, sans icône), « Hors inscription » ou « Sans statut » (RM-03).
import { StyleSheet, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { toDisplayDate } from '@/domain/formats';
import type { AttendanceStatus } from '@/domain/validation';
import { Icon } from '@/ui/Icon';

const SIZE = 22;

export type Square = {
  sessionId: number;
  date: string;
  status: AttendanceStatus | null;
  /** Inscrit au groupe ce jour-là (RM-03) ; ne sert qu'à nommer une case vide. */
  enrolled?: boolean;
};

const squareLabel = ({ date, status, enrolled }: Square) => {
  const shown = toDisplayDate(date);
  if (status !== null) return labels.alerts.square(labels.statuses[status], shown);
  return enrolled ? labels.stats.noStatus(shown) : labels.stats.notEnrolled(shown);
};

/**
 * `sessions` : déjà dans l'ordre voulu (alerte : la plus récente d'abord ; statistiques d'un
 * membre : la plus ancienne d'abord).
 */
export const SessionSquares = ({ sessions }: { sessions: Square[] }) => (
  <View style={styles.squares}>
    {sessions.map((square) => {
      const { status } = square;
      return (
        <View
          key={square.sessionId}
          testID="session-square"
          accessible
          accessibilityLabel={squareLabel(square)}
          style={[
            styles.square,
            { backgroundColor: status ? theme.statuses[status].fond : theme.colors.quadrillage },
          ]}
        >
          {status && <Icon name={status} color={theme.statuses[status].texte} size={14} />}
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
