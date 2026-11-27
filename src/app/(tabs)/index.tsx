// Accueil (maquettes Accueil et Accueil avec un appel interrompu, ticket 012) : date du jour, recherche
// d'un contact d'urgence (EX-06), appel en cours ou séance du moment (EX-09, EX-14), appels
// manquants (EX-17). Hors de ce ticket : « Annuler » une séance (jalon 2), bandeau de sauvegarde
// (ticket 014), Bienvenue (012b) ; décisions du porteur du 2026-11-27.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { toIsoDate, toLocalTime } from '@/domain/formats';
import { weekdayOfDate } from '@/domain/occurrences';
import { useMissingRollCalls } from '@/hooks/useRollCall';
import { Icon } from '@/ui/Icon';
import { MissingCalls } from '@/ui/MissingCalls';
import { RollCallEntry } from '@/ui/RollCallEntry';
import { Screen } from '@/ui/Screen';

const h = labels.home;

export default function Home() {
  const router = useRouter();
  // L'heure avance d'elle-même : séance du moment et appels manquants suivent (une fois par minute).
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const now = { date: toIsoDate(clock), time: toLocalTime(clock) };
  const { missing, loadFailed } = useMissingRollCalls(now);
  const [entryError, setEntryError] = useState<string | undefined>();
  const title = h.title(
    labels.weekdays[weekdayOfDate(now.date) - 1] ?? '',
    clock.getDate(),
    h.months[clock.getMonth()] ?? '',
  );
  return (
    <Screen title={title} error={loadFailed ? labels.common.loadFailed : entryError}>
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
  searchText: {
    flex: 1,
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: theme.colors.texteSecondaire,
  },
});
