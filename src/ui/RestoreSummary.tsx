// Éléments de la restauration communs à l'écran Restauration (ticket 014e) et à l'écran de
// récupération (ticket 014f) : carte de résumé de la confirmation (maquette « Restaurer ? »),
// boutons « Annuler » et « Remplacer mes données », carte d'un refus ou d'un échec.
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import type { RejectReason } from '@/data/backupCheck';
import { toDisplayDate } from '@/domain/formats';
import type { Notice } from '@/hooks/restoreFlow';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';

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

/** Message d'un refus ou d'un échec (rien n'a été modifié), ou null pour tout autre état. */
export const refusalOf = (state: { step: string; reason?: RejectReason }): string | null => {
  if (state.step === 'rejected' && state.reason !== undefined) return REFUSED[state.reason];
  return state.step === 'failed' ? t.failed : null;
};

/**
 * Résumé de la sauvegarde avant de remplacer. `erase` : phrase de plus (variante abîmée de
 * l'écran de récupération) ; l'appel en cours n'est annoncé que s'il y en a un.
 */
export const RestoreSummary = ({ summary, draft, erase }: Notice & { erase?: string }) => {
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
      {erase !== undefined && <Text style={styles.text}>{erase}</Text>}
      {draft !== null && <Text style={styles.text}>{t.draft(draft.groupName)}</Text>}
    </Card>
  );
};

type ActionsProps = { busy: boolean; onCancel: () => void; onConfirm: () => void };

/** « Annuler » et « Remplacer mes données », désactivés pendant la restauration. */
export const RestoreActions = ({ busy, onCancel, onConfirm }: ActionsProps) => (
  <View style={styles.actions}>
    <Button label={t.cancel} variant="secondary" flex={1} onPress={onCancel} disabled={busy} />
    <Button label={t.confirm} variant="destructive" flex={2} onPress={onConfirm} disabled={busy} />
  </View>
);

/** Refus ou échec : son message, puis « Rien n'a été modifié. Choisissez un autre fichier. » */
export const RestoreRefusal = ({ message }: { message: string }) => (
  <Card>
    <Text style={styles.title}>{message}</Text>
    <Text style={styles.note}>{t.nothingChanged}</Text>
  </Card>
);

/** « Vérification du fichier… » (réponse du porteur du 2026-11-27). */
export const RestoreVerifying = () => <Text style={styles.note}>{t.verifying}</Text>;

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
