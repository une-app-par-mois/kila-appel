// Fiche d'un membre (maquette, EX-03) : chaque champ s'enregistre en le quittant s'il est valide,
// sinon l'erreur reste sous le champ (décision du porteur du 2026-11-26). Les enregistrements se
// suivent, chacun parti du dernier enregistré ; une saisie non quittée s'enregistre en sortant.
// Groupes en cours ou à venir (EX-04) : « Retirer » à une date ; « Ajouter à un groupe » inscrit
// aujourd'hui (décision du porteur du 2026-11-26). Archiver ou désarchiver ; supprimer après une
// confirmation qui dit ce qui sera effacé (ABS-05). Contacts d'urgence : MemberContacts (EX-05).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { labels } from '@/config/libelles';
import type { MemberDeletionImpact } from '@/data/membersRepo';
import { parseDisplayDate, toDisplayDate, toIsoDate } from '@/domain/formats';
import type { MemberInput } from '@/domain/validation';
import { useGroups } from '@/hooks/useGroups';
import { useMember } from '@/hooks/useMembers';
import { useSeasons } from '@/hooks/useSeasons';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { errorMessage, memberNameError } from '@/ui/errorMessage';
import { MemberContacts } from '@/ui/MemberContacts';
import { MemberGroups } from '@/ui/MemberGroups';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.memberForm;
type Field = 'firstName' | 'lastName' | 'birthDate';
const FIELDS: Field[] = ['firstName', 'lastName', 'birthDate'];

/** Identifiant de l'adresse : chiffres seulement, sinon 0 (aucun membre). */
const idFrom = (param: string | undefined) => (param && /^\d+$/.test(param) ? Number(param) : 0);

/** Saisie d'un champ, appliquée au dernier enregistré ; une date illisible donne `undefined`. */
const withField = (saved: MemberInput, field: Field, value: string): MemberInput | undefined => {
  if (field !== 'birthDate') return { ...saved, [field]: value.trim() };
  if (value.trim() === '') return { ...saved, birthDate: null };
  const birthDate = parseDisplayDate(value);
  return birthDate === null ? undefined : { ...saved, birthDate };
};

const same = (a: MemberInput, b: MemberInput) =>
  a.firstName === b.firstName && a.lastName === b.lastName && a.birthDate === b.birthDate;

export default function MemberSheet() {
  const router = useRouter();
  const id = idFrom(useLocalSearchParams<{ id: string }>().id);
  const today = toIsoDate(new Date());
  const member$ = useMember(id, today);
  const { member, groups, loaded, loadFailed, update, updateOnLeave } = member$;
  const { seasons, loadFailed: seasonsFailed } = useSeasons();
  const active = seasons?.find((s) => s.isActive);
  const { groups: seasonGroups, loadFailed: groupsFailed } = useGroups(active?.id ?? null);
  const [values, setValues] = useState<Record<Field, string>>({
    firstName: '',
    lastName: '',
    birthDate: '',
  });
  // Membre dont la fiche est remplie : un autre membre dans le même écran la remplit de nouveau.
  const [filledId, setFilledId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [impact, setImpact] = useState<MemberDeletionImpact | null>(null);
  const [removed, setRemoved] = useState(false);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  // Dernière version enregistrée, saisie en cours, file des enregistrements.
  const saved = useRef<MemberInput | null>(null);
  // Saisie en cours, tenue à jour dès la frappe : une sortie de champ juste après ne doit pas
  // lire la valeur du rendu précédent.
  const current = useRef(values);
  const queue = useRef(Promise.resolve());
  const removedRef = useRef(false);

  useEffect(() => {
    if (!member || member.id === filledId) return;
    saved.current = {
      firstName: member.firstName,
      lastName: member.lastName,
      birthDate: member.birthDate,
    };
    const filled = {
      firstName: member.firstName,
      lastName: member.lastName,
      birthDate: member.birthDate ? toDisplayDate(member.birthDate) : '',
    };
    current.current = filled;
    setValues(filled);
    setFilledId(member.id);
  }, [member, filledId]);

  // En quittant l'écran : les champs valides pas encore enregistrés le sont, les autres écartés.
  useEffect(
    () => () => {
      const start = saved.current;
      if (start === null || removedRef.current) return;
      const now = toIsoDate(new Date());
      let input = start;
      for (const field of FIELDS) {
        const next = withField(input, field, current.current[field]);
        if (next === undefined) continue;
        // SEC-06 : nom ou prénom hors de la règle écarté ; EX-03 : date future écartée.
        if (field !== 'birthDate' && memberNameError(next[field]) !== undefined) continue;
        if (field === 'birthDate' && next.birthDate !== null && next.birthDate > now) continue;
        input = next;
      }
      if (!same(input, start)) updateOnLeave(input);
    },
    [updateOnLeave],
  );

  const show = (next: Record<Field, string>) => {
    current.current = next;
    setValues(next);
  };

  const edit = (field: Field) => (value: string) => {
    show({ ...current.current, [field]: value });
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const saveField = (field: Field) => {
    queue.current = queue.current.then(async () => {
      const base = saved.current;
      if (base === null) return;
      const input = withField(base, field, current.current[field]);
      if (input === undefined) {
        setErrors((e) => ({ ...e, [field]: labels.errors.DATE_INVALID }));
        return;
      }
      // Rien de changé : aucun message, même pour un nom ancien hors de la règle.
      if (same(input, base)) return;
      // SEC-06 : nom ou prénom contrôlé avant l'enregistrement, message sous le champ.
      const nameError = field === 'birthDate' ? undefined : memberNameError(input[field]);
      if (nameError !== undefined) {
        setErrors((e) => ({ ...e, [field]: nameError }));
        return;
      }
      try {
        await update(input);
        saved.current = input;
        // Nom et prénom affichés tels qu'enregistrés (sans espaces autour).
        if (field !== 'birthDate') show({ ...current.current, [field]: input[field] });
      } catch (e) {
        setErrors((errs) => ({ ...errs, [field]: errorMessage(e) }));
      }
    });
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

  const askDeletion = () => run(async () => setImpact(await member$.deletionImpact()));

  const confirmDeletion = async () => {
    removedRef.current = true;
    setRemoved(true);
    try {
      await member$.remove();
    } catch (e) {
      // Déjà supprimé ailleurs : le résultat voulu est là.
      if ((e as { code?: string }).code !== 'NOT_FOUND') {
        removedRef.current = false;
        setRemoved(false);
        setImpact(null);
        setFormError(errorMessage(e));
        return;
      }
    }
    setImpact(null);
    router.dismissTo('/membres');
  };

  // Groupes de la saison active où il n'est ni inscrit ni attendu.
  const addable = (seasonGroups ?? []).filter((g) => !groups.some((e) => e.groupId === g.id));
  const name = member ? t.fullName(member.firstName, member.lastName) : labels.members.title;
  const screenError =
    loadFailed || seasonsFailed || groupsFailed
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
            onBlur={() => saveField('firstName')}
            error={errors.firstName}
          />
          <TextField
            label={t.lastName}
            value={values.lastName}
            onChangeText={edit('lastName')}
            onBlur={() => saveField('lastName')}
            error={errors.lastName}
          />
          <TextField
            label={t.birthDate}
            hint={t.optionalFeminine}
            placeholder={t.datePlaceholder}
            mono
            value={values.birthDate}
            onChangeText={edit('birthDate')}
            onBlur={() => saveField('birthDate')}
            error={errors.birthDate}
          />
          <MemberContacts
            memberId={member.id}
            memberName={name}
            onError={(e) => setFormError(errorMessage(e))}
          />
          <MemberGroups
            memberName={name}
            archived={member.archivedAt !== null}
            today={today}
            groups={groups}
            addable={addable}
            busy={busy}
            onAdd={(groupId) => void run(() => member$.enrollIn(groupId))}
            onWithdraw={member$.withdraw}
            onCancel={(enrollmentId) => void run(() => member$.cancel(enrollmentId))}
          />
          {member.archivedAt === null ? (
            <Button
              label={t.archive}
              variant="secondary"
              disabled={busy}
              onPress={() => void run(member$.archive)}
            />
          ) : (
            <Button
              label={t.unarchive}
              variant="secondary"
              disabled={busy}
              onPress={() => void run(member$.unarchive)}
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
              message={labels.memberDeletion.message({
                ...impact,
                hasBirthDate: member.birthDate !== null,
              })}
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
