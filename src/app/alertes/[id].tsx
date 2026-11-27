// Alerte d'assiduité (maquette, F-04, EX-25, EX-26, ticket 022) : nom du membre, groupe et longueur
// de la série, dernières séances, « Voir ses contacts d'urgence » (recherche remplie par
// l'identifiant seul, ABS-04 ; décision du porteur du 2026-11-27) et « Marquer comme traitée ».
// Une alerte qui n'est plus montrée (traitée, série retombée) ramène à l'accueil, une seule fois,
// sans état vide ici, et seulement quand l'écran a le focus (sinon la recherche d'urgence ouverte
// par-dessus se fermerait). Un traitement refusé reste à l'écran, avec son message, et recharge.
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { useAlert } from '@/hooks/useAlerts';
import { useLocalNow } from '@/hooks/useLocalNow';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { errorMessage } from '@/ui/errorMessage';
import { Screen } from '@/ui/Screen';
import { SessionSquares } from '@/ui/SessionSquares';

const a = labels.alerts;

/** Identifiant de l'adresse : chiffres seulement, sinon 0 (aucun membre), comme la fiche membre. */
const idFrom = (param: string | undefined) => (param && /^\d+$/.test(param) ? Number(param) : 0);

export default function AlertDetail() {
  const router = useRouter();
  const memberId = idFrom(useLocalSearchParams<{ id: string }>().id);
  const today = useLocalNow().date;
  const { alert, recent, loaded, loadFailed, acknowledge } = useAlert(memberId, today);
  const [error, setError] = useState<string | undefined>();
  const focused = useIsFocused();
  // Une seule navigation : le rechargement qui suit le traitement ne doit pas revenir deux fois.
  const left = useRef(false);
  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  useEffect(() => {
    if (focused && loaded && !loadFailed && alert === null) leave();
  }, [focused, loaded, loadFailed, alert, leave]);

  const markDone = async () => {
    if (alert === null) return;
    setError(undefined);
    try {
      await acknowledge(alert.memberId, alert.streak);
      leave();
    } catch (e) {
      // Longueur périmée (série allongée entre la lecture et l'appui) : relire, puis réessayer.
      setError(errorMessage(e));
      notifyDataChanged();
    }
  };

  if (loadFailed)
    return <Screen title={a.section} onBack={leave} error={labels.common.loadFailed} />;
  // Pendant la lecture et après un départ : rien, pas d'en-tête au titre vide.
  if (alert === null) return null;
  return (
    <Screen
      title={labels.memberForm.fullName(alert.firstName, alert.lastName)}
      subtitle={<Text style={styles.subtitle}>{a.subtitle(alert.groupName, alert.streak)}</Text>}
      onBack={leave}
      error={error}
    >
      <Card>
        <Text style={styles.label}>{a.recent}</Text>
        <SessionSquares sessions={recent} />
        <Text style={styles.label}>{a.recentOrder}</Text>
      </Card>
      <Button
        label={a.contacts}
        variant="secondary"
        onPress={() => router.push(`/urgence?membre=${alert.memberId}`)}
      />
      <Button label={a.acknowledge} onPress={() => void markDone()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontFamily: theme.fonts.text,
    fontSize: 15,
    color: theme.colors.texteSecondaire,
    marginBottom: theme.spacing * 2,
  },
  label: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
});
