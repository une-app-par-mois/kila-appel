// Appel sans créneau (maquette, EX-39) : une date (aujourd'hui par défaut), puis un groupe actif.
// La date n'est jamais future et tombe dans la saison active (décision du porteur du 2026-11-27).
// Groupes listés par leur nom, sans le nombre de membres de la maquette (même décision).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { parseDisplayDate, toDisplayDate, toIsoDate } from '@/domain/formats';
import { useGroups } from '@/hooks/useGroups';
import { useRollCall } from '@/hooks/useRollCall';
import { useSeasons } from '@/hooks/useSeasons';
import { Card } from '@/ui/Card';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { errorMessage } from '@/ui/errorMessage';
import { ListRow } from '@/ui/ListRow';
import { Screen, Section } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.freeRollCall;

export default function FreeRollCallScreen() {
  const router = useRouter();
  const today = toIsoDate(new Date());
  const { seasons, loadFailed } = useSeasons();
  const season = seasons?.find((s) => s.isActive) ?? null;
  const { groups, loadFailed: groupsFailed } = useGroups(season?.id ?? null);
  const [date, setDate] = useState(() => toDisplayDate(today));
  const [dateError, setDateError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const { isGroupRecorded } = useRollCall();
  const [duplicate, setDuplicate] = useState<{ id: number; name: string; date: string } | null>(
    null,
  );

  const go = (groupId: number, iso: string) =>
    router.push({ pathname: '/appel', params: { groupe: groupId, date: iso } });

  const start = async (groupId: number, name: string) => {
    const iso = parseDisplayDate(date);
    if (iso === null) return setDateError(labels.errors.DATE_INVALID);
    if (iso > today) return setDateError(labels.errors.DATE_IN_FUTURE);
    if (season && (iso < season.startDate || iso > season.endDate))
      return setDateError(labels.errors.DATE_OUTSIDE_SEASON);
    try {
      // Deux vraies séances le même jour existent (stage) : prévenir, laisser choisir.
      if (await isGroupRecorded(groupId, iso)) setDuplicate({ id: groupId, name, date: iso });
      else go(groupId, iso);
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  return (
    <Screen
      title={t.title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      error={loadFailed || groupsFailed ? labels.common.loadFailed : formError}
    >
      <Text style={styles.help}>{t.help}</Text>
      <Section title={t.group} />
      {seasons !== null && season === null && <Text style={styles.help}>{t.noSeason}</Text>}
      {groups !== null && groups.length === 0 && <Text style={styles.help}>{t.noGroup}</Text>}
      {groups !== null && groups.length > 0 && (
        <Card>
          {groups.map((g) => (
            <ListRow key={g.id} title={g.name} onPress={() => void start(g.id, g.name)} />
          ))}
        </Card>
      )}
      <Section title={t.date} />
      <TextField
        label={t.date}
        labelHidden
        mono
        placeholder={labels.memberForm.datePlaceholder}
        value={date}
        onChangeText={(v) => {
          setDate(v);
          setDateError(undefined);
        }}
        error={dateError}
      />
      {duplicate && (
        <ConfirmDialog
          visible
          harmless
          title={t.duplicateTitle}
          message={t.duplicateMessage(duplicate.name, toDisplayDate(duplicate.date))}
          cancelLabel={labels.common.cancel}
          confirmLabel={t.duplicateConfirm}
          onCancel={() => setDuplicate(null)}
          onConfirm={() => {
            setDuplicate(null);
            go(duplicate.id, duplicate.date);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: {
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: theme.colors.texteSecondaire,
    marginVertical: theme.spacing * 2,
  },
});
