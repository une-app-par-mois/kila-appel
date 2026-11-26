// Saisons (maquette, EX-01) : la saison active porte la pastille ; les autres, « Activer ».
// Un appui sur une saison ouvre son formulaire.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { toDisplayDate } from '@/domain/formats';
import { useSeasons } from '@/hooks/useSeasons';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';

const t = labels.seasons;

export default function Seasons() {
  const router = useRouter();
  const { seasons, loadFailed, activate } = useSeasons();
  const [activateFailed, setActivateFailed] = useState(false);
  // Une liste relue (après n'importe quelle modification) efface l'ancien échec.
  useEffect(() => {
    if (seasons !== null) setActivateFailed(false);
  }, [seasons]);
  const onActivate = (id: number) => {
    setActivateFailed(false);
    activate(id).catch(() => setActivateFailed(true));
  };
  const createSeason = () => router.push('/saisons/nouvelle');
  const error = loadFailed
    ? labels.common.loadFailed
    : activateFailed
      ? labels.errors.unknown
      : undefined;
  return (
    <Screen
      title={t.title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      error={error}
    >
      {seasons !== null && seasons.length > 0 && (
        <Card>
          {seasons.map((season) => (
            <ListRow
              key={season.id}
              title={season.name}
              subtitle={t.period(toDisplayDate(season.startDate), toDisplayDate(season.endDate))}
              mono
              badge={season.isActive ? t.active : undefined}
              chevron={false}
              onPress={() => router.push(`/saisons/${season.id}`)}
              right={
                season.isActive ? undefined : (
                  <Button
                    label={t.activate}
                    variant="compact"
                    onPress={() => onActivate(season.id)}
                  />
                )
              }
            />
          ))}
        </Card>
      )}
      {seasons !== null && seasons.length > 0 && (
        <Button label={t.create} variant="secondary" onPress={createSeason} />
      )}
      {seasons !== null && seasons.length === 0 && (
        <Card>
          <Text style={styles.empty}>{t.empty}</Text>
          <Button label={t.create} onPress={createSeason} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: theme.colors.texte,
    marginBottom: theme.spacing * 3,
  },
});
