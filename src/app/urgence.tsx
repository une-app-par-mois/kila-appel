// Recherche d'un contact d'urgence (maquette, EX-06) : résultats dès la saisie, membres courants,
// leurs groupes et leurs contacts ; « Appeler » ouvre le composeur du système (lien tel:, aucune
// permission d'appel). Le numéro n'est jamais écrit dans le journal (ABS-04).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { log } from '@/data/log';
import { toIsoDate } from '@/domain/formats';
import { formatPhone } from '@/domain/phone';
import { useContactSearch } from '@/hooks/useContacts';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { NoMatch } from '@/ui/NoMatch';
import { Screen } from '@/ui/Screen';
import { TextField } from '@/ui/TextField';

const t = labels.emergency;

export default function Emergency() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [callFailed, setCallFailed] = useState(false);
  const { results, loadFailed } = useContactSearch(query, toIsoDate(new Date()));

  const call = (contactId: number, phone: string) => {
    setCallFailed(false);
    Linking.openURL(`tel:${phone}`).catch(() => {
      log('CALL_FAILED', { contactId });
      setCallFailed(true);
    });
  };

  const error = loadFailed ? labels.common.loadFailed : callFailed ? t.callFailed : undefined;
  const searching = query.trim() !== '';
  return (
    <Screen
      title={t.title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      error={error}
    >
      <TextField label={t.search} labelHidden autoFocus value={query} onChangeText={setQuery} />
      {searching && results?.length === 0 && (
        <Card>
          <NoMatch query={query} />
        </Card>
      )}
      {results?.map((r) => (
        <Card key={r.memberId}>
          <Text style={styles.name}>{labels.memberForm.fullName(r.firstName, r.lastName)}</Text>
          {r.groups.length > 0 && <Text style={styles.groups}>{r.groups.join(', ')}</Text>}
          {r.contacts.map((c) => (
            <View key={c.id} style={styles.contact}>
              <View style={styles.texts}>
                <Text style={styles.label}>{c.label}</Text>
                <Text style={styles.phone}>{formatPhone(c.phone)}</Text>
              </View>
              <Button
                label={t.call}
                accessibilityLabel={t.callLabel(c.label)}
                variant="compact"
                onPress={() => call(c.id, c.phone)}
              />
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: theme.fonts.title, fontSize: 20, color: theme.colors.texte },
  groups: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
  contact: {
    minHeight: theme.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing * 2,
    columnGap: theme.spacing * 2,
  },
  texts: { flex: 1 },
  label: { fontFamily: theme.fonts.textSemi, fontSize: 16, color: theme.colors.texte },
  phone: { fontFamily: theme.fonts.digits, fontSize: 14, color: theme.colors.texteSecondaire },
});
