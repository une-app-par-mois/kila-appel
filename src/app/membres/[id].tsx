// Fiche d'un membre (maquette, EX-03) : chaque champ s'enregistre en le quittant s'il est valide,
// sinon l'erreur reste sous le champ (décision du porteur du 2026-11-26). Archiver ou désarchiver ;
// supprimer après une confirmation qui dit ce qui sera effacé (ABS-05).
// Sections Contacts (008) et Groupes (007c) : à venir.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { labels } from '@/config/libelles';
import type { Member, MemberDeletionImpact } from '@/data/membersRepo';
import { parseDisplayDate, toDisplayDate, toIsoDate } from '@/domain/formats';
import type { MemberInput } from '@/domain/validation';
import { useMember } from '@/hooks/useMembers';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { errorMessage } from '@/ui/errorMessage';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.memberForm;
type Field = 'firstName' | 'lastName' | 'birthDate';

/** Identifiant de l'adresse : chiffres seulement, sinon 0 (aucun membre). */
const idFrom = (param: string | undefined) => (param && /^\d+$/.test(param) ? Number(param) : 0);

/** Saisie du champ, appliquée au membre enregistré ; une date illisible donne `undefined`. */
const withField = (member: Member, field: Field, value: string): MemberInput | undefined => {
  const input = {
    firstName: member.firstName,
    lastName: member.lastName,
    birthDate: member.birthDate,
  };
  if (field !== 'birthDate') return { ...input, [field]: value };
  if (value.trim() === '') return { ...input, birthDate: null };
  const birthDate = parseDisplayDate(value);
  return birthDate === null ? undefined : { ...input, birthDate };
};

export default function MemberSheet() {
  const router = useRouter();
  const id = idFrom(useLocalSearchParams<{ id: string }>().id);
  const today = toIsoDate(new Date());
  const { member, loaded, loadFailed, update, archive, unarchive, remove, deletionImpact } =
    useMember(id, today);
  const [values, setValues] = useState<Record<Field, string>>({
    firstName: '',
    lastName: '',
    birthDate: '',
  });
  const [filled, setFilled] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [impact, setImpact] = useState<MemberDeletionImpact | null>(null);
  const [removed, setRemoved] = useState(false);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!member || filled) return;
    setValues({
      firstName: member.firstName,
      lastName: member.lastName,
      birthDate: member.birthDate ? toDisplayDate(member.birthDate) : '',
    });
    setFilled(true);
  }, [member, filled]);

  const edit = (field: Field) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const saveField = (field: Field) => async () => {
    if (!member) return;
    const input = withField(member, field, values[field]);
    if (input === undefined) {
      setErrors((e) => ({ ...e, [field]: labels.errors.DATE_INVALID }));
      return;
    }
    const unchanged =
      input.firstName === member.firstName &&
      input.lastName === member.lastName &&
      input.birthDate === member.birthDate;
    if (unchanged) return;
    try {
      await update(input);
    } catch (e) {
      setErrors((current) => ({ ...current, [field]: errorMessage(e) }));
    }
  };

  /** Une action à la fois : « Désarchiver » remplace « Archiver » dès le rechargement. */
  const run = async (action: () => Promise<unknown>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setFormError(undefined);
    try {
      await action();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const askDeletion = () => run(async () => setImpact(await deletionImpact()));

  const confirmDeletion = async () => {
    try {
      setRemoved(true);
      await remove();
      setImpact(null);
      router.dismissTo('/membres');
    } catch (e) {
      setRemoved(false);
      setImpact(null);
      setFormError(errorMessage(e));
    }
  };

  const name = member ? t.fullName(member.firstName, member.lastName) : labels.members.title;
  const screenError = loadFailed
    ? labels.common.loadFailed
    : loaded && member === null && !removed
      ? labels.errors.NOT_FOUND
      : formError;
  return (
    <Screen
      title={name}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/membres'))}
      error={screenError}
    >
      {member && (
        <>
          <TextField
            label={t.firstName}
            value={values.firstName}
            onChangeText={edit('firstName')}
            onBlur={() => void saveField('firstName')()}
            error={errors.firstName}
          />
          <TextField
            label={t.lastName}
            value={values.lastName}
            onChangeText={edit('lastName')}
            onBlur={() => void saveField('lastName')()}
            error={errors.lastName}
          />
          <TextField
            label={t.birthDate}
            hint={t.optionalFeminine}
            placeholder={t.datePlaceholder}
            mono
            value={values.birthDate}
            onChangeText={edit('birthDate')}
            onBlur={() => void saveField('birthDate')()}
            error={errors.birthDate}
          />
          {member.archivedAt === null ? (
            <Button
              label={t.archive}
              variant="secondary"
              disabled={busy}
              onPress={() => void run(archive)}
            />
          ) : (
            <Button
              label={t.unarchive}
              variant="secondary"
              disabled={busy}
              onPress={() => void run(unarchive)}
            />
          )}
          <Button
            label={t.delete}
            variant="destructiveSecondary"
            disabled={busy}
            onPress={() => void askDeletion()}
          />
          {impact !== null && (
            <ConfirmDialog
              visible
              title={labels.memberDeletion.title(name)}
              message={labels.memberDeletion.message(impact)}
              note={labels.memberDeletion.kept}
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
