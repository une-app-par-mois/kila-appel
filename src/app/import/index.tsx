// Import CSV : choisir le fichier (maquettes « Import CSV : choisir le fichier » et « fichier
// illisible », ticket 035, F-07, EX-30). Explication et tableau d'exemple ; le sélecteur et la
// lecture passent par useMemberImport (034), dont cet écran est le propriétaire : son démontage
// vide la session. Aperçu prêt : l'écran d'aperçu s'ouvre par-dessus. Refus : « Fichier non
// reconnu », un texte par cause (décision du porteur du 2026-11-28) ; « Choisir un autre fichier »,
// le bouton « ‹ », le geste et la touche retour ramènent à l'explication (maquette). Bouton
// désactivé tant qu'une opération sur les fichiers tient le verrou (export, restauration, purge,
// lecture en cours).
import { usePreventRemove, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { useFileLock } from '@/hooks/fileLock';
import { type ImportState, useMemberImport } from '@/hooks/useMemberImport';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';

const t = labels.memberImport;

/** Texte du refus, ou null si l'état n'en est pas un. */
const refusalOf = (state: ImportState, noMembers: boolean): string | null => {
  if (state.step === 'rejected') return t.refusals[state.reason];
  if (state.step === 'failed') return t.readFailed;
  return noMembers ? t.refusals.NO_MEMBERS : null;
};

const Example = () => (
  <View style={styles.table}>
    {[t.exampleHeader, t.exampleRow].map((row, r) => (
      <View key={r === 0 ? 'header' : 'row'} style={styles.tableRow}>
        {row.map((cell) => (
          <Text key={cell} style={[styles.cell, r === 0 && styles.headCell]}>
            {cell}
          </Text>
        ))}
      </View>
    ))}
  </View>
);

export default function ImportStart() {
  const router = useRouter();
  const { state, preview, choose, abandon } = useMemberImport(undefined, { owner: true });
  const locked = useFileLock() !== null;
  // En-tête seul : aucun membre à montrer, l'aperçu ne s'ouvre pas (texte validé le 2026-11-28).
  const noMembers = preview !== null && preview.counts.rows === 0;
  const ready = preview !== null && !noMembers;
  useEffect(() => {
    if (ready) router.push('/import/apercu');
  }, [ready, router]);
  const refusal = refusalOf(state, noMembers);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/membres'));
  const disabled = locked || state.step === 'reading';
  // Refus affiché : le retour du système et le geste font comme « ‹ » (retour à l'explication).
  usePreventRemove(refusal !== null, abandon);

  if (refusal !== null) {
    return (
      <Screen title={t.rejectedTitle} onBack={abandon}>
        <Card warning>
          <Text style={styles.text}>{refusal}</Text>
        </Card>
        <Button label={t.chooseAnother} onPress={abandon} />
      </Screen>
    );
  }
  return (
    <Screen title={t.title} onBack={back}>
      <Card>
        <Text style={styles.text}>
          {t.intro}
          <Text style={styles.strong}>{t.introFormat}</Text>
          {t.introEnd}
        </Text>
        <Example />
        <Text style={styles.hint}>{t.exampleHint}</Text>
      </Card>
      <Button label={t.choose} disabled={disabled} onPress={() => void choose()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
  strong: { fontFamily: theme.fonts.textSemi },
  hint: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginVertical: theme.spacing,
  },
  table: {
    marginVertical: theme.spacing * 2,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: theme.colors.quadrillage,
  },
  tableRow: { flexDirection: 'row' },
  cell: {
    flex: 1,
    fontFamily: theme.fonts.digits,
    fontSize: 11,
    color: theme.colors.texte,
    padding: 3,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.quadrillage,
  },
  headCell: { fontFamily: theme.fonts.digits, color: theme.colors.texteSecondaire },
});
