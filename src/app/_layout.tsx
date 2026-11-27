import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '@/config/theme';
import { resetDatabase, retryDatabase, useDatabaseState } from '@/hooks/useDatabase';
import { useStartupCleanup } from '@/hooks/useStartupCleanup';
import { Recovery } from '@/ui/Recovery';

// Navigation racine (Expo Router). Les onglets sont dans `(tabs)/_layout.tsx`, le reste s'ouvre
// par-dessus, dans cette pile.
// EX-22 (ticket 014c) : ce layout lance l'ouverture de la base. Tant qu'elle n'est pas prête,
// une vue neutre vide ; en cas d'échec, l'écran de récupération. La pile n'est montée qu'une fois
// la base prête et les dossiers temporaires vidés (nettoyage fini, réussi ou non) : aucun écran
// Export ou Restauration ne s'ouvre pendant ce nettoyage.
// Racine des gestes : la poignée ≡ des contacts d'urgence (008b).
export default function RootLayout() {
  const database = useDatabaseState();
  const cleaned = useStartupCleanup();
  const content = () => {
    if (database.status === 'failed') {
      return (
        <Recovery
          cause={database.cause}
          pending={database.pending}
          resetFailed={database.resetFailed}
          onRetry={retryDatabase}
          onStartOver={() => void resetDatabase()}
        />
      );
    }
    if (database.status === 'ready' && cleaned) {
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
