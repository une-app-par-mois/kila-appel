// Ligne de liste (maquettes) : titre, sous-titre en Texte secondaire, chevron si elle s'ouvre.
// Accessibilité (NF-06) : une ligne qui s'ouvre est lue d'un bloc, détail compris ; un contenu
// interactif à droite (`right`) n'est permis que sur une ligne qui ne s'ouvre pas, pour rester
// joignable seul par le lecteur d'écran.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { Icon } from '@/ui/Icon';

type Common = {
  title: string;
  subtitle?: string;
  /** Texte court à droite (« 3 groupes »), lu avec la ligne. */
  detail?: string;
  /** Le chevron reçoit `${testID}-chevron`. */
  testID?: string;
};
type Props = Common &
  ({ onPress: () => void; right?: never } | { onPress?: never; right?: ReactNode });

const describe = (title: string, parts: (string | undefined)[]) =>
  parts.reduce<string>(
    (label, part) => (part === undefined ? label : labels.rowAccessibility(label, part)),
    title,
  );

export const ListRow = ({ title, subtitle, detail, onPress, right, testID }: Props) => {
  const content = (
    <>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {detail !== undefined && <Text style={styles.subtitle}>{detail}</Text>}
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
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={describe(title, [subtitle, detail])}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
      <View testID={testID && `${testID}-chevron`}>
        <Icon name="chevron" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing * 2,
    minHeight: theme.minTouchTarget,
    paddingVertical: theme.spacing * 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.quadrillage,
  },
  pressed: { opacity: 0.6 },
  texts: { flex: 1 },
  title: { fontFamily: theme.fonts.textSemi, fontSize: 17, color: theme.colors.texte },
  subtitle: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
});
