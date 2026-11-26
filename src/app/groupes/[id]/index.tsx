// Fiche d'un groupe (maquette, EX-02, EX-04) : saison, nombre d'inscrits du jour, « Renommer ou
// supprimer » ; ses inscrits (« jusqu'au » si un retrait est prévu) et ceux « À venir » (décision
// du porteur du 2026-11-26) ; archiver ou désarchiver, « Ajouter des membres ».
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { previousDay, toDisplayDate, toIsoDate } from '@/domain/formats';
import { useGroup } from '@/hooks/useGroups';
import { useEnrollments } from '@/hooks/useMembers';
import { useSeasons } from '@/hooks/useSeasons';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { errorMessage } from '@/ui/errorMessage';
import { ListRow } from '@/ui/ListRow';
import { Screen, Section } from '@/ui/Screen';

const t = labels.group;
// Durée minimale du blocage après une action : un double appui (quelques centaines de ms) ne doit
// pas toucher « Désarchiver », qui remplace « Archiver » dès le rechargement local (quelques ms).
const ACTION_LOCK_MS = 500;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function GroupDetail() {
  const router = useRouter();
  const param = useLocalSearchParams<{ id: string }>().id;
  // Chiffres seulement, sinon 0 : aucun groupe (« introuvable »).
  const id = param && /^\d+$/.test(param) ? Number(param) : 0;
  const today = toIsoDate(new Date());
  const { group, loaded, loadFailed, archive, unarchive } = useGroup(id);
  const { enrollments, upcoming, loadFailed: enrollmentsFailed } = useEnrollments(id, today);
  const { seasons, loadFailed: seasonsFailed } = useSeasons();
  const season = seasons?.find((s) => s.id === group?.seasonId);
  const [actionError, setActionError] = useState<string | undefined>();

  // Une action à la fois : sinon un double appui sur « Archiver » toucherait « Désarchiver »,
  // qui prend sa place dès le rechargement.
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = (action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setActionError(undefined);
    // Les erreurs sont captées par le catch de l’action ; rien ne peut rejeter ici.
    void Promise.all([
      action().catch((e: unknown) => setActionError(errorMessage(e))),
      wait(ACTION_LOCK_MS),
    ]).finally(() => {
      pending.current = false;
      setBusy(false);
    });
  };

  const error =
    loadFailed || seasonsFailed || enrollmentsFailed
      ? labels.common.loadFailed
      : loaded && group === null
        ? labels.errors.NOT_FOUND
        : actionError;
  return (
    <Screen
      title={group?.name ?? labels.groups.title}
      subtitle={
        group && (
          <View style={styles.subtitle}>
            {season && <Text style={styles.season}>{t.seasonOf(season.name)}</Text>}
            {enrollments && <Text style={styles.season}>{t.memberCount(enrollments.length)}</Text>}
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push(`/groupes/${id}/modifier`)}
              style={styles.link}
            >
              <Text style={styles.linkText}>{t.edit}</Text>
            </Pressable>
          </View>
        )
      }
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/groupes'))}
      error={error}
    >
      {group && (
        <>
          {enrollments?.length === 0 && upcoming?.length === 0 && (
            <Card>
              <Text style={styles.text}>{t.noMember}</Text>
            </Card>
          )}
          {enrollments && enrollments.length > 0 && (
            <Card>
              {enrollments.map((e) => (
                <ListRow
                  key={e.enrollmentId}
                  title={labels.memberForm.fullName(e.firstName, e.lastName)}
                  subtitle={t.period(
                    toDisplayDate(e.startDate),
                    e.endDate === null ? null : toDisplayDate(previousDay(e.endDate)),
                  )}
                  onPress={() => router.push(`/membres/${e.memberId}`)}
                />
              ))}
            </Card>
          )}
          {upcoming && upcoming.length > 0 && (
            <>
              <Section title={t.upcoming} />
              <Card>
                {upcoming.map((e) => (
                  <ListRow
                    key={e.enrollmentId}
                    title={labels.memberForm.fullName(e.firstName, e.lastName)}
                    subtitle={t.from(toDisplayDate(e.startDate))}
                    onPress={() => router.push(`/membres/${e.memberId}`)}
                  />
                ))}
              </Card>
            </>
          )}
          <View style={styles.actions}>
            {group.archivedAt === null ? (
              <Button
                label={t.archive}
                variant="secondary"
                flex={1}
                disabled={busy}
                onPress={() => run(() => archive(today))}
              />
            ) : (
              <Button
                label={t.unarchive}
                variant="secondary"
                flex={1}
                disabled={busy}
                onPress={() => run(unarchive)}
              />
            )}
            {group.archivedAt === null && season?.isActive && (
              <Button
                label={t.addMembers}
                flex={2}
                onPress={() => router.push(`/groupes/${id}/inscrire`)}
              />
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  season: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  link: { minHeight: theme.minTouchTarget, justifyContent: 'center' },
  linkText: {
    fontFamily: theme.fonts.textSemi,
    fontSize: 14,
    color: theme.colors.encre,
    textDecorationLine: 'underline',
  },
  text: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
  actions: { flexDirection: 'row', gap: theme.spacing * 2.5, marginTop: theme.spacing * 3 },
});
