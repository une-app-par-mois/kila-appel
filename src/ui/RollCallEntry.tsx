// Entrée de l'appel sur l'accueil (maquettes Accueil, Accueil avec un appel interrompu, Abandon) :
// - un brouillon (EX-14) : carte « Appel en cours », Abandonner (confirmé) ou Reprendre l'appel ;
//   elle remplace « Maintenant » ;
// - sinon « Maintenant » : la séance proposée (EX-09) et « Faire l'appel », « Appel enregistré » si
//   elle l'est (décision du 2026-11-27), ou « Aucune séance à proposer. ». L'appel sans créneau
//   s'ouvre par l'onglet « Nouvel appel » (ticket 012).
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import type { LocalNow } from '@/domain/occurrences';
import { endTime } from '@/domain/slots';
import { draftRoute, useDraft, useProposedSession, useRoster } from '@/hooks/useRollCall';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { errorMessage } from '@/ui/errorMessage';
import { Section } from '@/ui/Screen';

const d = labels.draft;
const h = labels.home;

type Props = { now: LocalNow; onError: (message: string | undefined) => void };

export const RollCallEntry = ({ now, onError }: Props) => {
  const router = useRouter();
  const proposed = useProposedSession(now);
  const { draft, loadFailed: draftFailed, discard } = useDraft();
  const call = proposed.session;
  const { roster } = useRoster(call?.group.id ?? null, call?.date ?? '');
  const [confirm, setConfirm] = useState(false);
  const failed = proposed.loadFailed || draftFailed;
  useEffect(() => onError(failed ? labels.common.loadFailed : undefined), [failed, onError]);

  if (draft) {
    const group = draft.groupName ?? d.removedGroup;
    const absents = Object.values(draft.statuses).filter((s) => s === 'absent').length;
    // Un brouillon qui ne peut plus être repris (groupe supprimé ou archivé, saison changée…) ne
    // peut qu'être abandonné.
    const resume = draft.resumable ? () => router.push(draftRoute(draft)) : undefined;
    return (
      <>
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
  }

  if (!proposed.loaded) return null;
  return (
    <>
      <Section title={h.now} />
      <Card>
        {call ? (
          <>
            <Text style={styles.big}>{call.group.name}</Text>
            {roster && (
              <Text style={styles.summary}>
                {h.session(
                  call.startTime,
                  endTime(call.startTime, call.slot.durationMin),
                  call.slot.place,
                  roster.length,
                )}
              </Text>
            )}
            {call.recorded ? (
              <Text style={styles.recorded}>{h.recorded}</Text>
            ) : (
              <View style={styles.actions}>
                <Button
                  label={h.start}
                  onPress={() =>
                    router.push({
                      pathname: '/appel',
                      params: { creneau: call.slot.id, date: call.date },
                    })
                  }
                />
              </View>
            )}
          </>
        ) : (
          <Text style={styles.summary}>{labels.rollCall.noSession}</Text>
        )}
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  title: { fontFamily: theme.fonts.textSemi, fontSize: 17, color: theme.colors.texte },
  big: { fontFamily: theme.fonts.textSemi, fontSize: 20, color: theme.colors.texte },
  recorded: {
    fontFamily: theme.fonts.textSemi,
    fontSize: 15,
    color: theme.colors.encre,
    marginTop: theme.spacing * 2,
  },
  summary: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing,
  },
  actions: { flexDirection: 'row', gap: theme.spacing * 2, marginTop: theme.spacing * 3 },
});
