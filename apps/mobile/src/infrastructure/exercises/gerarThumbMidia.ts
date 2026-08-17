import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createVideoPlayer } from 'expo-video';

const VIDEO_EXTS = new Set(['mp4', 'mov', 'm4v', 'webm', '3gp']);

/**
 * Gera a thumb estática (jpeg ~160px) de uma mídia custom/baixada em
 * exercises/thumbs/<id>.jpg. As listas mostram a thumb; o GIF/vídeo cheio
 * fica só para o viewer. Falha silenciosa — thumb é acessória.
 * Vídeos usam o próprio expo-video (o expo-video-thumbnails foi descontinuado).
 */
export async function gerarThumbMidia(exercicioId: string, mediaUri: string): Promise<string | null> {
  try {
    const exercisesDir = new Directory(Paths.document, 'exercises');
    try { if (!exercisesDir.exists) exercisesDir.create(); } catch { /* já existe */ }
    const thumbsDir = new Directory(exercisesDir, 'thumbs');
    try { if (!thumbsDir.exists) thumbsDir.create(); } catch { /* já existe */ }

    const ext = (mediaUri.split('?')[0]!.split('.').pop() ?? '').toLowerCase();
    let source: Parameters<typeof ImageManipulator.manipulate>[0] = mediaUri;
    if (VIDEO_EXTS.has(ext)) {
      // Player fora de React: criar, extrair o frame 0 e liberar SEMPRE.
      const player = createVideoPlayer(mediaUri);
      try {
        const [frame] = await player.generateThumbnailsAsync(0);
        if (!frame) return null;
        source = frame;
      } finally {
        player.release();
      }
    }

    const image = await ImageManipulator.manipulate(source).resize({ width: 160 }).renderAsync();
    const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });

    const dest = new File(thumbsDir, `${exercicioId}.jpg`);
    try { if (dest.exists) dest.delete(); } catch { /* substitui */ }
    new File(saved.uri).move(dest);
    return dest.uri;
  } catch {
    return null;
  }
}
