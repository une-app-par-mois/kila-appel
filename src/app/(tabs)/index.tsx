// Accueil (maquettes Accueil et Accueil avec un appel interrompu, ticket 012) : date du jour,
// recherche d'un contact d'urgence (EX-06), appel en cours ou séance du moment (EX-09, EX-14),
// appels manquants (EX-17), bandeau de sauvegarde en bas (EX-21, ticket 014d), même pendant un
// appel en cours. Hors de ce ticket : « Annuler » une séance (jalon 2) ; décisions du porteur du
// 2026-11-27. Bienvenue (P1, ticket 012b) remplace l'accueil tant qu'une étape reste et qu'aucun
// appel n'est fait, jamais pendant un appel en cours ; si l'avancement ne se lit pas, l'accueil
// s'affiche avec l'erreur (rien n'y est caché).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { weekdayOfDate } from '@/domain/occurrences';
import { useBackupBanner } from '@/hooks/useBackupReminder';
import { useLocalNow } from '@/hooks/useLocalNow';
import { useDraft, useMissingRollCalls } from '@/hooks/useRollCall';
import { useSetupProgress } from '@/hooks/useSeasons';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { MissingCalls } from '@/ui/MissingCalls';
import { RollCallEntry } from '@/ui/RollCallEntry';
import { Screen } from '@/ui/Screen';
import { isSetupDone, Welcome } from '@/ui/Welcome';

const h = labels.home;

export default function Home() {
  const router = useRouter();
  // L'heure avance d'elle-même (horloge partagée avec la barre d'onglets) : séance du moment et
  // appels manquants suivent, y compris au retour au premier plan.
  const now = useLocalNow();
  const [, month, day] = now.date.split('-').map(Number);
  const { missing, loadFailed } = useMissingRollCalls(now);
  const setup = useSetupProgress(now.date);
  // Bandeau illisible : caché, sans message (revue du 014d).
  const backupDays = useBackupBanner(now.date);
  // Seule l'existence d'un appel en cours compte ici (pas de Bienvenue pendant un appel).
  const { draft, loaded: draftLoaded } = useDraft();
  const [entryError, setEntryError] = useState<string | undefined>();
  const title = h.title(
    labels.weekdays[weekdayOfDate(now.date) - 1] ?? '',
    day ?? 0,
    h.months[(month ?? 1) - 1] ?? '',
  );
  // Rien tant que l'avancement n'est pas connu : ni Bienvenue ni accueil ne clignote.
  if (!setup.loadFailed && (!setup.progress || !draftLoaded)) return <Screen title={title} />;
  if (setup.progress && !draft && !isSetupDone(setup.progress))
    return (
      <Screen title={labels.welcome.title}>
        <Welcome progress={setup.progress} created={setup.created} anySeason={setup.anySeason} />
      </Screen>
    );
  return (
    <Screen
      title={title}
      error={loadFailed || setup.loadFailed ? labels.common.loadFailed : entryError}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labels.emergency.entry}
        onPress={() => router.push('/urgence')}
        style={({ pressed }) => [styles.search, pressed && styles.pressed]}
      >
        <Icon name="search" />
        <Text style={styles.searchText}>{labels.emergency.entry}</Text>
      </Pressable>
      <RollCallEntry now={now} onError={setEntryError} />
      <MissingCalls missing={missing} />
      {backupDays !== null && (
        <Card warning>
          <Text style={styles.bannerTitle}>{h.backupBanner(backupDays)}</Text>
          <Text style={styles.bannerText}>{h.backupBannerText}</Text>
          <Button label={h.backupNow} variant="secondary" onPress={() => router.push('/donnees')} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: theme.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: theme.spacing * 2,
    paddingHorizontal: theme.spacing * 3,
    marginVertical: theme.spacing * 1.5,
    backgroundColor: theme.colors.blanc,
    borderWidth: 1.5,
    borderColor: theme.colors.quadrillage,
    borderRadius: theme.radii.champ,
  },
  pressed: { opacity: 0.6 },
  bannerTitle: { fontFamily: theme.fonts.textSemi, fontSize: 17, color: theme.colors.texte },
  bannerText: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing,
    marginBottom: theme.spacing * 2.5,
  },
  searchText: {
    flex: 1,
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: theme.colors.texteSecondaire,
  },
});
