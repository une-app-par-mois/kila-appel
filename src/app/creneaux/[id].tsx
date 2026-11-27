// Créneau hebdomadaire (maquettes Créneau récurrent et Modification, EX-07) : jour, début, durée,
// groupe, lieu et nom facultatifs ; `nouveau` en crée un dans la saison active. En modification,
// lieu et nom aussi, et « Supprimer le créneau » après confirmation (décisions du 2026-11-27).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { toIsoDate } from '@/domain/formats';
import { parseDuration } from '@/domain/slots';
import { InputError, validateSlot } from '@/domain/validation';
import { useGroups } from '@/hooks/useGroups';
import { useSeasons } from '@/hooks/useSeasons';
import { useSlot, useSlots } from '@/hooks/useSlots';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { errorMessage } from '@/ui/errorMessage';
import { FilterChip } from '@/ui/FilterChip';
import { Screen } from '@/ui/Screen';
import { Select } from '@/ui/Select';
import { FieldError, FieldLabel, TextField } from '@/ui/TextField';

const t = labels.slotForm;
type Field = 'weekday' | 'startTime' | 'durationMin' | 'groupId';
const FIELD_OF: Record<string, Field> = {
  WEEKDAY_INVALID: 'weekday',
  TIME_INVALID: 'startTime',
  DURATION_INVALID: 'durationMin',
  GROUP_REQUIRED: 'groupId',
};
const CHECKS: Field[] = ['weekday', 'startTime', 'durationMin', 'groupId'];

export default function SlotScreen() {
  const router = useRouter();
  const param = useLocalSearchParams<{ id: string }>().id;
  const isNew = param === 'nouveau';
  const today = toIsoDate(new Date());
  const { seasons, loadFailed: seasonsFailed } = useSeasons();
  const active = seasons?.find((s) => s.isActive);
  const existing = useSlot(!isNew && param && /^\d+$/.test(param) ? Number(param) : 0);
  const slot = isNew ? null : existing.slot;
  const { create } = useSlots(active?.id ?? null);
  const seasonId = isNew ? (active?.id ?? null) : (slot?.seasonId ?? null);
  const { groups, loadFailed: groupsFailed } = useGroups(seasonId);

  const [weekday, setWeekday] = useState<number | null>(null);
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState('');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [place, setPlace] = useState('');
  const [name, setName] = useState('');
  const [filledId, setFilledId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [confirm, setConfirm] = useState<{ rollCallDraft: boolean } | null>(null);
  const [closing, setClosing] = useState(false);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slot || slot.id === filledId) return;
    setWeekday(slot.weekday);
    setStart(slot.startTime);
    setDuration(labels.duration(slot.durationMin));
    setGroupId(slot.groups[0]?.id ?? null);
    setPlace(slot.place ?? '');
    setName(slot.name ?? '');
    setFilledId(slot.id);
  }, [slot, filledId]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/creneaux'));
  const clear = (field?: Field) => {
    if (field) setErrors((e) => ({ ...e, [field]: undefined }));
    setFormError(undefined);
  };

  /** Une action à la fois ; l'écran se ferme une fois l'écriture faite. */
  const run = async (action: () => Promise<unknown>) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      await action();
      setClosing(true);
      back();
    } catch (e) {
      const field = FIELD_OF[(e as { code?: string } | null)?.code ?? ''];
      if (field) setErrors({ [field]: errorMessage(e) });
      else setFormError(errorMessage(e));
      saving.current = false;
      setBusy(false);
    }
  };

  const save = () => {
    const input = {
      weekday: weekday ?? 0,
      startTime: start.trim(),
      durationMin: parseDuration(duration) ?? Number.NaN,
      place,
      name,
      groupId: groupId ?? 0,
    };
    // Toutes les erreurs à la fois, sous leurs champs : chaque champ vérifié seul.
    const valid = { weekday: 1, startTime: '00:00', durationMin: 1, place, name, groupId: 1 };
    const found: Partial<Record<Field, string>> = {};
    for (const field of CHECKS) {
      try {
        validateSlot({ ...valid, [field]: input[field] });
      } catch (e) {
        if (e instanceof InputError) found[field] = labels.errors[e.code];
      }
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    void run(() => (isNew ? create(input, today) : existing.update(input, today)));
  };

  const askRemoval = async () => {
    try {
      setConfirm(await existing.deletionImpact());
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  const notFound = !isNew && !closing && existing.loaded && slot === null;
  const noSeason = isNew && seasons !== null && active === undefined;
  const loadFailed = seasonsFailed || groupsFailed || (!isNew && existing.loadFailed);
  const error = loadFailed
    ? labels.common.loadFailed
    : notFound
      ? labels.errors.NOT_FOUND
      : formError;
  // Le groupe du créneau reste proposé s'il a été archivé depuis.
  const kept = slot?.groups.filter((g) => !groups?.some((x) => x.id === g.id)) ?? [];
  const options = [...(groups ?? []), ...kept].map((g) => ({ value: g.id, label: g.name }));
  const title = slot
    ? t.editTitle(labels.weekdays[slot.weekday - 1] ?? '', slot.startTime)
    : t.createTitle;

  return (
    <Screen title={title} onBack={back} error={error}>
      {noSeason && <Text style={styles.text}>{labels.slots.noActiveSeason}</Text>}
      {((isNew && active) || slot) && (
        <>
          <View style={styles.field}>
            <FieldLabel label={t.weekday} />
            <View style={styles.days}>
              {labels.weekdaysShort.map((short, i) => (
                <FilterChip
                  key={short}
                  label={short}
                  accessibilityLabel={labels.weekdays[i]}
                  selected={weekday === i + 1}
                  onPress={() => {
                    setWeekday(i + 1);
                    clear('weekday');
                  }}
                />
              ))}
            </View>
            {errors.weekday !== undefined && <FieldError error={errors.weekday} />}
          </View>
          <View style={styles.pair}>
            <View style={styles.half}>
              <TextField
                label={t.start}
                mono
                placeholder={t.timePlaceholder}
                value={start}
                onChangeText={(v) => {
                  setStart(v);
                  clear('startTime');
                }}
                error={errors.startTime}
              />
            </View>
            <View style={styles.half}>
              <TextField
                label={t.duration}
                mono
                placeholder={t.durationPlaceholder}
                value={duration}
                onChangeText={(v) => {
                  setDuration(v);
                  clear('durationMin');
                }}
                error={errors.durationMin}
              />
            </View>
          </View>
          <Select
            label={t.group}
            value={groupId}
            options={options}
            placeholder={t.noGroup}
            onChange={(v) => {
              setGroupId(v);
              clear('groupId');
            }}
          />
          {errors.groupId !== undefined && <FieldError error={errors.groupId} />}
          <TextField
            label={t.place}
            hint={t.optional}
            value={place}
            onChangeText={(v) => {
              setPlace(v);
              clear();
            }}
          />
          <TextField
            label={t.name}
            hint={t.optional}
            placeholder={t.namePlaceholder}
            value={name}
            onChangeText={(v) => {
              setName(v);
              clear();
            }}
          />
          <Button label={isNew ? t.create : labels.common.save} disabled={busy} onPress={save} />
          {!isNew && (
            <Button
              label={t.delete}
              variant="destructiveSecondary"
              disabled={busy}
              onPress={() => void askRemoval()}
            />
          )}
        </>
      )}
      {confirm && (
        <ConfirmDialog
          visible
          title={labels.slotDeletion.title}
          message={labels.slotDeletion.message(confirm.rollCallDraft)}
          note={labels.slotDeletion.note}
          cancelLabel={labels.common.keep}
          confirmLabel={labels.slotDeletion.confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            void run(existing.remove);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
  field: { marginVertical: theme.spacing * 1.5 },
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing,
    marginTop: theme.spacing * 1.5,
  },
  pair: { flexDirection: 'row', gap: theme.spacing * 2 },
  half: { flex: 1 },
});
