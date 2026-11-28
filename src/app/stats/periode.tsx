// Choix d'une période (maquette « Choix d'une période », EX-27, ticket 024) : « Du » et « Au » en
// JJ/MM/AAAA (RM-04), partis de la période en cours (`du`, `au` en AAAA-MM-JJ). « Appliquer »
// refuse une date invalide ou une fin avant le début, sous le champ (CONV-15) ; sinon l'écran se
// referme sur l'onglet avec les dates. Dates futures et sur plusieurs saisons acceptées.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { isIsoDate, parseDisplayDate, toDisplayDate } from '@/domain/formats';
import { choiceError } from '@/domain/statsPeriod';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.stats.periodScreen;
const E = labels.errors;

/** Date reçue en paramètre → champ ; vide si elle n'est pas valide. */
const initial = (iso: string | undefined) => (iso && isIsoDate(iso) ? toDisplayDate(iso) : '');

export default function PeriodScreen() {
  const router = useRouter();
  const { du, au } = useLocalSearchParams<{ du?: string; au?: string }>();
  const [from, setFrom] = useState(() => initial(du));
  const [to, setTo] = useState(() => initial(au));
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/stats'));

  const edit = (field: 'from' | 'to', set: (value: string) => void) => (value: string) => {
    set(value);
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const apply = () => {
    const start = parseDisplayDate(from);
    const end = parseDisplayDate(to);
    if (start === null || end === null) {
      setErrors({
        from: start === null ? E.DATE_INVALID : undefined,
        to: end === null ? E.DATE_INVALID : undefined,
      });
      return;
    }
    const code = choiceError({ kind: 'custom', from: start, to: end });
    if (code !== null) {
      setErrors({ to: E[code] });
      return;
    }
    // Referme l'écran (pas de second `(tabs)` empilé), comme `membres/[id].tsx`.
    router.dismissTo({ pathname: '/stats', params: { du: start, au: end } });
  };

  return (
    <Screen title={t.title} onBack={leave}>
      <View style={styles.dates}>
        <View style={styles.date}>
          <TextField
            label={t.from}
            value={from}
            onChangeText={edit('from', setFrom)}
            placeholder={t.placeholder}
            error={errors.from}
            mono
          />
        </View>
        <View style={styles.date}>
          <TextField
            label={t.to}
            value={to}
            onChangeText={edit('to', setTo)}
            placeholder={t.placeholder}
            error={errors.to}
            mono
          />
        </View>
      </View>
      <Button label={t.apply} onPress={apply} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Côte à côte, l'un sous l'autre quand le texte est agrandi.
  dates: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing * 3 },
  date: { flexGrow: 1, flexBasis: 140 },
});
