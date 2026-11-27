// Barre d'onglets (maquette) : Accueil, place de Stats, « Nouvel appel » en rond au centre,
// Historique, Paramètres. Cinq places de même largeur (décision du porteur du 2026-11-27) : la place
// de Stats reste vide jusqu'au jalon 2, le rond ne bouge plus.
// Le rond n'est pas un onglet : il ouvre l'appel par-dessus (`useNewRollCallRoute`).
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { useLocalNow } from '@/hooks/useLocalNow';
import { useNewRollCallRoute } from '@/hooks/useRollCall';
import { Icon } from '@/ui/Icon';

const t = labels.tabs;
const TABS = {
  index: { label: t.home, icon: 'home' },
  historique: { label: t.history, icon: 'list' },
  parametres: { label: t.settings, icon: 'settings' },
} as const;

export const TabBar = ({ state, navigateToTab, insets }: BottomTabBarProps) => {
  const router = useRouter();
  // Même horloge que l'accueil : le rond ouvre la séance affichée sous « Maintenant ».
  const route = useNewRollCallRoute(useLocalNow());

  const tab = (index: number) => {
    const r = state.routes[index];
    const spec = r && TABS[r.name as keyof typeof TABS];
    if (!r || !spec) return null;
    const active = state.index === index;
    return (
      <Pressable
        key={r.key}
        accessibilityRole="button"
        accessibilityLabel={spec.label}
        accessibilityState={{ selected: active }}
        onPress={() => navigateToTab(r.key)}
        style={styles.tab}
      >
        <Icon name={spec.icon} active={active} />
        <Text style={[styles.label, active && styles.active]}>{spec.label}</Text>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityLabel={t.label}
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, theme.spacing) }]}
    >
      {tab(0)}
      {/* Place de Stats (jalon 2) : vide, ni appuyable ni lue (décision du porteur du 2026-11-27). */}
      <View
        testID="tab-placeholder"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.tab}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.newRollCall}
        disabled={route === null}
        onPress={() => route && router.push(route)}
        style={styles.tab}
      >
        <View style={styles.round}>
          <Icon name="check" color={theme.colors.blanc} size={28} />
        </View>
        <Text style={styles.label}>{t.newRollCall}</Text>
      </Pressable>
      {tab(1)}
      {tab(2)}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: theme.spacing,
    backgroundColor: theme.colors.blanc,
    borderTopWidth: 1,
    borderTopColor: theme.colors.quadrillage,
  },
  tab: {
    flex: 1,
    minWidth: theme.minTouchTarget,
    minHeight: theme.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing,
  },
  label: {
    fontFamily: theme.fonts.textSemi,
    fontSize: 12,
    color: theme.colors.texteSecondaire,
    marginTop: 2,
  },
  active: { color: theme.colors.encre },
  round: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginTop: -28,
    backgroundColor: theme.colors.encre,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
