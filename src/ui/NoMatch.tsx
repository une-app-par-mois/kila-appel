// Recherche sans résultat (maquette « États vides », P1, NF-06) : la saisie rappelée et un conseil.
// Même texte pour la liste des membres, le contact d'urgence et l'appel.
import { StyleSheet, Text } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';

export const NoMatch = ({ query }: { query: string }) => (
  <>
    <Text style={styles.text}>{labels.members.noMatch(query.trim())}</Text>
    <Text style={styles.hint}>{labels.members.noMatchHint}</Text>
  </>
);

const styles = StyleSheet.create({
  text: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
  hint: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
});
