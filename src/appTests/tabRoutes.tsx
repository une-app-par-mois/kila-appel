// Routes des onglets (tickets 012, 013) pour les tests d'écran : accueil à « / », historique à
// « /historique », paramètres à « /parametres », comme dans l'appli.
import { Stack } from 'expo-router';
import TabsLayout from '@/app/(tabs)/_layout';
import History from '@/app/(tabs)/historique';
import Home from '@/app/(tabs)/index';
import Settings from '@/app/(tabs)/parametres';

export const tabRoutes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': Home,
  '(tabs)/historique': History,
  '(tabs)/parametres': Settings,
};

/**
 * Pile racine comme `src/app/_layout.tsx`, pour les tests qui reviennent d'un écran ouvert
 * par-dessus les onglets : sans elle, le retour remet les onglets sur l'accueil.
 */
export const RootStack = () => <Stack screenOptions={{ headerShown: false }} />;
