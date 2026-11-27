// Écran de récupération (EX-22, tickets 014c et 014f ; maquette « Base illisible », trois
// variantes) : affiché par le layout racine à la place de la pile quand la base ne s'ouvre pas.
// Aucun lien vers un autre écran : rien ne s'ouvre tant que la base n'est pas prête.
// - abîmée : « Restaurer une sauvegarde » (principal), « Réessayer », puis « Repartir de zéro »
//   après confirmation ; la restauration se vérifie et se confirme sur cet écran (ticket 014f) ;
// - recopie en échec après l'effacement (ticket 014f) : « Choisir un fichier… » ou « Repartir de
//   zéro » (base vide, sans confirmation) ;
// - réglage refusé ou erreur non reconnue : « Réessayer », sans action destructive ;
// - version plus récente : le message seul.
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import type { OpenFailure } from '@/data/open';
import type { RecoveryControls } from '@/hooks/useRecovery';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import {
  RestoreActions,
  RestoreRefusal,
  RestoreSummary,
  RestoreVerifying,
  refusalOf,
} from '@/ui/RestoreSummary';
import { Screen } from '@/ui/Screen';

const t = labels.recovery;

/** État de la base vu par cet écran (src/hooks/useDatabase.ts). */
export type RecoveryDatabase =
  | { status: 'failed'; cause: OpenFailure; pending: boolean; resetFailed: boolean }
  | { status: 'restoreFailed'; pending: boolean };

type Props = {
  database: RecoveryDatabase;
  /** Restauration depuis cet écran (ticket 014f). */
  restore: RecoveryControls;
  /** Nettoyage du démarrage fini : la restauration peut commencer. */
  cleaned: boolean;
  onRetry: () => void;
  onStartOver: () => void;
  /** Recopie en échec : garder la base vide (vers Bienvenue). */
  onAcceptEmpty: () => void;
};

/** Vérification, refus ou échec d'une restauration, au-dessus des boutons de la variante. */
const RestoreStatus = ({ restore }: { restore: RecoveryControls }) => {
  const refused = refusalOf(restore.state);
  if (restore.state.step === 'verifying') return <RestoreVerifying />;
  return refused === null ? null : <RestoreRefusal message={refused} />;
};

export const Recovery = (props: Props) => {
  const { database, restore, cleaned, onRetry, onStartOver, onAcceptEmpty } = props;
  const [confirming, setConfirming] = useState(false);
  const { state } = restore;
  const notice =
    state.step === 'confirm' || state.step === 'restoring' || state.step === 'done' ? state : null;
  // Toute la séquence (sélecteur, vérification, confirmation, recopie) : boutons désactivés.
  const running = state.step !== 'idle' && refusalOf(state) === null;
  const locked = database.pending || running;

  if (notice !== null) {
    const erasing = database.status === 'failed';
    return (
      <Screen title={t.title}>
        <RestoreSummary
          summary={notice.summary}
          draft={null}
          erase={erasing ? t.restoreErase : undefined}
        />
        <RestoreActions
          busy={state.step !== 'confirm' || database.pending}
          onCancel={restore.cancel}
          onConfirm={restore.confirm}
        />
      </Screen>
    );
  }
  if (database.status === 'restoreFailed') {
    return (
      <Screen title={t.title}>
        <Card>
          <Text style={styles.text}>{t.restoreFailed}</Text>
        </Card>
        <RestoreStatus restore={restore} />
        <Button
          label={labels.restore.choose}
          onPress={() => void restore.choose()}
          disabled={locked}
        />
        <Button label={t.startOver} variant="secondary" onPress={onAcceptEmpty} disabled={locked} />
      </Screen>
    );
  }
  const { cause, resetFailed } = database;
  // Réponse du porteur du 2026-11-27 : une erreur non reconnue partage l'écran du réglage refusé.
  const retryOnly = cause === 'settings' || cause === 'unavailable';
  const damaged = cause === 'damaged';
  const newer = cause === 'newer';
  return (
    <Screen title={t.title}>
      {damaged && (
        <>
          <Card>
            <Text style={styles.text}>{t.damaged}</Text>
            <Text style={[styles.text, styles.next]}>{t.damagedChoice}</Text>
          </Card>
          <RestoreStatus restore={restore} />
          <Button
            label={t.restore}
            onPress={() => void restore.choose()}
            disabled={locked || !cleaned}
          />
          <Button label={t.retry} variant="secondary" onPress={onRetry} disabled={locked} />
          <Button
            label={t.startOver}
            variant="secondary"
            onPress={() => setConfirming(true)}
            disabled={locked}
          />
          {resetFailed && <Text style={styles.error}>{t.resetFailed}</Text>}
          <ConfirmDialog
            visible={confirming}
            title={t.confirmTitle}
            message={t.confirmMessage}
            cancelLabel={t.confirmCancel}
            confirmLabel={t.confirm}
            onCancel={() => setConfirming(false)}
            onConfirm={() => {
              setConfirming(false);
              onStartOver();
            }}
          />
        </>
      )}
      {retryOnly && (
        <>
          <Card>
            <Text style={styles.text}>{t.settings}</Text>
          </Card>
          <Button label={t.retry} onPress={onRetry} disabled={database.pending} />
        </>
      )}
      {newer && (
        <Card>
          <Text style={styles.text}>{t.newer}</Text>
        </Card>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  text: { fontFamily: theme.fonts.text, fontSize: 15, color: theme.colors.texte },
  next: { marginTop: theme.spacing * 2 },
  error: {
    fontFamily: theme.fonts.text,
    fontSize: 15,
    color: theme.colors.marge,
    marginTop: theme.spacing * 2,
  },
});
