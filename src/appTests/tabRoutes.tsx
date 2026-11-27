// Routes des onglets (ticket 012) pour les tests d'écran : accueil à « / », paramètres à
// « /parametres », comme dans l'appli.
import TabsLayout from '@/app/(tabs)/_layout';
import Home from '@/app/(tabs)/index';
import Settings from '@/app/(tabs)/parametres';

export const tabRoutes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': Home,
  '(tabs)/parametres': Settings,
};
