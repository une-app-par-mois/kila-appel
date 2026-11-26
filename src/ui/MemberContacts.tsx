// Section Contacts d'urgence de la fiche d'un membre (maquette, EX-05) : dans l'ordre choisi,
// numéro par paires, poignée ≡ pour changer l'ordre ; un appui ouvre le contact.
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { formatPhone } from '@/domain/phone';
import { useMemberContacts } from '@/hooks/useContacts';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ReorderList } from '@/ui/ReorderList';
import { Section } from '@/ui/Screen';

type Props = {
  memberId: number;
  memberName: string;
  /** Erreur d'une action (réordonner), affichée par l'écran. */
  onError: (error: unknown) => void;
};

export const MemberContacts = ({ memberId, memberName, onError }: Props) => {
  const router = useRouter();
  const { contacts, loadFailed, reorder } = useMemberContacts(memberId);
  if (loadFailed)
    return (
      <>
        <Section title={labels.contacts.title} />
        <Card>
          <Text style={styles.text}>{labels.common.loadFailed}</Text>
        </Card>
      </>
    );
  if (contacts === null) return null;
  return (
    <>
      <Section title={labels.contacts.title} />
      <Card>
        {contacts.length === 0 ? (
          <Text style={styles.text}>{labels.contacts.none(memberName)}</Text>
        ) : (
          <ReorderList
            items={contacts.map((c) => ({
              id: c.id,
              title: c.label,
              subtitle: formatPhone(c.phone),
              onPress: () => router.push(`/contacts/${c.id}`),
            }))}
            onReorder={(ids) => void reorder(ids).catch(onError)}
          />
        )}
      </Card>
      <Button
        label={labels.contacts.add}
        variant="secondary"
        onPress={() => router.push(`/contacts/nouveau?membre=${memberId}`)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  text: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
});
