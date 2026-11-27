// Appel (maquette Appel, EX-09 à EX-15, EX-39) : `?creneau=<id>&date=<AAAA-MM-JJ>`, ou `?groupe=`
// pour un appel sans créneau (`useRollCallTarget`). Tous les inscrits à
// la date démarrent à Présent ; un appui fait passer au statut suivant. Brouillon (EX-14, ticket 011) : chaque changement est écrit aussitôt ; l'appel est repris tel
// quel à la réouverture ; un brouillon d'un autre appel bloque celui-ci (décision du 2026-11-27).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { countStatuses, matchesName, nextStatus, SEARCH_FROM } from '@/domain/attendance';
import { toDisplayDate } from '@/domain/formats';
import { weekdayOfDate } from '@/domain/occurrences';
import type { AttendanceStatus } from '@/domain/validation';
import { notifyDataChanged } from '@/hooks/dataChanged';
import { draftRoute, useDraft, useRollCall, useRoster } from '@/hooks/useRollCall';
import { useRollCallTarget } from '@/hooks/useRollCallTarget';
import { AttendanceCounter, StatusPill } from '@/ui/Attendance';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { errorMessage } from '@/ui/errorMessage';
import { NoMatch } from '@/ui/NoMatch';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.rollCall;
/** Durée d'affichage de « Appel enregistré » avant le retour (maquette : 1,2 s). */
const SAVED_DELAY_MS = 1200;

export default function RollCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ creneau?: string; groupe?: string; date?: string }>();
  const { target, groupName, problem, blockingDraft, loadFailed } = useRollCallTarget(params);
  const { roster, loadFailed: rosterFailed } = useRoster(
    target?.group.id ?? null,
    target?.date ?? '',
  );
  const { record } = useRollCall();
  const draft = useDraft();

  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [query, setQuery] = useState('');
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  // EX-14 : un brouillon de cet appel est repris tel quel, une seule fois par appel.
  const resumed = useRef<string | null>(null);
  const targetKey = target && `${target.slotId}|${target.group.id}|${target.date}`;
  const ownDraft = target?.draft ?? null;
  useEffect(() => {
    if (targetKey === null || resumed.current === targetKey) return;
    resumed.current = targetKey;
    if (!ownDraft) return;
    setStatuses(ownDraft.statuses);
    setComment(ownDraft.comment ?? '');
  }, [targetKey, ownDraft]);

  // Les écritures du brouillon ne rechargent pas les autres écrans : l'accueil le fait ici.
  useEffect(() => () => notifyDataChanged(), []);

  const draftTarget = target && {
    slotId: target.slotId,
    groupId: target.group.id,
    date: target.date,
    startedAt: target.startedAt,
  };
  /** Une écriture du brouillon qui échoue est dite ; l'appel continue à l'écran. */
  const writeDraft = (write: () => Promise<void>) => {
    // Rien après « Enregistrer » : l'enregistrement efface le brouillon, il ne doit pas renaître.
    if (saving.current) return;
    write().then(
      () => setFormError((f) => (f === labels.draft.writeFailed ? undefined : f)),
      (e) => {
        if ((e as { code?: string } | null)?.code === 'COMMENT_TOO_LONG')
          setCommentError(errorMessage(e));
        else setFormError(labels.draft.writeFailed);
      },
    );
  };

  // « Appel enregistré », puis retour à l'accueil (décision du porteur du 2026-11-27).
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(
      // Accueil, même depuis l'appel sans créneau (pile : accueil → choix → appel).
      () => (router.canDismiss() ? router.dismissTo('/') : router.replace('/')),
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
      : blockingDraft
        ? labels.draft.inProgress(
            blockingDraft.groupName ?? labels.draft.removedGroup,
            toDisplayDate(blockingDraft.date),
          )
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
  const enrollMembers = () => {
    if (!target) return;
    router.push({
      pathname: '/groupes/[id]/inscrire',
      params: { id: target.group.id, debut: target.date },
    });
  };

  const addMember = () => {
    if (!target) return;
    // Le nouveau membre doit apparaître au retour : la recherche est vidée.
    setQuery('');
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
      {blockingDraft?.resumable && (
        <Button
          label={labels.draft.resume}
          onPress={() => router.replace(draftRoute(blockingDraft))}
        />
      )}
      {ready && (
        <>
          <Card>
            <AttendanceCounter counts={counts} />
          </Card>
          <Text style={styles.draftLine}>{labels.draft.savedOnEachTap}</Text>
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
                  onPress={() => {
                    const next = nextStatus(status);
                    setStatuses((s) => ({ ...s, [m.memberId]: next }));
                    if (draftTarget)
                      writeDraft(() => draft.setStatus(draftTarget, m.memberId, next));
                  }}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <Text testID="roll-call-name" style={styles.name}>
                    {name}
                  </Text>
                  <StatusPill status={status} />
                </Pressable>
              );
            })}
            {shown.length === 0 &&
              (members.length === 0 ? (
                <>
                  <Text style={styles.empty}>{t.noMember}</Text>
                  {/* Maquette « Appel d'un groupe vide » : inscrire des membres existants dès la
                      date de l'appel, puis revenir (décision du porteur du 2026-11-27). */}
                  {!saved && (
                    <Button
                      label={labels.group.addMembers}
                      variant="secondary"
                      disabled={busy}
                      onPress={enrollMembers}
                    />
                  )}
                </>
              ) : (
                <NoMatch query={query} />
              ))}
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
              if (draftTarget) writeDraft(() => draft.setComment(draftTarget, v));
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
  draftLine: {
    fontFamily: theme.fonts.text,
    fontSize: 13,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing,
  },
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
