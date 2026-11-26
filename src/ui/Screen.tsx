// Gabarit d'écran (charte §5, maquettes) : fond Papier à petits carreaux et marge rouge,
// en-tête (retour « ‹ » et titre), contenu qui défile à droite de la marge, zones sûres.
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { Icon } from '@/ui/Icon';

const { colors, materials } = theme;
// Opacité de la grille dans la maquette (.fond { opacity: .6 }).
const GRID_OPACITY = 0.6;

/** Petits carreaux et marge rouge : fond des écrans seulement, jamais dans une carte. */
const Paper = () => (
  <Svg style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
    <Defs>
      <Pattern
        id="carreaux"
        width={materials.carreau}
        height={materials.carreau}
        patternUnits="userSpaceOnUse"
      >
        <Path
          d={`M${materials.carreau} 0H0V${materials.carreau}`}
          stroke={colors.quadrillage}
          strokeWidth={materials.traitCarreau}
          fill="none"
        />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#carreaux)" opacity={GRID_OPACITY} />
    <Rect
      x={materials.margeX}
      width={materials.margeLargeur}
      height="100%"
      fill={colors.marge}
      opacity={materials.margeOpacite}
    />
  </Svg>
);

type Props = {
  title: string;
  /** Sous l'en-tête (saison, liens). */
  subtitle?: ReactNode;
  /** Sans `onBack`, pas de bouton retour (écran racine). */
  onBack?: () => void;
  /** Erreur de chargement, à la place du contenu attendu (CONV-15). */
  error?: string;
  children?: ReactNode;
};

export const Screen = ({ title, subtitle, onBack, error, children }: Props) => (
  <SafeAreaView style={styles.screen}>
    <Paper />
    <ScrollView testID="screen-scroll" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={labels.common.back}
            onPress={onBack}
            style={styles.back}
          >
            <Icon name="back" active />
          </Pressable>
        )}
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      </View>
      {subtitle}
      {error !== undefined && <Text style={styles.error}>{error}</Text>}
      {children}
    </ScrollView>
  </SafeAreaView>
);

/** Titre de section : petites capitales soulignées en Marge (maquettes). */
export const Section = ({ title }: { title: string }) => (
  <Text accessibilityRole="header" style={styles.section}>
    {title}
  </Text>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier },
  content: {
    paddingTop: theme.spacing * 4,
    paddingBottom: theme.spacing * 6,
    paddingLeft: materials.retraitContenu,
    paddingRight: materials.retraitDroit,
    width: '100%',
    maxWidth: theme.maxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing * 2,
    marginVertical: theme.spacing,
  },
  back: {
    minWidth: theme.minTouchTarget,
    minHeight: theme.minTouchTarget,
    marginLeft: -theme.spacing * 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontFamily: theme.fonts.title, fontSize: 28, color: colors.texte },
  error: {
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: colors.marge,
    marginVertical: theme.spacing * 3,
  },
  section: {
    alignSelf: 'flex-start',
    fontFamily: theme.fonts.textSemi,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.texte,
    marginTop: theme.spacing * 5,
    marginBottom: theme.spacing * 2,
    paddingBottom: 2,
    borderBottomWidth: 2.5,
    borderBottomColor: colors.marge,
  },
});
