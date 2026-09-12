import { Storage } from 'expo-sqlite/kv-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, PanResponder, useWindowDimensions } from 'react-native';

export type Corner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export const REST_TIMER_CORNER_KEY = 'rest_timer_corner';

const CORNERS: readonly Corner[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];

const DRAG_THRESHOLD = 8;
const EDGE_MARGIN = 24;
const TOP_EXTRA = 16;
const SIDE_MARGIN = 16;

export interface RestTimerPositionStyle {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface RestTimerCornerState {
  corner: Corner;
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  animatedStyle: { transform: ReturnType<Animated.ValueXY['getTranslateTransform']> };
  positionStyle: RestTimerPositionStyle;
}

function isCorner(value: unknown): value is Corner {
  return typeof value === 'string' && (CORNERS as readonly string[]).includes(value);
}

/** Escolhe o canto mais próximo do ponto (x, y) dentro de uma tela `width` x `height`. */
export function snapToNearest(x: number, y: number, width: number, height: number): Corner {
  const isTop = y < height / 2;
  const isLeft = x < width / 2;
  if (isTop) return isLeft ? 'top-left' : 'top-right';
  return isLeft ? 'bottom-left' : 'bottom-right';
}

// Margens fixas, não somadas ao safe-area-inset: o banner monta dentro do
// `tabPage` (SessaoAtivaScreen), que já fica entre a `topBar`/`tabBar` do
// MobileApp — essas duas já absorvem o insets.top/insets.bottom. Somar de
// novo aqui só afasta o pill mais do que o necessário das bordas do tabPage
// (achado #4, review-a-1.md: safe area contada duas vezes).
function computePositionStyle(corner: Corner, keyboardHeight: number): RestTimerPositionStyle {
  const vertical = corner.startsWith('top')
    ? { top: TOP_EXTRA }
    : { bottom: EDGE_MARGIN + keyboardHeight };
  const horizontal = corner.endsWith('left') ? { left: SIDE_MARGIN } : { right: SIDE_MARGIN };
  return { ...vertical, ...horizontal };
}

export function useRestTimerCorner(): RestTimerCornerState {
  const { width, height } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY()).current;

  const [corner, setCorner] = useState<Corner>('bottom-right');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    void Storage.getItem(REST_TIMER_CORNER_KEY)
      .then((value) => {
        if (isCorner(value)) setCorner(value);
      })
      .catch(() => {
        // canto persistido é cosmético — mantém o default em caso de falha do kv-store
      });
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > DRAG_THRESHOLD || Math.abs(gestureState.dy) > DRAG_THRESHOLD,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gestureState) => {
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        },
        onPanResponderRelease: (_, gestureState) => {
          const nextCorner = snapToNearest(gestureState.moveX, gestureState.moveY, width, height);
          setCorner(nextCorner);
          void Storage.setItem(REST_TIMER_CORNER_KEY, nextCorner);
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        },
      }),
    [pan, width, height],
  );

  const positionStyle = useMemo(
    () => computePositionStyle(corner, keyboardHeight),
    [corner, keyboardHeight],
  );

  return {
    corner,
    panHandlers: panResponder.panHandlers,
    animatedStyle: { transform: pan.getTranslateTransform() },
    positionStyle,
  };
}
