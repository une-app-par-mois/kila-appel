// Export CSV des présences (maquette « Export CSV des présences », ticket 037, F-08, EX-31 ; zone
// sensible : données de mineurs qui sortent en clair). « Groupe », « Du » et « Au » (période reçue
// de l'onglet Statistiques, modifiable), avertissement SEC-09 entier avant le bouton, jamais
// réduit, puis « Exporter (N lignes) ». Le fichier part par la feuille de partage du système.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { shareFile, writeFile } from '@/data/expoExports';
import { expoStorage } from '@/data/expoFiles';
import { isIsoDate, parseDisplayDate, toDisplayDate } from '@/domain/formats';
import { choiceError, type PeriodChoice, type StatsPeriod } from '@/domain/statsPeriod';
import type { InputErrorCode } from '@/domain/validation';
import { useFileLock } from '@/hooks/fileLock';
import {
  type CsvExportDeps,
  tooManyRows,
  useAttendanceExport,
  useExportPreview,
} from '@/hooks/useAttendanceExport';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { Select } from '@/ui/Select';
import { choiceFromParams, type StatsPeriodParams } from '@/ui/statsPeriodParams';
import { TextField } from '@/ui/TextField';

const t = labels.attendanceExport;
const E = labels.errors;
/** « Tous les groupes » dans le choix (les identifiants commencent à 1). */
const ALL = 0;

/** SEC-10 : `cache/exports/`, écriture bornée, partage `text/csv` (ticket 033). */
const expoCsvDeps: CsvExportDeps = {
  files: expoStorage('exports'),
  write: writeFile,
  share: (path) => shareFile(path, 'csv'),
};

type Fields = { from: string; to: string };
type DateErrors = { from?: InputErrorCode; to?: InputErrorCode };

/** Dates saisies (JJ/MM/AAAA) → choix libre, ou erreurs sous les champs (textes de `periode`). */
const checkFields = ({ from, to }: Fields): { choice: PeriodChoice } | { errors: DateErrors } => {
  const start = parseDisplayDate(from);
  const end = parseDisplayDate(to);
  if (start === null || end === null) {
    return {
      errors: {
        from: start === null ? 'DATE_INVALID' : undefined,
        to: end === null ? 'DATE_INVALID' : undefined,
      },
    };
  }
  const choice: PeriodChoice = { kind: 'custom', from: start, to: end };
  const code = choiceError(choice);
  return code === null ? { choice } : { errors: { to: code } };
};

/** Date reçue (AAAA-MM-JJ) → champ ; illisible : telle quelle, pour que l'erreur s'affiche. */
const received = (iso: string | undefined) =>
  iso === undefined ? '' : isIsoDate(iso) ? toDisplayDate(iso) : iso;

/** Dates retapées égales à la saison résolue : la saison est gardée (`seasonId`), sinon libre. */
const asSeason = (choice: PeriodChoice, season: StatsPeriod | null): PeriodChoice =>
  choice.kind === 'custom' && season?.from === choice.from && season.to === choice.to
    ? { kind: 'season' }
    : choice;

export default function AttendanceExportScreen() {
  const router = useRouter();
  const { periode, du, au } = useLocalSearchParams<StatsPeriodParams>();
  const fromParams = choiceFromParams({ periode, du, au });
  // Dates de l'adresse invalides : reprises dans les champs, l'erreur s'affiche sous le champ.
  const paramsInvalid = choiceError(fromParams) !== null;
  const [groupId, setGroupId] = useState<number | null>(null);
  // Nul tant que la période reçue n'est pas modifiée ; une saisie la rend libre.
  const [fields, setFields] = useState<Fields | null>(() =>
    paramsInvalid ? { from: received(du), to: received(au) } : null,
  );
  const [blurred, setBlurred] = useState({ from: paramsInvalid, to: paramsInvalid });
  const season = useRef<StatsPeriod | null>(null);
  const checked = fields === null ? null : checkFields(fields);
  const errors = checked !== null && 'errors' in checked ? checked.errors : null;
  const choice =
    checked === null
      ? fromParams
      : 'choice' in checked
        ? asSeason(checked.choice, season.current)
        : null;
  const { preview, ready, loadFailed } = useExportPreview(choice, groupId, errors === null);
  const { exportNow, busy, failure, clearFailure } = useAttendanceExport(expoCsvDeps);
  // Désactivé pendant tout autre export, une restauration, une purge ou Tout effacer.
  const locked = useFileLock() !== null;

  useEffect(() => {
    if (preview?.period.kind === 'season') season.current = preview.period;
  }, [preview]);
  // Groupe supprimé : retour à « Tous les groupes » (un groupe sans séance reste choisi).
  useEffect(() => {
    if (ready && groupId !== null && preview?.groupId === null) setGroupId(null);
  }, [ready, preview, groupId]);

  const shownFields: Fields =
    fields ??
    (preview
      ? { from: toDisplayDate(preview.period.from), to: toDisplayDate(preview.period.to) }
      : { from: received(du), to: received(au) });
  const edit = (field: keyof Fields) => (value: string) => {
    clearFailure();
    setFields({ ...shownFields, [field]: value });
  };
  const chooseGroup = (value: number) => {
    clearFailure();
    setGroupId(value === ALL ? null : value);
  };
  /** Erreur affichée une fois la date entière, ou en quittant le champ. */
  const errorOf = (field: keyof Fields) => {
    const code = errors?.[field];
    const visible = blurred[field] || shownFields[field].length >= 10;
    return code !== undefined && visible ? E[code] : undefined;
  };

  // L'ancien compteur peut rester affiché pendant une relecture ; seul un aperçu prêt s'exporte.
  const count = preview?.count ?? null;
  const tooMany = (count !== null && tooManyRows(count)) || failure === 'tooMany';
  const options = [
    { value: ALL, label: t.allGroups },
    ...(preview?.groups ?? []).map((g) => ({
      value: g.groupId,
      label: g.archived ? t.archivedGroup(g.name) : g.name,
    })),
  ];
  const label = busy ? t.exporting : count === null ? t.open : t.export(count);
  const disabled = busy || locked || !ready || count === 0 || tooMany;
  const failed = failure === 'failed';
  const exportShown = () => {
    if (ready && preview) void exportNow(preview.period, preview.groupId);
  };
  const back = () => (router.canGoBack() ? router.back() : router.replace('/stats'));

  return (
    <Screen title={t.title} onBack={back} error={loadFailed ? labels.common.loadFailed : undefined}>
      <Select
        label={t.group}
        value={groupId ?? ALL}
        options={options}
        placeholder={t.allGroups}
        onChange={chooseGroup}
      />
      <View style={styles.dates}>
        {(['from', 'to'] as const).map((field) => (
          <View key={field} style={styles.date}>
            <TextField
              label={t[field]}
              value={shownFields[field]}
              onChangeText={edit(field)}
              onBlur={() => setBlurred((b) => ({ ...b, [field]: true }))}
              placeholder={t.placeholder}
              error={errorOf(field)}
              mono
            />
          </View>
        ))}
      </View>
      <Card warning testID="csv-warning">
        <Text style={styles.text}>
          {t.warningBefore}
          <Text style={styles.strong}>{t.warningStrong}</Text>
          {t.warningAfter}
        </Text>
      </Card>
      {count === 0 && (
        <Card testID="csv-empty">
          <Text style={styles.text}>{t.empty}</Text>
        </Card>
      )}
      {tooMany && <Text style={styles.error}>{t.tooMany}</Text>}
      <Button label={label} onPress={exportShown} disabled={disabled} />
      {failed && <Text style={styles.error}>{t.failed}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Côte à côte, l'un sous l'autre quand le texte est agrandi.
  dates: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing * 3 },
  date: { flexGrow: 1, flexBasis: 140 },
  text: { fontFamily: theme.fonts.text, fontSize: 15, color: theme.colors.texte },
  strong: { fontFamily: theme.fonts.title },
  error: {
    fontFamily: theme.fonts.text,
    fontSize: 15,
    color: theme.colors.marge,
    marginVertical: theme.spacing * 2,
  },
});
