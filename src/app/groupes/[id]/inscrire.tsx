// Ajouter des membres à un groupe (maquette, EX-04) : membres courants pas encore inscrits, cases à
// cocher, date « À partir du » (aujourd'hui par défaut), « Inscrire N membres ». « Nouveau membre »
// crée un membre déjà inscrit à ce groupe, puis revient ici (décision du porteur du 2026-11-26).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { DataError } from '@/data/errors';
import { parseDisplayDate, startInSeason, toDisplayDate, toIsoDate } from '@/domain/formats';
import { useGroup } from '@/hooks/useGroups';
import { useEnrollments } from '@/hooks/useMembers';
import { useSeasons } from '@/hooks/useSeasons';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { errorMessage } from '@/ui/errorMessage';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.enrollment;

export default function Enroll() {
  const router = useRouter();
  const param = useLocalSearchParams<{ id: string }>().id;
  const id = param && /^\d+$/.test(param) ? Number(param) : 0;
  const today = toIsoDate(new Date());
  const { group, loaded, loadFailed } = useGroup(id);
  const [selected, setSelected] = useState<number[]>([]);
  const { seasons, loadFailed: seasonsFailed } = useSeasons();
  const active = seasons?.find((s) => s.isActive);
  // Saisie, sinon aujourd'hui ramené dans la saison active (EX-04, ticket 007e).
  const [typed, setDate] = useState<string | null>(null);
  const date = typed ?? toDisplayDate(startInSeason(today, active));
  // Candidats libres à la date saisie : l'inscription y est refusée sinon (chevauchement).
  const startDate = parseDisplayDate(date);
  const {
    candidates,
    loadFailed: candidatesFailed,
    enroll,
  } = useEnrollments(id, today, startDate ?? today);
  const [dateError, setDateError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  const toggle = (memberId: number) =>
    setSelected((ids) =>
      ids.includes(memberId) ? ids.filter((i) => i !== memberId) : [...ids, memberId],
    );

  const back = () => (router.canGoBack() ? router.back() : router.replace(`/groupes/${id}`));

  const save = async () => {
    if (startDate === null) {
      setDateError(labels.errors.DATE_INVALID);
      return;
    }
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      // Un membre décoché ou disparu entre-temps n'est pas inscrit.
      const ids = selected.filter((memberId) => candidates?.some((c) => c.id === memberId));
      if (ids.length === 0) throw new DataError('ALREADY_ENROLLED');
      await enroll(ids, startDate);
      back();
    } catch (e) {
      if ((e as { code?: string } | null)?.code === 'DATE_OUTSIDE_SEASON')
        setDateError(errorMessage(e));
      else setFormError(errorMessage(e));
      saving.current = false;
      setBusy(false);
    }
  };

  const count = selected.filter((memberId) => candidates?.some((c) => c.id === memberId)).length;
  const error =
    loadFailed || candidatesFailed || seasonsFailed
      ? labels.common.loadFailed
      : loaded && group === null
        ? labels.errors.NOT_FOUND
        : formError;
  return (
    <Screen title={group ? t.title(group.name) : labels.groups.title} onBack={back} error={error}>
      {group && candidates && seasons && (
        <>
          {candidates.length === 0 ? (
            <Text style={styles.text}>{t.noCandidate}</Text>
          ) : (
            <Card>
              {candidates.map((c) => {
                const checked = selected.includes(c.id);
                const name = labels.memberForm.fullName(c.firstName, c.lastName);
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={name}
                    accessibilityState={{ checked }}
                    onPress={() => toggle(c.id)}
                    style={styles.row}
                  >
                    <Text style={[styles.name, checked && styles.checked]}>{name}</Text>
                    {checked && <Icon name="check" active />}
                  </Pressable>
                );
              })}
            </Card>
          )}
          <TextField
            label={t.startDate}
            mono
            value={date}
            onChangeText={(value) => {
              setDate(value);
              setDateError(undefined);
              setFormError(undefined);
            }}
            error={dateError}
          />
          <View style={styles.actions}>
            <Button
              label={t.newMember}
              variant="secondary"
              flex={1}
              onPress={() => {
                // Le nouveau membre n'a pas de champ de date : elle est vérifiée ici.
                if (startDate === null) setDateError(labels.errors.DATE_INVALID);
                else if (startInSeason(startDate, active) !== startDate)
                  setDateError(labels.errors.DATE_OUTSIDE_SEASON);
                else router.push(`/membres/nouveau?groupe=${id}&debut=${startDate}&retour=1`);
              }}
            />
            <Button
              label={t.submit(count)}
              flex={2}
              disabled={busy || count === 0}
              onPress={() => void save()}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing * 2,
  },
  name: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
  checked: { fontFamily: theme.fonts.textSemi, color: theme.colors.encre },
  text: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
  actions: { flexDirection: 'row', gap: theme.spacing * 2.5, marginTop: theme.spacing * 3 },
});
