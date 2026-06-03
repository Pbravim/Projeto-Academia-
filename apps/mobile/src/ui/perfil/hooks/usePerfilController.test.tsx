import { describe, it, expect, vi, beforeEach } from 'vitest';

import { renderHook, act } from '../../../test/renderHook';
import { usePerfilController, PERFIL_NOME_KEY, PERFIL_FOTO_KEY } from './usePerfilController';

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

// Mock expo-image-picker
vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  requestCameraPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: vi.fn().mockResolvedValue({ canceled: true, assets: [] }),
  launchCameraAsync: vi.fn().mockResolvedValue({ canceled: true, assets: [] }),
  MediaTypeOptions: { Images: 'Images' },
  UIImagePickerControllerQualityType: { Medium: 1 },
}));

// Mock Alert — do NOT importOriginal (react-native has Flow syntax Vitest can't parse)
vi.mock('react-native', () => ({
  Alert: { alert: vi.fn() },
}));

async function flush() {
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

beforeEach(() => {
  Object.keys(kvStore).forEach((k) => delete kvStore[k]);
  vi.clearAllMocks();
});

describe('usePerfilController', () => {
  it('empty start: no stored name/photo → displayName is empty and photoUri is null', async () => {
    const { result } = await renderHook(() => usePerfilController());
    await flush();

    expect(result.current.displayName).toBe('');
    expect(result.current.photoUri).toBeNull();
  });

  it('loads stored values from kv-store on mount', async () => {
    kvStore[PERFIL_NOME_KEY] = 'Pedro';
    kvStore[PERFIL_FOTO_KEY] = 'file:///me.jpg';

    const { result } = await renderHook(() => usePerfilController());
    await flush();

    expect(result.current.displayName).toBe('Pedro');
    expect(result.current.photoUri).toBe('file:///me.jpg');
  });

  it('onSaveName trims input, updates state, persists to storage, and fires callback', async () => {
    const onNameSaved = vi.fn();
    const { result } = await renderHook(() => usePerfilController(onNameSaved));
    await flush();

    await act(async () => {
      await result.current.onSaveName('  Maria  ');
    });

    expect(result.current.displayName).toBe('Maria');

    const { Storage } = await import('expo-sqlite/kv-store');
    expect(Storage.setItem).toHaveBeenCalledWith(PERFIL_NOME_KEY, 'Maria');
    expect(onNameSaved).toHaveBeenCalledWith('Maria');
  });

  it('onPickPhoto cancelled: photoUri stays null when picker returns canceled', async () => {
    const { launchImageLibraryAsync } = await import('expo-image-picker');
    (launchImageLibraryAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
      canceled: true,
      assets: [],
    });

    const { Alert } = await import('react-native');
    const onPhotoSaved = vi.fn();
    const { result } = await renderHook(() => usePerfilController(undefined, onPhotoSaved));
    await flush();

    // Trigger onPickPhoto which shows Alert; simulate pressing "Galeria"
    await act(async () => {
      result.current.onPickPhoto();
    });

    // Find the "Galeria" button callback from Alert.alert call and invoke it
    const alertMock = Alert.alert as ReturnType<typeof vi.fn>;
    const buttons: Array<{ text: string; onPress?: () => void }> = alertMock.mock.calls[0][2];
    const galeriaButton = buttons.find((b) => b.text === 'Galeria');

    await act(async () => {
      galeriaButton?.onPress?.();
      await Promise.resolve();
    });
    await flush();

    expect(result.current.photoUri).toBeNull();
    expect(onPhotoSaved).not.toHaveBeenCalled();
  });
});
