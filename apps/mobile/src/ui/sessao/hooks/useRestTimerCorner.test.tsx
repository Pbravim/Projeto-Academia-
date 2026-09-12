import { beforeEach, describe, expect, it, vi } from 'vitest';

import { act, renderHook } from '../../../test/renderHook';

import {
  REST_TIMER_CORNER_KEY,
  snapToNearest,
  useRestTimerCorner,
  withHorizontalOf,
} from './useRestTimerCorner';

// Mock expo-sqlite kv-store
const kvStore: Record<string, string> = {};
vi.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItem: vi.fn((key: string) => Promise.resolve(kvStore[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      kvStore[key] = value;
      return Promise.resolve();
    }),
  },
}));

// Capture the PanResponder config so tests can drive onPanResponderRelease
// directly, without simulating the native touch-responder tracking.
let capturedConfig: {
  onMoveShouldSetPanResponder?: (evt: unknown, gestureState: { dx: number; dy: number }) => boolean;
  onPanResponderMove?: (evt: unknown, gestureState: { dx: number; dy: number }) => void;
  onPanResponderRelease?: (evt: unknown, gestureState: { moveX: number; moveY: number }) => void;
  onPanResponderTerminationRequest?: () => boolean;
} = {};

// setValue espiado para o achado #2 (salto visual no release): confirma que o
// reset usa `pan.setValue` direto, não `Animated.spring`.
const setValueSpy = vi.hoisted(() => vi.fn());
const springSpy = vi.hoisted(() => vi.fn());

vi.mock('react-native', () => ({
  PanResponder: {
    create: (config: typeof capturedConfig) => {
      capturedConfig = config;
      return { panHandlers: { onStartShouldSetResponder: vi.fn() } };
    },
  },
  Animated: {
    ValueXY: class {
      setValue(value: { x: number; y: number }) {
        setValueSpy(value);
      }
      getTranslateTransform() {
        return [{ translateX: 0 }, { translateY: 0 }];
      }
    },
    spring: (...args: unknown[]) => {
      springSpy(...args);
      return { start: (cb?: () => void) => cb?.() };
    },
  },
  useWindowDimensions: () => ({ width: 400, height: 800 }),
}));

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

beforeEach(() => {
  Object.keys(kvStore).forEach((k) => delete kvStore[k]);
  vi.clearAllMocks();
});

describe('snapToNearest', () => {
  it('picks top-left when center is in the top-left quadrant', () => {
    expect(snapToNearest(50, 50, 400, 800)).toBe('top-left');
  });

  it('picks top-right when center is in the top-right quadrant', () => {
    expect(snapToNearest(350, 50, 400, 800)).toBe('top-right');
  });

  it('picks bottom-left when center is in the bottom-left quadrant', () => {
    expect(snapToNearest(50, 700, 400, 800)).toBe('bottom-left');
  });

  it('picks bottom-right when center is in the bottom-right quadrant', () => {
    expect(snapToNearest(350, 700, 400, 800)).toBe('bottom-right');
  });
});

describe('withHorizontalOf', () => {
  it('takes the vertical half of corner and the horizontal half of reference', () => {
    expect(withHorizontalOf('top-right', 'bottom-left')).toBe('top-left');
    expect(withHorizontalOf('bottom-left', 'top-right')).toBe('bottom-right');
  });

  it('is a no-op when both halves already match', () => {
    expect(withHorizontalOf('top-left', 'bottom-left')).toBe('top-left');
  });
});

describe('useRestTimerCorner', () => {
  it('defaults to bottom-right with no persisted value', async () => {
    const { result } = await renderHook(() => useRestTimerCorner());
    await flush();

    expect(result.current.corner).toBe('bottom-right');
    expect(result.current.positionStyle).toEqual({ bottom: 24, right: 16 });
  });

  it('loads the persisted corner on mount', async () => {
    kvStore[REST_TIMER_CORNER_KEY] = 'top-left';

    const { result } = await renderHook(() => useRestTimerCorner());
    await flush();

    expect(result.current.corner).toBe('top-left');
    expect(result.current.positionStyle).toEqual({ top: 16, left: 16 });
  });

  it('falls back to the default when the persisted value is invalid', async () => {
    kvStore[REST_TIMER_CORNER_KEY] = 'middle-of-nowhere';

    const { result } = await renderHook(() => useRestTimerCorner());
    await flush();

    expect(result.current.corner).toBe('bottom-right');
  });

  it('falls back to the default when the kv-store read rejects', async () => {
    const { Storage } = await import('expo-sqlite/kv-store');
    (Storage.getItem as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('kv-store indisponível'));

    const { result } = await renderHook(() => useRestTimerCorner());
    await flush();

    expect(result.current.corner).toBe('bottom-right');
  });

  it('persists the snapped corner on release (minimized: full 4-corner snap)', async () => {
    const { result } = await renderHook(() => useRestTimerCorner(true));
    await flush();

    await act(async () => {
      capturedConfig.onPanResponderRelease?.({}, { moveX: 50, moveY: 50 });
      await Promise.resolve();
    });
    await flush();

    expect(result.current.corner).toBe('top-left');

    const { Storage } = await import('expo-sqlite/kv-store');
    expect(Storage.setItem).toHaveBeenCalledWith(REST_TIMER_CORNER_KEY, 'top-left');
  });

  it('when expanded (card), release only changes the vertical half, keeping the current side', async () => {
    // Achado #7 (sev1, review-a-1.md): o card full-width não mostra o lado
    // esquerdo/direito — recalculá-lo a partir do arrasto só surpreende o
    // usuário quando o pill reaparece num canto diferente do esperado.
    kvStore[REST_TIMER_CORNER_KEY] = 'bottom-right';
    const { result } = await renderHook(() => useRestTimerCorner(false));
    await flush();

    expect(result.current.corner).toBe('bottom-right');

    // Ponto de soltura no quadrante top-left, mas o card deve manter o lado "right".
    await act(async () => {
      capturedConfig.onPanResponderRelease?.({}, { moveX: 50, moveY: 50 });
      await Promise.resolve();
    });
    await flush();

    expect(result.current.corner).toBe('top-right');

    const { Storage } = await import('expo-sqlite/kv-store');
    expect(Storage.setItem).toHaveBeenCalledWith(REST_TIMER_CORNER_KEY, 'top-right');
  });

  it('resets pan instantly on release, without an Animated.spring (no visual jump)', async () => {
    await renderHook(() => useRestTimerCorner());
    await flush();

    await act(async () => {
      capturedConfig.onPanResponderMove?.({}, { dx: -300, dy: -600 });
      capturedConfig.onPanResponderRelease?.({}, { moveX: 50, moveY: 50 });
      await Promise.resolve();
    });
    await flush();

    expect(setValueSpy).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    expect(springSpy).not.toHaveBeenCalled();
  });

  it('does not offset position for the keyboard (KeyboardAvoidingView on the screens already handles it)', async () => {
    // Achado #1 (review-a-1.md): as telas consumidoras já são
    // KeyboardAvoidingView; somar aqui empurrava o pill acima do teclado
    // e cobria a lista. O hook não escuta mais Keyboard.
    const { result } = await renderHook(() => useRestTimerCorner());
    await flush();

    expect(result.current.positionStyle).toEqual({ bottom: 24, right: 16 });
  });

  describe('onMoveShouldSetPanResponder (8px threshold, either axis)', () => {
    // Achado #3 (sev2, review-a-1.md): o teste original só exercitava dx,
    // então a mutação preguiçosa que removesse o ramo `dy` sobreviveria — e
    // arrasto vertical é justamente o que leva o pill de baixo para cima.
    it('only starts the pan responder past the 8px drag threshold', async () => {
      await renderHook(() => useRestTimerCorner());
      await flush();

      expect(capturedConfig.onMoveShouldSetPanResponder?.({}, { dx: 3, dy: 2 })).toBe(false);
      expect(capturedConfig.onMoveShouldSetPanResponder?.({}, { dx: 10, dy: 0 })).toBe(true);
      expect(capturedConfig.onPanResponderTerminationRequest?.()).toBe(false);
    });

    it('starts on a vertical-only drag past the threshold', async () => {
      await renderHook(() => useRestTimerCorner());
      await flush();

      expect(capturedConfig.onMoveShouldSetPanResponder?.({}, { dx: 0, dy: 10 })).toBe(true);
    });

    it('starts on a negative horizontal drag past the threshold', async () => {
      await renderHook(() => useRestTimerCorner());
      await flush();

      expect(capturedConfig.onMoveShouldSetPanResponder?.({}, { dx: -9, dy: 0 })).toBe(true);
    });

    it('stays inert exactly at the threshold on both axes', async () => {
      await renderHook(() => useRestTimerCorner());
      await flush();

      expect(capturedConfig.onMoveShouldSetPanResponder?.({}, { dx: 8, dy: 8 })).toBe(false);
    });
  });
});
