// Bienvenue (maquette, P1, ticket 012b) : les 4 étapes de la mise en route, faites ou non, et un
// seul bouton, sur la première étape qui reste. Affiché tant qu'une étape reste et qu'aucun appel
// n'est fait dans la saison, jamais pendant un appel en cours ; rien n'est enregistré (décisions du
// porteur du 2026-11-27).
import { type Href, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import type { SetupProgress } from '@/data/seasonsRepo';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';

const w = labels.welcome;

type Step = { title: string; subtitle?: string; done: boolean; action: string; href: Href };

/** Étapes de la mise en route, dans l'ordre de la maquette. */
export const setupSteps = (p: SetupProgress, created: boolean, anySeason = true): Step[] => [
  {
    title: w.season,
    // Une saison nommée à la main s'affiche telle quelle (« Saison 26-27 », pas « Saison Saison »).
    subtitle: p.season
      ? created
        ? w.seasonCreated(p.season.name)
        : p.season.name
      : anySeason
        ? w.noActiveSeason
        : w.noSeason,
    done: p.season !== null,
    action: anySeason ? w.chooseSeason : w.createSeason,
    href: '/saisons',
  },
  {
    title: w.group,
    subtitle: w.groupHint,
    done: p.groups > 0,
    action: w.createGroup,
    href: '/groupes/nouveau',
  },
  {
    title: w.members,
    done: p.members > 0,
    action: w.addMembers,
    // L'inscription au groupe (maquette) : membres existants, ou « Nouveau membre » à un appui.
    href: `/groupes/${p.firstGroupId ?? 0}/inscrire`,
  },
  { title: w.slots, done: p.slots > 0, action: w.addSlots, href: '/creneaux/nouveau' },
];

/** Après le premier appel de la saison, plus de Bienvenue, même s'il manque une étape. */
export const isSetupDone = (p: SetupProgress) =>
  p.sessions > 0 || setupSteps(p, false).every((s) => s.done);

type Props = { progress: SetupProgress; created: boolean; anySeason: boolean };

export const Welcome = ({ progress, created, anySeason }: Props) => {
  const router = useRouter();
  const steps = setupSteps(progress, created, anySeason);
  const next = steps.findIndex((s) => !s.done);
  return (
    <>
      <Text style={styles.intro}>{w.intro}</Text>
      <Card>
        {steps.map((step, i) => (
          <View key={step.title}>
            <View style={styles.step}>
              <View style={[styles.badge, step.done && styles.badgeDone]}>
                {step.done ? (
                  <Icon name="check" color={theme.colors.blanc} size={16} />
                ) : (
                  <Text style={styles.number}>{i + 1}</Text>
                )}
              </View>
              <View style={styles.texts}>
                <Text style={[styles.title, step.done && styles.titleDone]}>{step.title}</Text>
                {step.subtitle !== undefined && (
                  <Text style={styles.subtitle}>{step.subtitle}</Text>
                )}
              </View>
            </View>
            {i === next && <Button label={step.action} onPress={() => router.push(step.href)} />}
          </View>
        ))}
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  intro: {
    fontFamily: theme.fonts.text,
    fontSize: 15,
    color: theme.colors.texteSecondaire,
    marginBottom: theme.spacing * 2,
  },
  step: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing * 2 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.encre,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing * 3,
  },
  badgeDone: { backgroundColor: theme.colors.encre },
  number: { fontFamily: theme.fonts.digits, fontSize: 14, color: theme.colors.encre },
  texts: { flex: 1 },
  title: { fontFamily: theme.fonts.textSemi, fontSize: 16, color: theme.colors.texte },
  titleDone: { color: theme.colors.texteSecondaire },
  subtitle: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: 2,
  },
});
