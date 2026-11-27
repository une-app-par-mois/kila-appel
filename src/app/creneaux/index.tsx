// Créneaux de la saison active (maquette, EX-07) : « Mercredi 14:00 – 15:30 », puis groupe · lieu.
// Un seul bouton « Nouveau créneau » au lot 1 (décision du porteur du 2026-11-27).
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { endTime } from '@/domain/slots';
import { useSeasons } from '@/hooks/useSeasons';
import { useSlots } from '@/hooks/useSlots';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';

const t = labels.slots;

export default function Slots() {
  const router = useRouter();
  const { seasons, loadFailed: seasonsFailed } = useSeasons();
  const active = seasons?.find((s) => s.isActive);
  const { slots, loadFailed } = useSlots(active?.id ?? null);
  return (
    <Screen
      title={t.title}
      subtitle={active && <Text style={styles.subtitle}>{active.name}</Text>}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      error={seasonsFailed || loadFailed ? labels.common.loadFailed : undefined}
    >
      {seasons !== null && active === undefined && (
        <Card>
          <Text style={styles.text}>{t.noActiveSeason}</Text>
          <Button label={t.toSeasons} onPress={() => router.push('/saisons')} />
        </Card>
      )}
      {slots && slots.length > 0 && (
        <Card>
          {slots.map((slot) => (
            <ListRow
              key={slot.id}
              title={t.row(
                labels.weekdays[slot.weekday - 1] ?? '',
                slot.startTime,
                endTime(slot.startTime, slot.durationMin),
              )}
              subtitle={t.details(
                [...slot.groups.map((g) => g.name), slot.place ?? ''].filter((p) => p !== ''),
              )}
              onPress={() => router.push(`/creneaux/${slot.id}`)}
            />
          ))}
        </Card>
      )}
      {slots && slots.length === 0 && (
        <Card>
          <Text style={styles.text}>{t.empty}</Text>
          <Button label={t.create} onPress={() => router.push('/creneaux/nouveau')} />
        </Card>
      )}
      {slots && slots.length > 0 && (
        <Button label={t.create} onPress={() => router.push('/creneaux/nouveau')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  text: {
    fontFamily: theme.fonts.text,
    fontSize: 16,
    color: theme.colors.texte,
    marginBottom: theme.spacing * 3,
  },
});
