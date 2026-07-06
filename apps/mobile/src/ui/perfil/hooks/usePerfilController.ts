import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Storage } from 'expo-sqlite/kv-store';

import { translate, useLocale } from '../../shared/i18n';

export const PERFIL_NOME_KEY = 'perfil_nome';
export const PERFIL_FOTO_KEY = 'perfil_foto';

export interface PerfilControllerState {
  displayName: string;
  photoUri: string | null;
  onSaveName: (name: string) => Promise<void>;
  onPickPhoto: () => void;
}

export function usePerfilController(
  onNameSaved?: (name: string) => void,
  onPhotoSaved?: (uri: string | null) => void,
): PerfilControllerState {
  const locale = useLocale();
  const [displayName, setDisplayName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      Storage.getItem(PERFIL_NOME_KEY),
      Storage.getItem(PERFIL_FOTO_KEY),
    ]).then(([nome, foto]) => {
      if (nome) setDisplayName(nome);
      if (foto) setPhotoUri(foto);
    });
  }, []);

  const onSaveName = async (name: string) => {
    const trimmed = name.trim();
    setDisplayName(trimmed);
    await Storage.setItem(PERFIL_NOME_KEY, trimmed);
    onNameSaved?.(trimmed);
  };

  const pickFrom = async (source: 'camera' | 'gallery') => {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    }

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      await Storage.setItem(PERFIL_FOTO_KEY, uri);
      onPhotoSaved?.(uri);
    }
  };

  const onPickPhoto = () => {
    Alert.alert(translate(locale, 'perfil.foto.title'), undefined, [
      { text: translate(locale, 'perfil.foto.camera'),  onPress: () => { void pickFrom('camera'); } },
      { text: translate(locale, 'perfil.foto.galeria'), onPress: () => { void pickFrom('gallery'); } },
      { text: translate(locale, 'common.cancel'), style: 'cancel' },
    ]);
  };

  return { displayName, photoUri, onSaveName, onPickPhoto };
}
