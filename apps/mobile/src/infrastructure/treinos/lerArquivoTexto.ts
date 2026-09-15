import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

/** Abre o seletor de arquivos do SO e devolve o texto do arquivo escolhido, ou `null` se o usuário cancelar. */
export async function lerArquivoTexto(): Promise<string | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || picked.assets.length === 0) return null;

  const file = new File(picked.assets[0].uri);
  return file.text();
}
