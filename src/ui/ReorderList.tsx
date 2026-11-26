// Liste réordonnable (maquette Fiche membre, EX-05) : la poignée ≡ se glisse vers le haut ou le bas
// (react-native-gesture-handler et react-native-reanimated, décision du porteur du 2026-11-26).
// Le lecteur d'écran a les actions « Monter » et « Descendre » sur la même poignée.
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { labels } from '@/config/libelles';
import { theme } from '@/config/theme';
import { Icon } from '@/ui/Icon';
import { ListRow } from '@/ui/ListRow';

export type ReorderItem = { id: number; title: string; subtitle: string; onPress: () => void };

type Props = {
  items: ReorderItem[];
  /** Nouvel ordre des identifiants, une fois le déplacement fini. */
  onReorder: (ids: number[]) => void;
};

const moved = (ids: number[], from: number, to: number) => {
  const next = ids.filter((_, i) => i !== from);
  next.splice(to, 0, ids[from] as number);
  return next;
};

export const ReorderList = ({ items, onReorder }: Props) => {
  // Hauteur d'une ligne, mesurée : un glissement d'une hauteur vaut un rang.
  const [rowHeight, setRowHeight] = useState<number>(theme.minTouchTarget);
  // Ordre affiché, changé dès le déplacement : un deuxième déplacement avant la relecture de la
  // base part de cet ordre, pas de l'ancien. Une nouvelle liste reçue le remplace.
  const received = items.map((item) => item.id).join(',');
  const [order, setOrder] = useState({ received, ids: items.map((item) => item.id) });
  const ids = order.received === received ? order.ids : items.map((item) => item.id);
  const latest = useRef(ids);
  latest.current = ids;
  const move = (id: number, steps: number) => {
    const current = latest.current;
    const from = current.indexOf(id);
    const to = Math.min(current.length - 1, Math.max(0, from + steps));
    if (from === -1 || to === from) return;
    const next = moved(current, from, to);
    latest.current = next;
    setOrder({ received, ids: next });
    onReorder(next);
  };
  const byId = new Map(items.map((item) => [item.id, item]));
  return (
    <>
      {ids.map((id) => {
        const item = byId.get(id);
        return item ? (
          <Row
            key={id}
            item={item}
            rowHeight={rowHeight}
            onMeasure={setRowHeight}
            onMove={(steps) => move(id, steps)}
          />
        ) : null;
      })}
    </>
  );
};

type RowProps = {
  item: ReorderItem;
  rowHeight: number;
  onMeasure: (height: number) => void;
  onMove: (steps: number) => void;
};

const Row = ({ item, rowHeight, onMeasure, onMove }: RowProps) => {
  const offset = useSharedValue(0);
  const pan = usePanGesture({
    onUpdate: (event) => {
      'worklet';
      offset.value = event.translationY;
    },
    onDeactivate: (event) => {
      'worklet';
      offset.value = 0;
      // Geste interrompu (le défilement a pris la main) : l'ordre ne change pas.
      if (!event.canceled) scheduleOnRN(onMove, Math.round(event.translationY / rowHeight));
    },
  });
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    zIndex: offset.value === 0 ? 0 : 1,
  }));
  return (
    <Animated.View
      style={[styles.row, animated]}
      onLayout={(e) => onMeasure(e.nativeEvent.layout.height)}
    >
      <ListRow
        title={item.title}
        subtitle={item.subtitle}
        mono
        chevron={false}
        onPress={item.onPress}
        right={
          <GestureDetector gesture={pan}>
            <View
              accessible
              accessibilityLabel={labels.contacts.handle(item.title)}
              accessibilityActions={[
                { name: 'moveUp', label: labels.contacts.moveUp },
                { name: 'moveDown', label: labels.contacts.moveDown },
              ]}
              onAccessibilityAction={(e) => onMove(e.nativeEvent.actionName === 'moveUp' ? -1 : 1)}
              style={styles.handle}
            >
              <Icon name="grip" />
            </View>
          </GestureDetector>
        }
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: { backgroundColor: theme.colors.blanc },
  handle: {
    minWidth: theme.minTouchTarget,
    minHeight: theme.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
