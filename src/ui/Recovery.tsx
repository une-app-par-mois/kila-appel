// Écran de récupération (EX-22, ticket 014c ; maquette « Base illisible », trois variantes) :
// affiché par le layout racine à la place de la pile quand la base ne s'ouvre pas. Aucun lien
// vers un autre écran : rien ne s'ouvre tant que la base n'est pas prête.
// - abîmée : « Réessayer », puis « Repartir de zéro » après confirmation (« Restaurer une
//   sauvegarde » : ticket 014f) ;
// - réglage refusé ou erreur non reconnue : « Réessayer », sans action destructive ;
// - version plus récente : le message seul.
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import type { OpenFailure } from '@/data/open';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Screen } from '@/ui/Screen';

const t = labels.recovery;

type Props = {
  cause: OpenFailure;
  /** Nouvel essai ou remise à zéro en cours : boutons désactivés. */
  pending: boolean;
  /** Le dernier effacement n'a pas abouti : message sous les boutons. */
  resetFailed: boolean;
  onRetry: () => void;
  onStartOver: () => void;
};

export const Recovery = ({ cause, pending, resetFailed, onRetry, onStartOver }: Props) => {
  const [confirming, setConfirming] = useState(false);
  const damaged = cause === 'damaged';
  // Réponse du porteur du 2026-11-27 : une erreur non reconnue partage l'écran du réglage refusé.
  const retryOnly = cause === 'settings' || cause === 'unavailable';
  const newer = cause === 'newer';
  return (
    <Screen title={t.title}>
      {damaged && (
        <>
          <Card>
            <Text style={styles.text}>{t.damaged}</Text>
            <Text style={[styles.text, styles.next]}>{t.damagedChoice}</Text>
          </Card>
          <Button label={t.retry} onPress={onRetry} disabled={pending} />
          <Button
            label={t.startOver}
            variant="secondary"
            onPress={() => setConfirming(true)}
            disabled={pending}
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
          <Button label={t.retry} onPress={onRetry} disabled={pending} />
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
