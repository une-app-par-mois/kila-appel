// Ligne de liste (maquettes) : titre, sous-titre en Texte secondaire, détail ou pastille à droite,
// chevron si elle s'ouvre. Accessibilité (NF-06) : la zone qui ouvre est lue d'un bloc (détail et
// pastille compris) ; un contenu interactif (`right`) reste hors de cette zone, joignable seul.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { Icon } from '@/ui/Icon';

type Props = {
  title: string;
  subtitle?: string;
  /** Sous-titre en Plex Mono (dates). */
  mono?: boolean;
  /** Texte court à droite (« 3 groupes »). */
  detail?: string;
  /** Pastille Encre à droite (« Active »). */
  badge?: string;
  onPress?: () => void;
  /** Chevron quand la ligne s'ouvre ; certaines maquettes n'en ont pas. */
  chevron?: boolean;
  /** Contenu interactif à droite, hors de la zone d'appui de la ligne. */
  right?: ReactNode;
  /** Le chevron reçoit `${testID}-chevron`. */
  testID?: string;
  /** Point Marge devant le titre (maquette Accueil : appel manquant) ; le titre dit déjà pourquoi. */
  dot?: boolean;
};

const describe = (title: string, parts: (string | undefined)[]) =>
  parts.reduce<string>(
    (label, part) => (part === undefined ? label : labels.rowAccessibility(label, part)),
    title,
  );

export const ListRow = (props: Props) => {
  const {
    title,
    subtitle,
    mono,
    detail,
    badge,
    onPress,
    chevron = true,
    right,
    testID,
    dot,
  } = props;
  const content = (
    <>
      {dot && <View style={styles.dot} />}
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {subtitle !== undefined && (
          <Text style={[styles.subtitle, mono && styles.mono]}>{subtitle}</Text>
        )}
      </View>
      {detail !== undefined && <Text style={styles.subtitle}>{detail}</Text>}
      {badge !== undefined && <Text style={styles.badge}>{badge}</Text>}
    </>
  );
  if (!onPress) {
    return (
      <View testID={testID} style={styles.row}>
        {content}
        {right}
      </View>
    );
  }
  const pressable = (
    <Pressable
      testID={right === undefined ? testID : undefined}
      accessibilityRole="button"
      accessibilityLabel={describe(title, [subtitle, detail, badge])}
      onPress={onPress}
      style={({ pressed }) => [
        right === undefined ? styles.row : styles.inner,
        pressed && styles.pressed,
      ]}
    >
      {content}
      {chevron && (
        <View testID={testID && `${testID}-chevron`}>
          <Icon name="chevron" />
        </View>
      )}
    </Pressable>
  );
  if (right === undefined) return pressable;
  return (
    <View testID={testID} style={styles.row}>
      {pressable}
      {right}
    </View>
  );
};

const rowBase = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing * 2,
  minHeight: theme.minTouchTarget,
} as const;

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.marge,
    marginRight: theme.spacing * 2,
  },
  row: {
    ...rowBase,
    paddingVertical: theme.spacing * 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.quadrillage,
  },
  inner: { ...rowBase, flex: 1 },
  pressed: { opacity: 0.6 },
  texts: { flex: 1 },
  title: { fontFamily: theme.fonts.textSemi, fontSize: 17, color: theme.colors.texte },
  subtitle: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  mono: { fontFamily: theme.fonts.digits },
  badge: {
    overflow: 'hidden',
    backgroundColor: theme.colors.encre,
    color: theme.colors.blanc,
    borderRadius: theme.radii.pastille,
    paddingHorizontal: theme.spacing * 2.5,
    paddingVertical: theme.spacing * 0.75,
    fontFamily: theme.fonts.textSemi,
    fontSize: 13,
  },
});
