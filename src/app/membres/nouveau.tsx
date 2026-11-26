// Nouveau membre (maquette, EX-03) : nom et prénom obligatoires, date de naissance et groupe
// facultatifs (et dits tels) ; inscrit au groupe choisi à partir d'aujourd'hui. Puis sa fiche.
// Depuis l'ajout à un groupe : ce groupe et la date choisie là-bas, puis retour (2026-11-26).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { isIsoDate, parseDisplayDate, startInSeason, toIsoDate } from '@/domain/formats';
import { useGroups } from '@/hooks/useGroups';
import { useMemberCreation } from '@/hooks/useMembers';
import { useSeasons } from '@/hooks/useSeasons';
import { Button } from '@/ui/Button';
import { errorMessage } from '@/ui/errorMessage';
import { Screen } from '@/ui/Screen';
import { Select } from '@/ui/Select';
import { TextField } from '@/ui/TextField';

const t = labels.memberForm;
type Field = 'firstName' | 'lastName' | 'birthDate';

/** Erreurs de saisie par champ, avant d'écrire (le dépôt valide de nouveau). */
const checkInput = (firstName: string, lastName: string, birth: string) => {
  const errors: Partial<Record<Field, string>> = {};
  if (firstName.trim() === '') errors.firstName = labels.errors.NAME_REQUIRED;
  if (lastName.trim() === '') errors.lastName = labels.errors.NAME_REQUIRED;
  if (birth.trim() !== '' && parseDisplayDate(birth) === null)
    errors.birthDate = labels.errors.DATE_INVALID;
  return errors;
};

export default function NewMember() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupe?: string; debut?: string; retour?: string }>();
  const presetGroup = params.groupe && /^\d+$/.test(params.groupe) ? Number(params.groupe) : null;
  const today = toIsoDate(new Date());
  const { seasons } = useSeasons();
  const active = seasons?.find((s) => s.isActive);
  // Date reçue de l'écran d'ajout, sinon aujourd'hui ramené dans la saison (EX-04).
  const startDate =
    params.debut && isIsoDate(params.debut) ? params.debut : startInSeason(today, active);
  const { groups } = useGroups(active?.id ?? null);
  const create = useMemberCreation(today);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birth, setBirth] = useState('');
  const [chosen, setGroupId] = useState<number | null>(presetGroup);
  // Un groupe qui n'est plus proposé (archivé, autre saison) n'est ni affiché ni utilisé.
  const groupId = groups?.some((g) => g.id === chosen) ? chosen : null;
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  const edit = (field: Field, set: (value: string) => void) => (value: string) => {
    set(value);
    setErrors((e) => ({ ...e, [field]: undefined }));
    setFormError(undefined);
  };

  const save = async () => {
    const found = checkInput(firstName, lastName, birth);
    setErrors(found);
    if (Object.keys(found).length > 0 || saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      const birthDate = birth.trim() === '' ? null : parseDisplayDate(birth);
      const id = await create({ firstName, lastName, birthDate }, groupId, startDate);
      if (params.retour === '1' && router.canGoBack()) router.back();
      else router.replace(`/membres/${id}`);
    } catch (e) {
      const message = errorMessage(e);
      if ((e as { code?: string } | null)?.code === 'DATE_IN_FUTURE')
        setErrors({ birthDate: message });
      else setFormError(message);
      saving.current = false;
      setBusy(false);
    }
  };

  return (
    <Screen
      title={t.createTitle}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/membres'))}
      error={formError}
    >
      <TextField
        label={t.firstName}
        value={firstName}
        onChangeText={edit('firstName', setFirstName)}
        error={errors.firstName}
      />
      <TextField
        label={t.lastName}
        value={lastName}
        onChangeText={edit('lastName', setLastName)}
        error={errors.lastName}
      />
      <TextField
        label={t.birthDate}
        hint={t.optionalFeminine}
        placeholder={t.datePlaceholder}
        mono
        value={birth}
        onChangeText={edit('birthDate', setBirth)}
        error={errors.birthDate}
      />
      <Select
        label={t.group}
        hint={t.optionalMasculine}
        value={groupId}
        placeholder={t.noGroup}
        options={[
          { value: null, label: t.noGroup },
          ...(groups ?? []).map((g) => ({ value: g.id as number | null, label: g.name })),
        ]}
        onChange={setGroupId}
      />
      <Button label={t.create} disabled={busy} onPress={() => void save()} />
      <Text style={styles.note}>{t.contactsLater}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    fontFamily: theme.fonts.text,
    fontSize: 14,
    color: theme.colors.texteSecondaire,
    marginTop: theme.spacing * 2,
  },
});
