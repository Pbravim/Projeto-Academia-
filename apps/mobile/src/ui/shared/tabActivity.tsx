import { createContext, useContext } from 'react';

/**
 * true quando a aba (keep-alive) que envolve este componente está visível.
 * Default true: telas fora do shell de abas (e testes) comportam-se como sempre ativas.
 */
export const TabActivityContext = createContext(true);

export function useTabActive(): boolean {
  return useContext(TabActivityContext);
}
