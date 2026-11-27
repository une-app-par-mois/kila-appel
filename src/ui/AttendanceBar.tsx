// Barre empilée par statut (maquette « Statistiques », EX-27) : parts calculées par le domaine
// (`statusShares`, ticket 023), ordre Présent, Retard, Excusé, Absent ; 12 pt de haut, rayon 4.
// Jamais la couleur seule (NF-06) : un libellé d'accessibilité donne les parts non nulles, et la
// légende `AttendanceLegend` nomme chaque couleur. Réutilisée au ticket 025.
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { NBSP, SHARE_ORDER, type StatusCounts, statusShares } from '@/domain/attendanceRate';

/** Barre d'un compte de présences ; rien sans aucune présence. */
export const AttendanceBar = ({ counts }: { counts: StatusCounts }) => {
  const shares = statusShares(counts);
  const parts = SHARE_ORDER.filter((status) => shares[status] > 0);
  if (parts.length === 0) return null;
  const label = parts
    .map((status) => labels.stats.share(`${shares[status]}${NBSP}%`, labels.statuses[status]))
    .join(', ');
  return (
    <View testID="attendance-bar" accessible accessibilityLabel={label} style={styles.bar}>
      {parts.map((status) => (
        <View
          key={status}
          style={{ flex: shares[status], backgroundColor: theme.statuses[status].fond }}
        />
      ))}
    </View>
  );
};

/** Légende des statuts (maquette) : un carré de couleur et son libellé. */
export const AttendanceLegend = () => (
  <View testID="attendance-legend" style={styles.legend}>
    {SHARE_ORDER.map((status) => (
      <View key={status} style={styles.item}>
        <View style={[styles.square, { backgroundColor: theme.statuses[status].fond }]} />
        <Text style={styles.text}>{labels.statuses[status]}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: theme.radii.barre,
    overflow: 'hidden',
    marginTop: theme.spacing * 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: theme.spacing * 4,
    rowGap: theme.spacing * 2,
    marginVertical: theme.spacing * 2,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing * 1.5 },
  square: { width: 12, height: 12, borderRadius: 3 },
  text: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texte },
});
