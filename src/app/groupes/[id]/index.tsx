// Fiche d'un groupe (maquette, EX-02) : saison, « Renommer ou supprimer », archiver ou désarchiver.
// La liste des membres et « Ajouter des membres » arrivent au ticket 007.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { toIsoDate } from '@/domain/formats';
import { useGroup } from '@/hooks/useGroups';
import { useSeasons } from '@/hooks/useSeasons';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { errorMessage } from '@/ui/errorMessage';
import { Screen } from '@/ui/Screen';

const t = labels.group;

export default function GroupDetail() {
  const router = useRouter();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const { group, loaded, loadFailed, archive, unarchive } = useGroup(id);
  const { seasons } = useSeasons();
  const season = seasons?.find((s) => s.id === group?.seasonId);
  const [actionError, setActionError] = useState<string | undefined>();

  const run = (action: () => Promise<void>) => {
    setActionError(undefined);
    action().catch((e: unknown) => setActionError(errorMessage(e)));
  };

  const error = loadFailed
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
          {group.enrollmentCount === 0 && (
            <Card>
              <Text style={styles.text}>{t.noMember}</Text>
            </Card>
          )}
          {group.archivedAt === null ? (
            <Button
              label={t.archive}
              variant="secondary"
              onPress={() => run(() => archive(toIsoDate(new Date())))}
            />
          ) : (
            <Button label={t.unarchive} variant="secondary" onPress={() => run(unarchive)} />
          )}
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
});
