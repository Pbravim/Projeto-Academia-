import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export function useAndroidBack(onBack: () => void) {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);
}
