import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Escreve `conteudo` num arquivo temporário e abre o diálogo de compartilhamento do SO. */
export async function compartilharArquivoTexto(nomeArquivo: string, conteudo: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Compartilhamento nao disponivel neste dispositivo.');

  const file = new File(Paths.cache, nomeArquivo);
  try {
    file.write(conteudo);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar treino',
      UTI: 'public.json',
    });
  } finally {
    try { file.delete(); } catch { /* ignore cleanup errors */ }
  }
}
