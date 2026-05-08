import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../shared/theme';

export const PICKER_ITEM_H = 44;
const VISIBLE = 3;
const SIDE = 1;

interface Props {
  count: number;
  selectedIndex: number;
  onChangeIndex: (index: number) => void;
  formatItem: (index: number) => string;
}

export function PickerCarousel({ count, selectedIndex, onChangeIndex, formatItem }: Props) {
  const c = useTheme();
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      // paddingVertical = SIDE * PICKER_ITEM_H keeps the math: item k centred at scrollY = k * PICKER_ITEM_H
      ref.current?.scrollTo({ y: selectedIndex * PICKER_ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  const handleScrollEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const idx = Math.max(0, Math.min(
      Math.round(e.nativeEvent.contentOffset.y / PICKER_ITEM_H),
      count - 1,
    ));
    onChangeIndex(idx);
  };

  return (
    <View style={[styles.root, { borderColor: c.inputBorder, backgroundColor: c.inputBg }]}>
      {/* Selector rendered FIRST so it paints behind the list text */}
      <View
        pointerEvents="none"
        style={[styles.selector, {
          top: PICKER_ITEM_H * SIDE,
          height: PICKER_ITEM_H,
          backgroundColor: c.accentLight,
          borderColor: c.accent,
        }]}
      />

      {/* Scrollable list on top of the selector */}
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={PICKER_ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: PICKER_ITEM_H * SIDE }}
        style={styles.list}
      >
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={styles.item}>
            <Text style={{ color: c.inputText, fontSize: 18, fontWeight: '600' }}>
              {formatItem(i)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Masks after the list — dim non-selected rows */}
      <View pointerEvents="none" style={[styles.maskTop, { backgroundColor: c.inputBg }]} />
      <View pointerEvents="none" style={[styles.maskBot, { backgroundColor: c.inputBg }]} />
    </View>
  );
}

const CONTAINER_H = PICKER_ITEM_H * VISIBLE;

const styles = StyleSheet.create({
  root: { height: CONTAINER_H, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  list: { flex: 1 },
  item: { height: PICKER_ITEM_H, justifyContent: 'center', alignItems: 'center' },
  selector: { position: 'absolute', left: 10, right: 10, borderRadius: 10, borderWidth: 1.5 },
  maskTop: { position: 'absolute', top: 0, left: 0, right: 0, height: PICKER_ITEM_H * SIDE - 2, opacity: 0.75 },
  maskBot: { position: 'absolute', bottom: 0, left: 0, right: 0, height: PICKER_ITEM_H * SIDE - 2, opacity: 0.75 },
});
