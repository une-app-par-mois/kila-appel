// Onglets (tickets 012, 013) : l'accueil, l'historique et les paramètres ; tout le reste s'ouvre par-dessus, dans la
// pile racine. Barre dessinée d'après la maquette (`TabBar`).
import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/ui/TabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="historique" />
      <Tabs.Screen name="parametres" />
    </Tabs>
  );
}
