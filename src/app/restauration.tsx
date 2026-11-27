// Restauration d'une sauvegarde (maquette « Restaurer ? », ticket 014e, EX-20, NF-04, SEC-10 ;
// zone sensible). L'écran lance le sélecteur dès son ouverture ; le fichier est vérifié sur une
// copie, résumé, puis remplace toutes les données après confirmation. Un refus dit pourquoi et
// que rien n'a été modifié. Pendant la restauration, l'écran ne peut pas être quitté (bouton, geste
// ou retour du système) : un échec s'affiche toujours.
import { usePreventRemove, useRouter } from 'expo-router';
import { labels } from '@/config/libelles';
import { expoRestoreDeps } from '@/data/expoFiles';
import { useRestore } from '@/hooks/useRestore';
import { Button } from '@/ui/Button';
import {
  RestoreActions,
  RestoreRefusal,
  RestoreSummary,
  RestoreVerifying,
  refusalOf,
} from '@/ui/RestoreSummary';
import { Screen } from '@/ui/Screen';

const t = labels.restore;

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
  // Retour du système et geste bloqués pendant la restauration (revue du 014e).
  usePreventRemove(restoring);
  const busy = restoring || state.step === 'done';
  const shown = state.step === 'confirm' || busy ? state : null;
  const refused = refusalOf(state);
  const verifying = state.step === 'verifying';

  return (
    <Screen title={t.title} onBack={busy ? undefined : leave}>
      {verifying && <RestoreVerifying />}
      {shown !== null && (
        <>
          <RestoreSummary summary={shown.summary} draft={shown.draft} />
          <RestoreActions busy={busy} onCancel={leave} onConfirm={confirm} />
        </>
      )}
      {refused !== null && (
        <>
          <RestoreRefusal message={refused} />
          <Button label={t.choose} variant="secondary" onPress={() => void choose()} />
        </>
      )}
    </Screen>
  );
}
