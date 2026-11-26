// Ligne de liste (maquettes) : titre, sous-titre en Texte secondaire, chevron si elle s'ouvre.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { Icon } from '@/ui/Icon';

type Props = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Contenu à droite (pastille, bouton) ; le chevron s'ajoute seul quand la ligne s'ouvre. */
  right?: ReactNode;
};

export const ListRow = ({ title, subtitle, onPress, right }: Props) => {
  const content = (
    <>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
      {onPress && (
        <View testID="chevron">
          <Icon name="chevron" />
        </View>
      )}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle === undefined ? title : labels.rowAccessibility(title, subtitle)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
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
