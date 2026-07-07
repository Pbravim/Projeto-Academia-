import { useEffect } from 'react';
import { BackHandler } from 'react-native';

import { useTabActive } from '../tabActivity';

export function useAndroidBack(onBack: () => void) {
  const tabActive = useTabActive();
  useEffect(() => {
    // Keep-alive: subtela em aba OCULTA não registra handler — BackHandler é
    // LIFO e ela consumiria o back da aba visível. Re-registrar ao reativar
    // também devolve prioridade sobre o handler raiz do shell.
    if (!tabActive) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack, tabActive]);
}
