// Appel (charte §7, maquette Appel) : pastille de statut et compteur. Couleur, icône et libellé
// ensemble, jamais la couleur seule (EX-10, NF-06).
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { STATUS_CYCLE } from '@/domain/attendance';
import type { AttendanceStatus } from '@/domain/validation';
import { Icon } from '@/ui/Icon';

/** Pastille : largeur minimale 84, rayon 10, Plex Sans 600 14, icône et libellé. */
export const StatusPill = ({ status }: { status: AttendanceStatus }) => {
  const colors = theme.statuses[status];
  return (
    <View style={[styles.pill, { backgroundColor: colors.fond }]}>
      <Icon name={status} color={colors.texte} size={16} />
      <Text style={[styles.pillText, { color: colors.texte }]}>{labels.statuses[status]}</Text>
    </View>
  );
};

/** Compteur : un carré à la couleur de chaque statut, son nombre et son libellé (Plex Mono). */
export const AttendanceCounter = ({ counts }: { counts: Record<AttendanceStatus, number> }) => (
  <View style={styles.counter}>
    {STATUS_CYCLE.map((status) => (
      <View key={status} style={styles.count}>
        <View style={[styles.square, { backgroundColor: theme.statuses[status].fond }]} />
        <Text style={styles.countText}>{labels.rollCall.counter[status](counts[status])}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  pill: {
    minWidth: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing,
    paddingHorizontal: theme.spacing * 2,
    paddingVertical: theme.spacing * 1.5,
    borderRadius: theme.radii.pastille,
  },
  pillText: { fontFamily: theme.fonts.textSemi, fontSize: 14 },
  counter: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing * 3.5, rowGap: 6 },
  count: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing * 1.5 },
  square: { width: 12, height: 12, borderRadius: 2 },
  countText: { fontFamily: theme.fonts.digits, fontSize: 14, color: theme.colors.texte },
});
