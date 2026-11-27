// Invitation à sauvegarder (maquette « Invitation à sauvegarder », ticket 014d, EX-21) : une seule
// fois, après le premier appel enregistré. Ouverte par-dessus l'Historique (useSavedReturn) : « Plus
// tard » et le retour du système y ramènent ; « Sauvegarder maintenant » la remplace par l'écran
// Sauvegarde, dont le retour y ramène aussi. Pas de flèche de retour (maquette). Marquée vue dès
// qu'elle s'affiche ; si l'écriture échoue, elle reste affichée (un code au journal, ABS-04).
// Ouverte sans être due (lien profond, navigation restaurée) ou réglages illisibles : l'Historique,
// sans rien écrire (revue du 014d).
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { log } from '@/data/log';
import { settingsRepo } from '@/data/settingsRepo';
import { needsBackupInvite } from '@/hooks/useBackupReminder';
import { useDatabase } from '@/hooks/useDatabase';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';

const t = labels.backupInvite;

export default function BackupInvite() {
  const router = useRouter();
  const db = useDatabase();
  const [due, setDue] = useState(false);
  // Une seule vérification par affichage : une fois marquée vue, elle ne serait plus « due ».
  const checked = useRef(false);
  const left = useRef(false);
  useEffect(() => {
    left.current = false;
    return () => {
      left.current = true;
    };
  }, []);
  useEffect(() => {
    if (!db || checked.current) return;
    checked.current = true;
    const show = async () => {
      const needed = await needsBackupInvite(db).catch(() => {
        log('BACKUP_INVITE_LOAD_FAILED');
        return false;
      });
      if (left.current) return;
      if (!needed) {
        router.replace('/historique');
        return;
      }
      setDue(true);
      await settingsRepo(db)
        .markBackupInviteSeen()
        .catch(() => log('BACKUP_INVITE_SAVE_FAILED'));
    };
    void show();
  }, [db, router]);
  if (!due) return <Screen title={t.title} />;
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
