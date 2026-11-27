// Icônes au trait (charte §8) : liste fermée, trait de 2, grille de 24.
// Texte secondaire au repos, Encre à l'état actif. Tout est embarqué (ABS-01).
// Import icône par icône : le point d'entrée principal ré-exporte toute la bibliothèque.
import Archive from 'lucide-react-native/icons/archive';
import ArchiveRestore from 'lucide-react-native/icons/archive-restore';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Clock from 'lucide-react-native/icons/clock';
import EqualApproximately from 'lucide-react-native/icons/equal-approximately';
import Grip from 'lucide-react-native/icons/grip-horizontal';
import Phone from 'lucide-react-native/icons/phone';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import Trash2 from 'lucide-react-native/icons/trash-2';
import X from 'lucide-react-native/icons/x';
import { theme } from '@/config/theme';

const ICONS = {
  add: Plus,
  archive: Archive,
  back: ChevronLeft,
  check: Check,
  chevron: ChevronRight,
  /** Champ de choix « ▾ » (maquettes). */
  choices: ChevronDown,
  delete: Trash2,
  /** Poignée ≡ pour glisser (maquette Fiche membre). */
  grip: Grip,
  phone: Phone,
  search: Search,
  unarchive: ArchiveRestore,
  /** Statuts de l'appel (maquette : ✓ ✕ ◷ ≈, EX-10). */
  present: Check,
  absent: X,
  late: Clock,
  excused: EqualApproximately,
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  active?: boolean;
  testID?: string;
  /** Couleur imposée (texte d'une pastille de statut) ; sinon Texte secondaire ou Encre. */
  color?: string;
  size?: number;
};

export const Icon = ({ name, active = false, testID, color, size = 24 }: Props) => {
  const Glyph = ICONS[name];
  return (
    <Glyph
      testID={testID}
      size={size}
      strokeWidth={2}
      color={color ?? (active ? theme.colors.encre : theme.colors.texteSecondaire)}
      accessible={false}
    />
  );
};
