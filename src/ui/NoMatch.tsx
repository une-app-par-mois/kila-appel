// Recherche sans résultat (maquette « États vides », P1, NF-06) : la saisie rappelée et un conseil.
// Même texte pour la liste des membres, le contact d'urgence et l'appel.
import { StyleSheet, Text, View } from 'react-native';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';

// Lu d'un bloc, et annoncé au lecteur d'écran dès qu'il apparaît pendant la saisie (NF-06).
export const NoMatch = ({ query }: { query: string }) => (
  <View accessible accessibilityLiveRegion="polite">
    <Text style={styles.text}>{labels.members.noMatch(query.trim())}</Text>
    <Text style={styles.hint}>{labels.members.noMatchHint}</Text>
  </View>
);

const styles = StyleSheet.create({
  text: { fontFamily: theme.fonts.text, fontSize: 16, color: theme.colors.texte },
  hint: { fontFamily: theme.fonts.text, fontSize: 14, color: theme.colors.texteSecondaire },
});
