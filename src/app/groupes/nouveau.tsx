// Nouveau groupe (maquette, EX-02) : rattaché à la saison active, puis ouverture de sa fiche.
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { useGroups } from '@/hooks/useGroups';
import { useSeasons } from '@/hooks/useSeasons';
import { Button } from '@/ui/Button';
import { errorMessage } from '@/ui/errorMessage';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.groupForm;

export default function NewGroup() {
  const router = useRouter();
  const { seasons, loadFailed } = useSeasons();
  const active = seasons?.find((s) => s.isActive);
  const { create } = useGroups(active?.id ?? null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      const id = await create(name);
      router.replace(`/groupes/${id}`);
    } catch (e) {
      setError(errorMessage(e));
      saving.current = false;
      setBusy(false);
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/groupes'));
  const screenError = loadFailed
    ? labels.common.loadFailed
    : seasons !== null && active === undefined
      ? labels.groups.noActiveSeason
      : undefined;
  return (
    <Screen title={t.newTitle} onBack={back} error={screenError}>
      {active && (
        <>
          <TextField
            label={t.name}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setError(undefined);
            }}
            error={error}
          />
          <Text style={styles.help}>{t.attachedTo(active.name)}</Text>
          <Button label={t.create} disabled={busy} onPress={() => void save()} />
          <Text style={styles.note}>{t.next}</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  note: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing * 2,
  },
});
