import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createVideoPlayer } from 'expo-video';

const VIDEO_EXTS = new Set(['mp4', 'mov', 'm4v', 'webm', '3gp']);

function garantirDiretorio(dir: Directory): void {
  try { if (!dir.exists) dir.create(); } catch { /* já existe */ }
}

/**
 * Cria o player de vídeo fora de React, extrai o frame 0 e libera o player
 * SEMPRE (finally). Retorna o frame ou `null` quando a lista vier vazia.
 * Erros do player se propagam para quem chamar (quem converte em falha
 * silenciosa, se for o caso).
 */
export async function extrairFrameZero(mediaUri: string): Promise<Parameters<typeof ImageManipulator.manipulate>[0] | null> {
  const player = createVideoPlayer(mediaUri);
  try {
    const [frame] = await player.generateThumbnailsAsync(0);
    return frame ?? null;
  } finally {
    player.release();
  }
}

/**
 * Gera a thumb estática (jpeg ~160px) de uma mídia custom/baixada em
 * exercises/thumbs/<id>.jpg. As listas mostram a thumb; o GIF/vídeo cheio
 * fica só para o viewer. Falha silenciosa — thumb é acessória.
 * Vídeos usam o próprio expo-video (o expo-video-thumbnails foi descontinuado).
 */
export async function gerarThumbMidia(exercicioId: string, mediaUri: string): Promise<string | null> {
  try {
    const exercisesDir = new Directory(Paths.document, 'exercises');
    garantirDiretorio(exercisesDir);
    const thumbsDir = new Directory(exercisesDir, 'thumbs');
    garantirDiretorio(thumbsDir);

    const ext = (mediaUri.split('?')[0]!.split('.').pop() ?? '').toLowerCase();
    let source: Parameters<typeof ImageManipulator.manipulate>[0] = mediaUri;
    if (VIDEO_EXTS.has(ext)) {
      const frame = await extrairFrameZero(mediaUri);
      if (!frame) return null;
      source = frame;
    }

    const image = await ImageManipulator.manipulate(source).resize({ width: 160 }).renderAsync();
    const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });

    const dest = new File(thumbsDir, `${exercicioId}.jpg`);
    try { if (dest.exists) dest.delete(); } catch { /* substitui */ }
    await new File(saved.uri).move(dest);
    return dest.uri;
  } catch {
    return null;
  }
}
