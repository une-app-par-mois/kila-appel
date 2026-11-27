// Tout effacer (maquette « Tout effacer », ticket 015f, EX-23, SEC-10, SEC-11, ABS-05 ; zone
// sensible). Double confirmation (réponse du porteur du 2026-11-27) : le bouton « Tout effacer… »
// qui ouvre cet écran, puis le mot EFFACER et le bouton rouge, sans boîte en plus. L'effacement
// prend le verrou commun, vide la base ouverte puis les copies du cache ; ensuite Bienvenue, qui
// recrée la saison comme à une installation neuve. Pendant l'effacement, l'écran ne peut pas être
// quitté (bouton, geste ou retour du système), comme l'écran Restauration.
import { usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { clearCacheCopies } from '@/hooks/cacheCopies';
import { useFileLock } from '@/hooks/fileLock';
import { type EraseAllDeps, useEraseAll } from '@/hooks/useErase';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.eraseAll;

/** SEC-10 : les trois dossiers du cache, vidés ensemble ; refusé si l'un d'eux a échoué. */
const deps: EraseAllDeps = {
  clearCopies: async () => {
    if (!(await clearCacheCopies())) throw new Error('copies');
  },
};

/** Le mot tapé, majuscules et espaces autour ignorés (réponse du porteur du 2026-11-27). */
const matches = (typed: string) => typed.trim().toUpperCase() === t.word;

export default function EraseAll() {
  const router = useRouter();
  const { erasing, eraseNow } = useEraseAll(deps);
  const locked = useFileLock() !== null;
  const [typed, setTyped] = useState('');
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  // Un seul effacement par appui, même avant que l'écran ne se redessine.
  const started = useRef(false);
  // Retour du système et geste bloqués pendant l'effacement.
  usePreventRemove(erasing);
  const busy = erasing || done;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/donnees'));

  // Bienvenue sans retour possible vers cet écran, une fois le blocage du retour levé.
  useEffect(() => {
    if (!done) return;
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  }, [done, router]);

  const confirm = async () => {
    if (started.current) return;
    started.current = true;
    setFailed(false);
    const ok = await eraseNow();
    started.current = false;
    if (ok) setDone(true);
    else setFailed(true);
  };

  return (
    <Screen title={t.title} onBack={busy ? undefined : back}>
      <Card warning>
        <Text style={styles.text}>
          {t.warningBefore}
          <Text style={styles.strong}>{t.warningStrong}</Text>
          {t.warningAfter}
        </Text>
        <Text style={styles.note}>{t.warningNote}</Text>
      </Card>
      <TextField
        label={t.field}
        value={typed}
        onChangeText={setTyped}
        placeholder={t.word}
        mono
        capitals
        editable={!busy}
      />
      <View style={styles.actions}>
        <Button label={t.cancel} variant="secondary" flex={1} onPress={back} disabled={busy} />
        <Button
          label={t.confirm}
          variant="destructive"
          flex={2}
          onPress={() => void confirm()}
          disabled={busy || locked || !matches(typed)}
        />
      </View>
      {failed && <Text style={styles.error}>{t.failed}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: theme.fonts.text, fontSize: 15, color: theme.colors.texte },
  strong: { fontFamily: theme.fonts.title },
  note: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing * 2,
  },
  actions: { flexDirection: 'row', gap: theme.spacing * 2.5, marginTop: theme.spacing * 2 },
  error: {
    fontFamily: theme.fonts.text,
    fontSize: 15,
    color: theme.colors.marge,
    marginTop: theme.spacing * 2,
  },
});
