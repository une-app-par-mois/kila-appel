// Création ou modification d'une saison (maquette, EX-01) ; `nouvelle` pour créer.
// Dates saisies en JJ/MM/AAAA (RM-04) ; erreurs sous le champ concerné (CONV-15) ;
// suppression après une confirmation qui dit ce qui sera effacé.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import type { SeasonDeletionImpact } from '@/data/seasonsRepo';
import { parseDisplayDate, toDisplayDate } from '@/domain/formats';
import { useSeasons } from '@/hooks/useSeasons';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.seasonForm;
const E = labels.errors;

type Errors = { name?: string; start?: string; end?: string; form?: string };

/** Erreur à code (saisie ou données) → champ et message ; le reste est une erreur inattendue. */
const toErrors = (error: unknown): Errors => {
  const code = (error as { code?: unknown })?.code;
  switch (code) {
    case 'NAME_REQUIRED':
      return { name: E.NAME_REQUIRED };
    case 'DATE_INVALID':
      return { form: E.DATE_INVALID };
    case 'END_BEFORE_START':
      return { end: E.END_BEFORE_START };
    case 'SESSIONS_OUTSIDE_SEASON':
      return { form: E.SESSIONS_OUTSIDE_SEASON };
    case 'ENROLLMENTS_OUTSIDE_SEASON':
      return { form: E.ENROLLMENTS_OUTSIDE_SEASON };
    case 'NOT_FOUND':
      return { form: E.NOT_FOUND };
    default:
      return { form: E.unknown };
  }
};

export default function SeasonForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const seasonId = id === 'nouvelle' ? null : Number(id);
  const { seasons, loadFailed, create, update, remove, deletionImpact } = useSeasons();
  const season = seasonId === null ? undefined : seasons?.find((s) => s.id === seasonId);
  // Après une suppression, la saison disparaît de la liste : ce n'est pas une erreur.
  const [removed, setRemoved] = useState(false);
  const missing = seasonId !== null && seasons !== null && season === undefined && !removed;
  /** Retour à l'écran précédent, ou à la liste si l'écran a été ouvert directement. */
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/saisons'));

  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [filled, setFilled] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [impact, setImpact] = useState<SeasonDeletionImpact | null>(null);
  // Un enregistrement à la fois (double appui).
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  // En modification, le formulaire n'apparaît qu'une fois la saison lue.
  const ready = seasonId === null ? !loadFailed : season !== undefined;
  /** Saisie d'un champ : efface son erreur et celle du formulaire. */
  const onEdit =
    (field: 'name' | 'start' | 'end', set: (value: string) => void) => (value: string) => {
      set(value);
      setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
    };

  useEffect(() => {
    if (season === undefined || filled) return;
    setName(season.name);
    setStart(toDisplayDate(season.startDate));
    setEnd(toDisplayDate(season.endDate));
    setFilled(true);
  }, [season, filled]);

  const save = async () => {
    if (saving.current) return;
    const startDate = parseDisplayDate(start);
    const endDate = parseDisplayDate(end);
    if (startDate === null || endDate === null) {
      setErrors({
        start: startDate === null ? E.DATE_INVALID : undefined,
        end: endDate === null ? E.DATE_INVALID : undefined,
      });
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      const input = { name, startDate, endDate };
      if (seasonId === null) await create(input);
      else await update(seasonId, input);
      leave();
    } catch (error) {
      setErrors(toErrors(error));
      saving.current = false;
      setBusy(false);
    }
  };

  const askDeletion = async () => {
    if (seasonId === null) return;
    try {
      setImpact(await deletionImpact(seasonId));
    } catch (error) {
      setErrors(toErrors(error));
    }
  };

  const confirmDeletion = async () => {
    if (seasonId === null) return;
    try {
      setRemoved(true);
      await remove(seasonId);
      setImpact(null);
      leave();
    } catch (error) {
      setRemoved(false);
      setImpact(null);
      setErrors(toErrors(error));
    }
  };

  const screenError = loadFailed ? labels.common.loadFailed : missing ? E.NOT_FOUND : undefined;
  return (
    <Screen title={t.title} onBack={leave} error={screenError}>
      {ready && (
        <>
          <TextField
            label={t.name}
            value={name}
            onChangeText={onEdit('name', setName)}
            error={errors.name}
          />
          <View style={styles.dates}>
            <View style={styles.date}>
              <TextField
                label={t.start}
                value={start}
                onChangeText={onEdit('start', setStart)}
                placeholder={t.datePlaceholder}
                error={errors.start}
                mono
              />
            </View>
            <View style={styles.date}>
              <TextField
                label={t.end}
                value={end}
                onChangeText={onEdit('end', setEnd)}
                placeholder={t.datePlaceholder}
                error={errors.end}
                mono
              />
            </View>
          </View>
          {errors.form !== undefined && (
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
              {errors.form}
            </Text>
          )}
          <Button label={labels.common.save} disabled={busy} onPress={() => void save()} />
          {seasonId !== null && (
            <Button
              label={t.delete}
              variant="destructiveSecondary"
              onPress={() => void askDeletion()}
            />
          )}
        </>
      )}
      {season !== undefined && impact !== null && (
        <ConfirmDialog
          visible
          title={labels.seasonDeletion.title(season.name)}
          message={labels.seasonDeletion.message(impact)}
          note={labels.seasonDeletion.kept}
          cancelLabel={labels.common.keep}
          confirmLabel={labels.common.deleteForever}
          onCancel={() => setImpact(null)}
          onConfirm={() => void confirmDeletion()}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dates: { flexDirection: 'row', gap: theme.spacing * 2.5 },
  date: { flex: 1 },
  error: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.marge,
    marginVertical: theme.spacing * 2,
  },
});
