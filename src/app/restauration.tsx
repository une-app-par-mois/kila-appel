// Restauration d'une sauvegarde (maquette « Restaurer ? », ticket 014e, EX-20, NF-04, SEC-10 ;
// zone sensible). L'écran lance le sélecteur dès son ouverture ; le fichier est vérifié sur une
// copie, résumé, puis remplace toutes les données après confirmation. Un refus dit pourquoi et
// que rien n'a été modifié.
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import type { RejectReason } from '@/data/backupCheck';
import { expoRestoreDeps } from '@/data/expoFiles';
import { toDisplayDate } from '@/domain/formats';
import { type RestoreState, useRestore } from '@/hooks/useRestore';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';

const t = labels.restore;

// Messages du porteur (2026-11-27) : la cause précise reste dans le journal, pas à l'écran.
const REFUSED: Record<RejectReason, string> = {
  NOT_SQLITE: t.notABackup,
  NOT_A_BACKUP: t.notABackup,
  TOO_LARGE: t.notABackup,
  DAMAGED: t.damaged,
  INVALID_DATA: t.damaged,
  NEWER_VERSION: t.newerVersion,
};

type Shown = Extract<RestoreState, { step: 'confirm' | 'restoring' }>;

const Summary = ({ state }: { state: Shown }) => {
  const { summary, draft } = state;
  const date = summary.backupDate === null ? null : toDisplayDate(summary.backupDate);
  return (
    <Card warning testID="restore-summary">
      <Text style={styles.title}>{t.backupOf(date)}</Text>
      <Text style={styles.counts}>
        {t.counts(summary.members, summary.groups, summary.recordedSessions)}
      </Text>
      <Text style={styles.text}>
        {t.replaceBefore}
        <Text style={styles.strong}>{t.replaceStrong}</Text>
        {t.replaceAfter}
      </Text>
      {draft !== null && <Text style={styles.text}>{t.draft(draft.groupName)}</Text>}
    </Card>
  );
};

export default function Restore() {
  const router = useRouter();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/donnees'));
  const { state, choose, confirm, cancel } = useRestore(expoRestoreDeps, {
    onCancel: back,
    // Accueil sans retour possible vers la confirmation, sans message.
    onDone: () => {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/');
    },
  });
  const leave = () => {
    cancel();
    back();
  };
  const restoring = state.step === 'restoring';
  const shown = state.step === 'confirm' || restoring ? state : null;
  const refused =
    state.step === 'rejected' ? REFUSED[state.reason] : state.step === 'failed' ? t.failed : null;

  return (
    <Screen title={t.title} onBack={restoring ? undefined : leave}>
      {shown !== null && (
        <>
          <Summary state={shown} />
          <View style={styles.actions}>
            <Button
              label={t.cancel}
              variant="secondary"
              flex={1}
              onPress={leave}
              disabled={restoring}
            />
            <Button
              label={t.confirm}
              variant="destructive"
              flex={2}
              onPress={confirm}
              disabled={restoring}
            />
          </View>
        </>
      )}
      {refused !== null && (
        <>
          <Card>
            <Text style={styles.title}>{refused}</Text>
            <Text style={styles.note}>{t.nothingChanged}</Text>
          </Card>
          <Button label={t.choose} variant="secondary" onPress={() => void choose()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: theme.fonts.textSemi, fontSize: 17, color: theme.colors.texte },
  counts: {
    fontFamily: theme.fonts.digits,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing,
  },
  text: {
    fontFamily: theme.fonts.text,
    fontSize: 15,
    color: theme.colors.texte,
    marginTop: theme.spacing * 2,
  },
  strong: { fontFamily: theme.fonts.title },
  note: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing,
  },
  actions: { flexDirection: 'row', gap: theme.spacing * 2.5, marginTop: theme.spacing * 3 },
});
