// Appel (maquette Appel, EX-09 à EX-15, EX-39) : `?creneau=<id>&date=<AAAA-MM-JJ>`, ou `?groupe=`
// pour un appel sans créneau (`useRollCallTarget`). Tous les inscrits à
// la date démarrent à Présent ; un appui fait passer au statut suivant. Le brouillon arrive au
// ticket 011 : d'ici là, quitter sans enregistrer perd l'appel (décision du porteur du 2026-11-27).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { countStatuses, matchesName, nextStatus, SEARCH_FROM } from '@/domain/attendance';
import { toDisplayDate } from '@/domain/formats';
import { weekdayOfDate } from '@/domain/occurrences';
import type { AttendanceStatus } from '@/domain/validation';
import { useRollCall, useRoster } from '@/hooks/useRollCall';
import { useRollCallTarget } from '@/hooks/useRollCallTarget';
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
  const params = useLocalSearchParams<{ creneau?: string; groupe?: string; date?: string }>();
  const { target, groupName, problem, loadFailed } = useRollCallTarget(params);
  const { roster, loadFailed: rosterFailed } = useRoster(
    target?.group.id ?? null,
    target?.date ?? '',
  );
  const { record } = useRollCall();

  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [query, setQuery] = useState('');
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

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
    if (!target || saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      await record({
        slotId: target.slotId,
        groupId: target.group.id,
        date: target.date,
        startTime: target.startTime,
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

  const error =
    loadFailed || rosterFailed
      ? labels.common.loadFailed
      : problem
        ? labels.errors[problem]
        : formError;
  const ready = target && roster;
  const subtitle = target
    ? t.subtitle(
        labels.weekdaysAbbr[weekdayOfDate(target.date) - 1] ?? '',
        toDisplayDate(target.date),
        target.startTime,
        target.place,
      )
    : undefined;
  // EX-12 : nouveau membre inscrit au groupe à la date de la séance, puis retour à l'appel.
  const addMember = () => {
    if (!target) return;
    router.push({
      pathname: '/membres/nouveau',
      params: { groupe: target.group.id, debut: target.date, retour: '1', appel: '1' },
    });
  };

  return (
    <Screen
      title={groupName ?? t.entry}
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
          {!saved && (
            <Button label={t.addMember} variant="secondary" disabled={busy} onPress={addMember} />
          )}
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
