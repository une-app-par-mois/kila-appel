// Entrée de l'appel sur l'accueil (maquettes Accueil, Accueil avec un appel interrompu, Abandon) :
// - un brouillon (EX-14) : carte « Appel en cours », Abandonner (confirmé) ou Reprendre l'appel ;
//   « Nouvel appel » l'ouvre aussi ;
// - sinon la séance proposée (EX-09), ou l'appel sans créneau sans séance à faire (EX-39).
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { toDisplayDate, toIsoDate, toLocalTime } from '@/domain/formats';
import { weekdayOfDate } from '@/domain/occurrences';
import { draftRoute, useDraft, useProposedSession } from '@/hooks/useRollCall';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { errorMessage } from '@/ui/errorMessage';
import { ListRow } from '@/ui/ListRow';

const d = labels.draft;

export const RollCallEntry = ({ onError }: { onError: (message: string | undefined) => void }) => {
  const router = useRouter();
  // L'heure avance d'elle-même : la séance proposée suit sans autre action (une fois par minute).
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const proposed = useProposedSession({ date: toIsoDate(now), time: toLocalTime(now) });
  const { draft, loaded: draftLoaded, loadFailed: draftFailed, discard } = useDraft();
  const [confirm, setConfirm] = useState(false);
  const failed = proposed.loadFailed || draftFailed;
  useEffect(() => onError(failed ? labels.common.loadFailed : undefined), [failed, onError]);

  const call = proposed.session;
  const callParts =
    call &&
    ([
      call.group.name,
      labels.weekdaysAbbr[weekdayOfDate(call.date) - 1] ?? '',
      toDisplayDate(call.date).slice(0, 5),
      call.startTime,
    ] as const);
  const ready = proposed.loaded && draftLoaded && !failed;
  const group = draft?.groupName ?? d.removedGroup;
  const absents = Object.values(draft?.statuses ?? {}).filter((s) => s === 'absent').length;
  // Un brouillon qui ne peut plus être repris (groupe supprimé ou archivé, saison changée…) ne
  // peut qu'être abandonné.
  const resume = draft?.resumable ? () => router.push(draftRoute(draft)) : undefined;

  const entry = draft ? (
    <ListRow title={labels.rollCall.entry} subtitle={d.entry(group)} onPress={resume} />
  ) : call && callParts && !call.recorded ? (
    <ListRow
      title={labels.rollCall.entry}
      subtitle={labels.rollCall.proposed(...callParts)}
      onPress={() =>
        router.push({ pathname: '/appel', params: { creneau: call.slot.id, date: call.date } })
      }
    />
  ) : (
    <ListRow
      title={labels.rollCall.entry}
      subtitle={
        callParts
          ? labels.rollCall.proposedRecorded(...callParts)
          : proposed.loaded
            ? labels.rollCall.noSession
            : undefined
      }
      onPress={ready ? () => router.push('/appel-libre') : undefined}
      chevron={ready}
    />
  );

  return (
    <>
      {draft && (
        <Card warning>
          <Text style={styles.title}>{d.title}</Text>
          <Text style={styles.summary}>
            {d.summary(group, draft.startedAt, d.absents(absents))}
          </Text>
          {!resume && <Text style={styles.summary}>{d.unresumable}</Text>}
          <View style={styles.actions}>
            <Button
              label={d.abandon}
              variant="secondary"
              flex={1}
              onPress={() => setConfirm(true)}
            />
            {resume && <Button label={d.resume} flex={2} onPress={resume} />}
          </View>
        </Card>
      )}
      <Card>{entry}</Card>
      {confirm && (
        <ConfirmDialog
          visible
          title={d.abandonTitle}
          message={d.abandonMessage(group)}
          cancelLabel={d.keep}
          confirmLabel={d.abandonConfirm}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            discard().catch((e) => onError(errorMessage(e)));
          }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  title: { fontFamily: theme.fonts.textSemi, fontSize: 17, color: theme.colors.texte },
  summary: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing,
  },
  actions: { flexDirection: 'row', gap: theme.spacing * 2, marginTop: theme.spacing * 3 },
});
