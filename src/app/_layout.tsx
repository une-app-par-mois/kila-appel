import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '@/config/theme';
import { expoRestoreDeps } from '@/data/expoFiles';
import {
  acceptEmptyDatabase,
  resetDatabase,
  retryDatabase,
  useDatabaseState,
} from '@/hooks/useDatabase';
import { useRecovery } from '@/hooks/useRecovery';
import { useReminderTap } from '@/hooks/useReminderTap';
import { useStartupCleanup } from '@/hooks/useStartupCleanup';
import { Recovery } from '@/ui/Recovery';

// Navigation racine (Expo Router). Les onglets sont dans `(tabs)/_layout.tsx`, le reste s'ouvre
// par-dessus, dans cette pile.
// EX-22 (ticket 014c) : ce layout lance l'ouverture de la base. Tant qu'elle n'est pas prête,
// une vue neutre vide ; en cas d'échec, l'écran de récupération. La pile n'est montée qu'une fois
// la base prête et les dossiers temporaires vidés (nettoyage fini, réussi ou non) : aucun écran
// Export ou Restauration ne s'ouvre pendant ce nettoyage. La restauration depuis l'écran de
// récupération (ticket 014f) vit ici : son état survit au passage d'une variante à l'autre, et la
// pile s'affiche d'elle-même (accueil) une fois la base restaurée.
// Racine des gestes : la poignée ≡ des contacts d'urgence (008b). Appui sur une relance (028c) :
// l'appel s'ouvre une fois la pile montée, jamais depuis l'écran de récupération.
export default function RootLayout() {
  const database = useDatabaseState();
  const cleaned = useStartupCleanup();
  const recovery = useRecovery(expoRestoreDeps, database.status);
  const showRecovery =
    database.status === 'failed' ||
    database.status === 'restoreFailed' ||
    database.status === 'erased';
  const ready = database.status === 'ready' && cleaned;
  useReminderTap(showRecovery ? 'recovery' : ready ? 'ready' : 'starting');
  const content = () => {
    if (showRecovery) {
      return (
        <Recovery
          database={database}
          restore={recovery}
          cleaned={cleaned}
          onRetry={retryDatabase}
          onStartOver={() => void resetDatabase()}
          onAcceptEmpty={acceptEmptyDatabase}
        />
      );
    }
    if (ready) {
      return <Stack screenOptions={{ headerShown: false }} />;
    }
    return <View testID="startup" style={styles.neutral} />;
  };
  return <GestureHandlerRootView style={styles.root}>{content()}</GestureHandlerRootView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  neutral: { flex: 1, backgroundColor: theme.colors.papier },
});
