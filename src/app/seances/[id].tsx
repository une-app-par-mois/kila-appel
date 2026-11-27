// Détail d'une séance (maquettes Détail d'une séance et Suppression d'une séance, EX-18, ticket
// 013) : un appui fait défiler les statuts comme à l'appel (EX-10) ; seuls les membres de la séance,
// sans ajout ; commentaire de la séance entre la liste et les boutons (décision du porteur du
// 2026-11-27). « Enregistrer les corrections » attend un changement ; suppression confirmée.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { countStatuses, nextStatus } from '@/domain/attendance';
import { toDisplayDate } from '@/domain/formats';
import { weekdayOfDate } from '@/domain/occurrences';
import type { AttendanceStatus } from '@/domain/validation';
import { useSessionDetail } from '@/hooks/useHistory';
import { useLocalNow } from '@/hooks/useLocalNow';
import { AttendanceCounter, StatusPill } from '@/ui/Attendance';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { errorMessage } from '@/ui/errorMessage';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.session;
const r = labels.rollCall;

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, reappears, loaded, loadFailed, correct, remove } = useSessionDetail(
    Number(id),
    useLocalNow(),
  );
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const done = useRef(false);

  // Valeurs enregistrées reprises une fois, à l'ouverture ; une relecture n'efface rien de saisi.
  const started = useRef(false);
  useEffect(() => {
    if (!session || started.current) return;
    started.current = true;
    setComment(session.comment ?? '');
  }, [session]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/historique'));
  const attendances = session?.attendances ?? [];
  const statusOf = (memberId: number, saved: AttendanceStatus) => statuses[memberId] ?? saved;
  const changed = attendances.filter((a) => statusOf(a.memberId, a.status) !== a.status);
  const dirty = changed.length > 0 || comment.trim() !== (session?.comment ?? '');

  /** Une action qui réussit ramène à l'Historique ; un échec est dit, sans terme technique. */
  const run = async (action: () => Promise<void>) => {
    if (done.current) return;
    done.current = true;
    setBusy(true);
    try {
      await action();
      back();
    } catch (e) {
      if ((e as { code?: string } | null)?.code === 'COMMENT_TOO_LONG')
        setCommentError(errorMessage(e));
      else setFormError(errorMessage(e));
      done.current = false;
      setBusy(false);
    }
  };
  const save = () =>
    run(() =>
      correct({
        statuses: changed.map((a) => ({
          memberId: a.memberId,
          status: statusOf(a.memberId, a.status),
        })),
        comment,
      }),
    );

  const missing = loaded && !session && !done.current;
  const error = loadFailed
    ? labels.common.loadFailed
    : missing
      ? labels.errors.NOT_FOUND
      : formError;
  const day = session && (labels.weekdaysAbbr[weekdayOfDate(session.date) - 1] ?? '');
  const date = session ? toDisplayDate(session.date) : '';

  return (
    <Screen
      title={session ? (session.groupName ?? labels.history.removedGroup) : labels.history.title}
      subtitle={
        session && (
          <Text style={styles.subtitle}>{t.subtitle(day ?? '', date, session.startTime)}</Text>
        )
      }
      onBack={back}
      error={error}
    >
      {session && (
        <>
          <Card>
            <AttendanceCounter
              counts={countStatuses(attendances.map((a) => statusOf(a.memberId, a.status)))}
            />
          </Card>
          <Card>
            {attendances.map((a) => {
              const name = `${a.firstName} ${a.lastName}`;
              const status = statusOf(a.memberId, a.status);
              return (
                <Pressable
                  key={a.memberId}
                  accessibilityRole="button"
                  accessibilityLabel={r.row(name, labels.statuses[status])}
                  accessibilityHint={r.rowHint}
                  disabled={busy}
                  onPress={() => setStatuses((s) => ({ ...s, [a.memberId]: nextStatus(status) }))}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <Text style={styles.name}>{name}</Text>
                  <StatusPill status={status} />
                </Pressable>
              );
            })}
          </Card>
          <Text style={styles.help}>{t.help}</Text>
          <TextField
            label={r.comment}
            hint={r.optional}
            multiline
            editable={!busy}
            value={comment}
            onChangeText={(v) => {
              setComment(v);
              setCommentError(undefined);
            }}
            error={commentError}
          />
          <View style={styles.actions}>
            <Button
              label={t.delete}
              variant="destructiveSecondary"
              flex={1}
              disabled={busy}
              onPress={() => setConfirming(true)}
            />
            <Button label={t.save} flex={2} disabled={busy || !dirty} onPress={() => void save()} />
          </View>
          <ConfirmDialog
            visible={confirming}
            title={t.deleteTitle}
            message={t.deleteMessage(session.groupName, date, attendances.length)}
            note={reappears ? t.reappears : undefined}
            cancelLabel={t.keep}
            confirmLabel={t.deleteConfirm}
            onCancel={() => setConfirming(false)}
            onConfirm={() => {
              setConfirming(false);
              void run(remove);
            }}
          />
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
  help: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  actions: { flexDirection: 'row', gap: theme.spacing * 2.5, marginTop: theme.spacing * 3 },
});
