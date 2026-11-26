// Contact d'urgence (maquette, EX-05) : « Qui est-ce ? » et « Téléphone » obligatoires,
// Enregistrer, « Supprimer ce contact » (suppression réelle, ABS-05). `nouveau?membre=…` en crée un.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { labels } from '@/config/libelles';
import { formatPhone, parsePhone } from '@/domain/phone';
import { useContact } from '@/hooks/useContacts';
import { Button } from '@/ui/Button';
import { errorMessage } from '@/ui/errorMessage';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.contactForm;
type Field = 'label' | 'phone';
const digitsOnly = (param: string | undefined) =>
  param && /^\d+$/.test(param) ? Number(param) : 0;

export default function ContactScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; membre?: string }>();
  const isNew = params.id === 'nouveau';
  const { contact, loaded, loadFailed, create, update, remove } = useContact(
    isNew ? null : digitsOnly(params.id),
  );
  const memberId = isNew ? digitsOnly(params.membre) : (contact?.memberId ?? 0);
  const [label, setLabel] = useState('');
  const [phone, setPhone] = useState('');
  const [filledId, setFilledId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!contact || contact.id === filledId) return;
    setLabel(contact.label);
    setPhone(formatPhone(contact.phone));
    setFilledId(contact.id);
  }, [contact, filledId]);

  const back = () =>
    router.canGoBack() ? router.back() : router.replace(memberId ? `/membres/${memberId}` : '/');

  /** Une action à la fois ; l'écran se ferme une fois l'écriture faite. */
  const run = async (action: () => Promise<unknown>) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      await action();
      back();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'NAME_REQUIRED') setErrors({ label: errorMessage(e) });
      else if (code === 'PHONE_INVALID') setErrors({ phone: errorMessage(e) });
      else setFormError(errorMessage(e));
      saving.current = false;
      setBusy(false);
    }
  };

  const save = () => {
    const found: Partial<Record<Field, string>> = {};
    if (label.trim() === '') found.label = labels.errors.NAME_REQUIRED;
    if (parsePhone(phone) === null) found.phone = labels.errors.PHONE_INVALID;
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    void run(() => (isNew ? create(memberId, { label, phone }) : update({ label, phone })));
  };

  const notFound = !isNew && loaded && contact === null;
  const error = loadFailed
    ? labels.common.loadFailed
    : notFound
      ? labels.errors.NOT_FOUND
      : formError;
  return (
    <Screen title={t.title} onBack={back} error={error}>
      {(isNew || contact) && (
        <>
          <TextField
            label={t.label}
            value={label}
            onChangeText={(value) => {
              setLabel(value);
              setErrors((e) => ({ ...e, label: undefined }));
            }}
            error={errors.label}
          />
          <TextField
            label={t.phone}
            mono
            phone
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setErrors((e) => ({ ...e, phone: undefined }));
            }}
            error={errors.phone}
          />
          <Button label={labels.common.save} disabled={busy} onPress={save} />
          {!isNew && (
            <Button
              label={t.delete}
              variant="destructiveSecondary"
              disabled={busy}
              onPress={() => void run(remove)}
            />
          )}
        </>
      )}
    </Screen>
  );
}
