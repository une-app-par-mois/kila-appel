// Réglages communs des tests (008b). Le détecteur de geste de gesture-handler laisse sous Jest une
// mise à jour en cours après le démontage, qui déborde sur le test suivant (« overlapping act ») ;
// le glisser ne se joue pas dans Jest : le détecteur rend ses enfants tels quels. L'ordre des
// contacts reste testé par les actions d'accessibilité de la poignée ; le glisser, sur appareil.
jest.mock('react-native-gesture-handler', () => ({
  ...jest.requireActual('react-native-gesture-handler'),
  GestureDetector: ({ children }) => children,
}));
