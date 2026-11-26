// Icônes au trait (charte §8) : liste fermée, trait de 2, grille de 24.
// Texte secondaire au repos, Encre à l'état actif. Tout est embarqué (ABS-01).
// Import icône par icône : le point d'entrée principal ré-exporte toute la bibliothèque.
import Archive from 'lucide-react-native/icons/archive';
import ArchiveRestore from 'lucide-react-native/icons/archive-restore';
import Check from 'lucide-react-native/icons/check';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Plus from 'lucide-react-native/icons/plus';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { theme } from '@/config/theme';

const ICONS = {
  add: Plus,
  archive: Archive,
  back: ChevronLeft,
  check: Check,
  chevron: ChevronRight,
  delete: Trash2,
  unarchive: ArchiveRestore,
} as const;

export type IconName = keyof typeof ICONS;

type Props = { name: IconName; active?: boolean; testID?: string };

export const Icon = ({ name, active = false, testID }: Props) => {
  const Glyph = ICONS[name];
  return (
    <Glyph
      testID={testID}
      size={24}
      strokeWidth={2}
      color={active ? theme.colors.encre : theme.colors.texteSecondaire}
      accessible={false}
    />
  );
};
