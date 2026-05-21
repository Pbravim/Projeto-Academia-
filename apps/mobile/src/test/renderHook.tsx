import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

export interface HookResult<T> {
  result: { readonly current: T };
  rerender: () => Promise<void>;
  unmount: () => Promise<void>;
}

/**
 * Minimal renderHook for vitest in node env. Uses react-test-renderer directly to
 * avoid pulling in @testing-library/react-native (which transitively imports
 * Flow-typed RN sources).
 */
export async function renderHook<T>(callback: () => T): Promise<HookResult<T>> {
  let last: T;
  function Host() {
    last = callback();
    return null;
  }
  let renderer: ReactTestRenderer | null = null;
  await act(async () => {
    renderer = TestRenderer.create(<Host />);
  });
  return {
    result: {
      get current() {
        return last;
      },
    },
    rerender: async () => {
      await act(async () => {
        renderer?.update(<Host />);
      });
    },
    unmount: async () => {
      await act(async () => {
        renderer?.unmount();
      });
    },
  };
}

export { act };
