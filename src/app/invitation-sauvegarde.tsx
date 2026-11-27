// Invitation à sauvegarder (maquette « Invitation à sauvegarder », ticket 014d, EX-21) : une seule
// fois, après le premier appel enregistré. Ouverte par-dessus l'Historique (useSavedReturn) : « Plus
// tard » et le retour du système y ramènent ; « Sauvegarder maintenant » la remplace par l'écran
// Sauvegarde, dont le retour y ramène aussi. Pas de flèche de retour (maquette). Marquée vue dès
// qu'elle s'affiche ; si l'écriture échoue, elle reste affichée (un code au journal, ABS-04).
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { log } from '@/data/log';
import { settingsRepo } from '@/data/settingsRepo';
import { useDatabase } from '@/hooks/useDatabase';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';

const t = labels.backupInvite;

export default function BackupInvite() {
  const router = useRouter();
  const db = useDatabase();
  useEffect(() => {
    if (!db) return;
    settingsRepo(db)
      .markBackupInviteSeen()
      .catch(() => log('BACKUP_INVITE_SAVE_FAILED'));
  }, [db]);
  return (
    <Screen title={t.title}>
      <Card>
        <Text style={styles.title}>{t.cardTitle}</Text>
        <Text style={styles.text}>{t.text}</Text>
      </Card>
      <Button label={t.saveNow} onPress={() => router.replace('/donnees')} />
      <Button
        label={t.later}
        variant="secondary"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/historique'))}
      />
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
});
