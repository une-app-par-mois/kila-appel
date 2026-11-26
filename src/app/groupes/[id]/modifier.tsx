// Modifier un groupe (maquette, EX-02) : renommer, ou supprimer après une confirmation qui dit
// ce qui sera effacé (inscriptions et liens) et ce qui est gardé (séances, présences, membres).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { labels } from '@/config/libelles';
import type { GroupDeletionImpact } from '@/data/groupsRepo';
import { useGroup } from '@/hooks/useGroups';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { errorMessage } from '@/ui/errorMessage';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.groupForm;

export default function GroupEdit() {
  const router = useRouter();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const { group, loaded, loadFailed, rename, remove, deletionImpact } = useGroup(id);
  const [name, setName] = useState('');
  const [filled, setFilled] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [impact, setImpact] = useState<GroupDeletionImpact | null>(null);
  // Après la suppression, le groupe disparaît : ce n'est pas une erreur.
  const [removed, setRemoved] = useState(false);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!group || filled) return;
    setName(group.name);
    setFilled(true);
  }, [group, filled]);

  const back = () => (router.canGoBack() ? router.back() : router.replace(`/groupes/${id}`));

  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      await rename(name);
      back();
    } catch (e) {
      setError(errorMessage(e));
      saving.current = false;
      setBusy(false);
    }
  };

  const askDeletion = async () => {
    setFormError(undefined);
    try {
      setImpact(await deletionImpact());
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  const confirmDeletion = async () => {
    try {
      setRemoved(true);
      await remove();
      setImpact(null);
      router.dismissTo('/groupes');
    } catch (e) {
      setRemoved(false);
      setImpact(null);
      setFormError(errorMessage(e));
    }
  };

  const screenError = loadFailed
    ? labels.common.loadFailed
    : loaded && group === null && !removed
      ? labels.errors.NOT_FOUND
      : formError;
  return (
    <Screen title={t.editTitle} onBack={back} error={screenError}>
      {group && (
        <>
          <TextField
            label={t.name}
            value={name}
            onChangeText={(value) => {
              setName(value);
              setError(undefined);
              setFormError(undefined);
            }}
            error={error}
          />
          <Button label={labels.common.save} disabled={busy} onPress={() => void save()} />
          <Button
            label={t.delete}
            variant="destructiveSecondary"
            onPress={() => void askDeletion()}
          />
          {impact !== null && (
            <ConfirmDialog
              visible
              title={labels.groupDeletion.title(group.name)}
              message={labels.groupDeletion.message(impact)}
              note={labels.groupDeletion.kept}
              cancelLabel={labels.common.keep}
              confirmLabel={labels.common.deleteForever}
              onCancel={() => setImpact(null)}
              onConfirm={() => void confirmDeletion()}
            />
          )}
        </>
      )}
    </Screen>
  );
}
