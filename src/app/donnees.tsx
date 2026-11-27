// Sauvegarde (maquette « Sauvegarde et données », ticket 014b, EX-19, EX-21) : avertissement
// complet au-dessus du bouton (SEC-09, ABS-06 : jamais réduit), export par le partage du système,
// date de la dernière sauvegarde. Restauration (014e), conservation et tout effacer (015b) : à venir.
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { expoBackupDeps } from '@/data/expoFiles';
import { toLastBackup, useBackupExport, useLastBackup } from '@/hooks/useBackupExport';
import { useLocalNow } from '@/hooks/useLocalNow';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';

const t = labels.backup;

export default function Backup() {
  const router = useRouter();
  const { exportNow, busy, failed } = useBackupExport(expoBackupDeps);
  const { lastBackup, loaded, loadFailed } = useLastBackup();
  // Horloge partagée (ticket 012) : « aujourd'hui » devient « hier » après minuit, page ouverte.
  const now = useLocalNow();
  return (
    <Screen
      title={t.title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/parametres'))}
      error={loadFailed ? labels.common.loadFailed : undefined}
    >
      <Card warning>
        <Text style={styles.title}>{t.warningTitle}</Text>
        <Text style={styles.text}>
          {t.warningBefore}
          <Text style={styles.strong}>{t.warningStrong}</Text>
          {t.warningAfter}
        </Text>
      </Card>
      <Button label={t.export} onPress={() => void exportNow()} disabled={busy} />
      {failed && <Text style={styles.error}>{t.exportFailed}</Text>}
      {loaded && <Text style={styles.note}>{t.last(toLastBackup(lastBackup, now.date))}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: theme.fonts.textSemi, fontSize: 17, color: theme.colors.texte },
  text: {
    fontFamily: theme.fonts.text,
    fontSize: 15,
    color: theme.colors.texte,
    marginTop: theme.spacing,
  },
  strong: { fontFamily: theme.fonts.title },
  note: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing * 2,
  },
  error: {
    fontFamily: theme.fonts.text,
    fontSize: 15,
    color: theme.colors.marge,
    marginTop: theme.spacing * 2,
  },
});
