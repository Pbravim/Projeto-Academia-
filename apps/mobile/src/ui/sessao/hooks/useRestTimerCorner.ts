import { Storage } from 'expo-sqlite/kv-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, useWindowDimensions } from 'react-native';

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

/**
 * Escolhe o canto mais próximo do ponto (x, y) — o PONTO DE SOLTURA DO DEDO
 * (`gestureState.moveX/moveY`), não o centro do elemento — dentro de uma
 * tela `width` x `height` (achado #5, review-a-1.md: prosa desalinhada).
 */
export function snapToNearest(x: number, y: number, width: number, height: number): Corner {
  const isTop = y < height / 2;
  const isLeft = x < width / 2;
  if (isTop) return isLeft ? 'top-left' : 'top-right';
  return isLeft ? 'bottom-left' : 'bottom-right';
}

/**
 * Troca só a metade vertical de `corner`, preservando a horizontal de
 * `reference` (achado #7, review-a-1.md: arrastar o card expandido também
 * persistia a metade horizontal — invisível no card full-width, mas
 * surpreendia ao minimizar depois).
 */
export function withHorizontalOf(corner: Corner, reference: Corner): Corner {
  const isTop = corner.startsWith('top');
  const isLeft = reference.endsWith('left');
  if (isTop) return isLeft ? 'top-left' : 'top-right';
  return isLeft ? 'bottom-left' : 'bottom-right';
}

// Margens fixas, não somadas ao safe-area-inset: o banner monta dentro do
// `tabPage` (SessaoAtivaScreen), que já fica entre a `topBar`/`tabBar` do
// MobileApp — essas duas já absorvem o insets.top/insets.bottom. Somar de
// novo aqui só afasta o pill mais do que o necessário das bordas do tabPage
// (achado #4, review-a-1.md: safe area contada duas vezes).
//
// Sem offset de teclado: as duas telas consumidoras renderizam o banner como
// filho direto de `KeyboardAvoidingView` (behavior padding/height) e no
// Android o `softwareKeyboardLayoutMode` é o default `resize` — o container
// já encolhe pela altura do teclado. Somar de novo aqui empurrava o pill
// ~1× a altura do teclado para cima, cobrindo a lista (achado #1,
// review-a-1.md: offset de teclado duplicado).
function computePositionStyle(corner: Corner): RestTimerPositionStyle {
  const vertical = corner.startsWith('top') ? { top: TOP_EXTRA } : { bottom: EDGE_MARGIN };
  const horizontal = corner.endsWith('left') ? { left: SIDE_MARGIN } : { right: SIDE_MARGIN };
  return { ...vertical, ...horizontal };
}

/**
 * @param minimized Estado do pill/card no chamador. `true` (default) libera
 * o snap nos 4 cantos (pill). `false` (card expandido, full-width) preserva
 * a metade horizontal do canto atual no release — ver `withHorizontalOf`.
 */
export function useRestTimerCorner(minimized: boolean = true): RestTimerCornerState {
  const { width, height } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY()).current;

  const [corner, setCorner] = useState<Corner>('bottom-right');

  useEffect(() => {
    void Storage.getItem(REST_TIMER_CORNER_KEY)
      .then((value) => {
        if (isCorner(value)) setCorner(value);
      })
      .catch(() => {
        // canto persistido é cosmético — mantém o default em caso de falha do kv-store
      });
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
          const snapped = snapToNearest(gestureState.moveX, gestureState.moveY, width, height);
          const nextCorner = minimized ? snapped : withHorizontalOf(snapped, corner);
          setCorner(nextCorner);
          void Storage.setItem(REST_TIMER_CORNER_KEY, nextCorner);
          // Reset instantâneo, sem spring (achado #2, review-a-1.md: salto
          // visual no release). `positionStyle` já re-ancora no canto novo
          // no mesmo render; animar de (dx,dy) de volta a zero pintaria o
          // elemento fora da tela por um frame ao cruzar de canto (ex.:
          // bottom-right → top-left cai em topLeft + (−300,−600)).
          pan.setValue({ x: 0, y: 0 });
        },
      }),
    [pan, width, height, corner, minimized],
  );

  const positionStyle = useMemo(() => computePositionStyle(corner), [corner]);

  return {
    corner,
    panHandlers: panResponder.panHandlers,
    animatedStyle: { transform: pan.getTranslateTransform() },
    positionStyle,
  };
}
