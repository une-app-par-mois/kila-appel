// Appel (maquette Appel, EX-09 à EX-15) : `?creneau=<id>&date=<AAAA-MM-JJ>`. Tous les inscrits à
// la date démarrent à Présent ; un appui fait passer au statut suivant. Le brouillon arrive au
// ticket 011 : d'ici là, quitter sans enregistrer perd l'appel (décision du porteur du 2026-11-27).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { countStatuses, matchesName, nextStatus, SEARCH_FROM } from '@/domain/attendance';
import { isIsoDate, toDisplayDate, toIsoDate } from '@/domain/formats';
import { isSlotDate, weekdayOfDate } from '@/domain/occurrences';
import type { AttendanceStatus } from '@/domain/validation';
import { useGroups } from '@/hooks/useGroups';
import { useRollCall, useRoster } from '@/hooks/useRollCall';
import { useSlot } from '@/hooks/useSlots';
import { AttendanceCounter, StatusPill } from '@/ui/Attendance';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { errorMessage } from '@/ui/errorMessage';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.rollCall;
/** Durée d'affichage de « Appel enregistré » avant le retour (maquette : 1,2 s). */
const SAVED_DELAY_MS = 1200;

export default function RollCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ creneau: string; date: string }>();
  const slotId = /^\d+$/.test(params.creneau ?? '') ? Number(params.creneau) : 0;
  const date = isIsoDate(params.date ?? '') ? (params.date ?? '') : '';
  const { slot, loaded, loadFailed } = useSlot(slotId);
  // Le groupe actif du créneau, comme à l'accueil (un groupe archivé refuserait l'enregistrement).
  const { groups, loadFailed: groupsFailed } = useGroups(slot?.seasonId ?? null);
  const group = slot?.groups.find((g) => groups?.some((x) => x.id === g.id)) ?? null;
  // EX-17 : un jour du créneau, jamais futur ; sinon refusé dès l'ouverture, pas après l'appel.
  const validDate = slot !== null && date !== '' && isSlotDate(slot, date, toIsoDate(new Date()));
  const { roster, loadFailed: rosterFailed } = useRoster(
    validDate ? (group?.id ?? null) : null,
    date,
  );
  const { record, isRecorded } = useRollCall();

  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [query, setQuery] = useState('');
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [alreadyRecorded, setAlreadyRecorded] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  // RM-05 : l'écran dit tout de suite qu'une séance est déjà enregistrée (correction au 013).
  // Vérifié une fois par séance : après l'enregistrement, le rechargement ne le refait pas.
  const foundSlotId = slot?.id ?? null;
  useEffect(() => {
    if (foundSlotId === null || !validDate) return;
    isRecorded(foundSlotId, date).then(setAlreadyRecorded, (e) => setFormError(errorMessage(e)));
  }, [foundSlotId, validDate, date, isRecorded]);

  // « Appel enregistré », puis retour à l'accueil (décision du porteur du 2026-11-27).
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(
      () => (router.canGoBack() ? router.back() : router.replace('/')),
      SAVED_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [saved, router]);

  const statusOf = (memberId: number) => statuses[memberId] ?? 'present';
  const members = roster ?? [];
  const counts = countStatuses(members.map((m) => statusOf(m.memberId)));
  const searchable = members.length >= SEARCH_FROM;
  const shown = searchable ? members.filter((m) => matchesName(query, m)) : members;

  const save = async () => {
    if (!slot || !group || saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      await record({
        slotId: slot.id,
        groupId: group.id,
        date,
        startTime: slot.startTime,
        statuses: members.map((m) => ({ memberId: m.memberId, status: statusOf(m.memberId) })),
        comment,
      });
      setSaved(true);
    } catch (e) {
      if ((e as { code?: string } | null)?.code === 'COMMENT_TOO_LONG')
        setCommentError(errorMessage(e));
      else setFormError(errorMessage(e));
      saving.current = false;
      setBusy(false);
    }
  };

  const notFound =
    (loaded && slot === null) || (groups !== null && !group) || !date || slotId === 0;
  const error =
    loadFailed || rosterFailed || groupsFailed
      ? labels.common.loadFailed
      : notFound
        ? labels.errors.NOT_FOUND
        : slot && !validDate
          ? labels.errors.NOT_A_SLOT_SESSION
          : alreadyRecorded
            ? labels.errors.ALREADY_RECORDED
            : formError;
  const ready = validDate && group && roster && alreadyRecorded === false && !notFound;
  const subtitle =
    slot && date
      ? t.subtitle(
          labels.weekdaysAbbr[weekdayOfDate(date) - 1] ?? '',
          toDisplayDate(date),
          slot.startTime,
          slot.place,
        )
      : undefined;

  return (
    <Screen
      title={group?.name ?? t.entry}
      subtitle={subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      error={error}
    >
      {ready && (
        <>
          <Card>
            <AttendanceCounter counts={counts} />
          </Card>
          {searchable && (
            <TextField
              label={t.search}
              labelHidden
              placeholder={t.searchPlaceholder}
              value={query}
              onChangeText={setQuery}
            />
          )}
          <Card>
            {shown.map((m) => {
              const name = `${m.firstName} ${m.lastName}`;
              const status = statusOf(m.memberId);
              return (
                <Pressable
                  key={m.memberId}
                  accessibilityRole="button"
                  accessibilityLabel={t.row(name, labels.statuses[status])}
                  accessibilityHint={t.rowHint}
                  disabled={busy || saved}
                  onPress={() => setStatuses((s) => ({ ...s, [m.memberId]: nextStatus(status) }))}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <Text testID="roll-call-name" style={styles.name}>
                    {name}
                  </Text>
                  <StatusPill status={status} />
                </Pressable>
              );
            })}
            {shown.length === 0 && (
              <Text style={styles.empty}>{members.length === 0 ? t.noMember : t.noMatch}</Text>
            )}
          </Card>
          <TextField
            label={t.comment}
            hint={t.optional}
            multiline
            editable={!busy && !saved}
            value={comment}
            onChangeText={(v) => {
              setComment(v);
              setCommentError(undefined);
            }}
            error={commentError}
          />
          {saved ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.saved}>
              {t.saved}
            </Text>
          ) : (
            <Button label={t.save} disabled={busy} onPress={() => void save()} />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontFamily: theme.fonts.digits, fontSize: 14, color: theme.colors.texteSecondaire },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing * 2,
    minHeight: theme.minTouchTarget,
    paddingVertical: theme.spacing * 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.quadrillage,
  },
  pressed: { opacity: 0.6 },
  name: { flex: 1, fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
  empty: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texteSecondaire },
  saved: {
    fontFamily: theme.fonts.textSemi,
    fontSize: 17,
    color: theme.colors.encre,
    textAlign: 'center',
    marginVertical: theme.spacing * 4,
  },
});
