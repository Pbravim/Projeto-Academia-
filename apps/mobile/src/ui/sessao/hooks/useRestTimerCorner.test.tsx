import { beforeEach, describe, expect, it, vi } from 'vitest';

import { act, renderHook } from '../../../test/renderHook';

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

// Mock react-native-safe-area-context
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 24, left: 0, right: 0 }),
}));

// Capture the PanResponder config so tests can drive onPanResponderRelease
// directly, without simulating the native touch-responder tracking.
let capturedConfig: {
  onMoveShouldSetPanResponder?: (evt: unknown, gestureState: { dx: number; dy: number }) => boolean;
  onPanResponderMove?: (evt: unknown, gestureState: { dx: number; dy: number }) => void;
  onPanResponderRelease?: (evt: unknown, gestureState: { moveX: number; moveY: number }) => void;
  onPanResponderTerminationRequest?: () => boolean;
} = {};

const keyboardListeners: Record<string, (e: { endCoordinates: { height: number } }) => void> = {};

vi.mock('react-native', () => ({
  PanResponder: {
    create: (config: typeof capturedConfig) => {
      capturedConfig = config;
      return { panHandlers: { onStartShouldSetResponder: vi.fn() } };
    },
  },
  Animated: {
    ValueXY: class {
      setValue() {
        // no-op: only the returned positionStyle/corner matter to tests
      }
      getTranslateTransform() {
        return [{ translateX: 0 }, { translateY: 0 }];
      }
    },
    spring: () => ({ start: (cb?: () => void) => cb?.() }),
  },
  Keyboard: {
    addListener: vi.fn((event: string, handler: (e: { endCoordinates: { height: number } }) => void) => {
      keyboardListeners[event] = handler;
      return { remove: vi.fn() };
    }),
  },
  useWindowDimensions: () => ({ width: 400, height: 800 }),
}));

import {
  REST_TIMER_CORNER_KEY,
  snapToNearest,
  useRestTimerCorner,
} from './useRestTimerCorner';

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

beforeEach(() => {
  Object.keys(kvStore).forEach((k) => delete kvStore[k]);
  Object.keys(keyboardListeners).forEach((k) => delete keyboardListeners[k]);
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

describe('useRestTimerCorner', () => {
  it('defaults to bottom-right with no persisted value', async () => {
    const { result } = await renderHook(() => useRestTimerCorner());
    await flush();

    expect(result.current.corner).toBe('bottom-right');
    expect(result.current.positionStyle).toEqual({ bottom: 24 + 24, right: 16 });
  });

  it('loads the persisted corner on mount', async () => {
    kvStore[REST_TIMER_CORNER_KEY] = 'top-left';

    const { result } = await renderHook(() => useRestTimerCorner());
    await flush();

    expect(result.current.corner).toBe('top-left');
    expect(result.current.positionStyle).toEqual({ top: 40 + 16, left: 16 });
  });

  it('falls back to the default when the persisted value is invalid', async () => {
    kvStore[REST_TIMER_CORNER_KEY] = 'middle-of-nowhere';

    const { result } = await renderHook(() => useRestTimerCorner());
    await flush();

    expect(result.current.corner).toBe('bottom-right');
  });

  it('persists the snapped corner on release', async () => {
    const { result } = await renderHook(() => useRestTimerCorner());
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

  it('applies keyboard height offset only to bottom corners', async () => {
    const { result } = await renderHook(() => useRestTimerCorner());
    await flush();

    await act(async () => {
      keyboardListeners.keyboardDidShow?.({ endCoordinates: { height: 300 } });
    });
    await flush();

    expect(result.current.corner).toBe('bottom-right');
    expect(result.current.positionStyle).toEqual({ bottom: 24 + 24 + 300, right: 16 });

    await act(async () => {
      capturedConfig.onPanResponderRelease?.({}, { moveX: 50, moveY: 50 });
      await Promise.resolve();
    });
    await flush();

    expect(result.current.corner).toBe('top-left');
    expect(result.current.positionStyle).toEqual({ top: 40 + 16, left: 16 });
  });

  it('only starts the pan responder past the 8px drag threshold', async () => {
    await renderHook(() => useRestTimerCorner());
    await flush();

    expect(capturedConfig.onMoveShouldSetPanResponder?.({}, { dx: 3, dy: 2 })).toBe(false);
    expect(capturedConfig.onMoveShouldSetPanResponder?.({}, { dx: 10, dy: 0 })).toBe(true);
    expect(capturedConfig.onPanResponderTerminationRequest?.()).toBe(false);
  });
});
