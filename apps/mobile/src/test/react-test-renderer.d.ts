declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export interface ReactTestInstance {
    type: string | ((...args: never[]) => unknown);
    props: Record<string, any>;
    parent: ReactTestInstance | null;
    children: (ReactTestInstance | string)[];
    find(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance;
    findAll(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance[];
    findByType(type: unknown): ReactTestInstance;
    findAllByType(type: unknown): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    update(element: ReactElement): void;
    unmount(): void;
    toJSON(): unknown;
    root: ReactTestInstance;
  }

  const TestRenderer: {
    create(element: ReactElement): ReactTestRenderer;
  };

  export function act(callback: () => void | Promise<void>): Promise<void> & { then: never };

  export default TestRenderer;
}
