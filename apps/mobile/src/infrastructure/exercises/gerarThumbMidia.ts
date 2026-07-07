import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';

const VIDEO_EXTS = new Set(['mp4', 'mov', 'm4v', 'webm', '3gp']);

/**
 * Gera a thumb estática (jpeg ~160px) de uma mídia custom/baixada em
 * exercises/thumbs/<id>.jpg. As listas mostram a thumb; o GIF/vídeo cheio
 * fica só para o viewer. Falha silenciosa — thumb é acessória.
 */
export async function gerarThumbMidia(exercicioId: string, mediaUri: string): Promise<string | null> {
  try {
    const exercisesDir = new Directory(Paths.document, 'exercises');
    try { if (!exercisesDir.exists) exercisesDir.create(); } catch { /* já existe */ }
    const thumbsDir = new Directory(exercisesDir, 'thumbs');
    try { if (!thumbsDir.exists) thumbsDir.create(); } catch { /* já existe */ }

    const ext = (mediaUri.split('?')[0]!.split('.').pop() ?? '').toLowerCase();
    let sourceUri = mediaUri;
    if (VIDEO_EXTS.has(ext)) {
      const { uri } = await VideoThumbnails.getThumbnailAsync(mediaUri, { time: 0 });
      sourceUri = uri;
    }

    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: 160 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );

    const dest = new File(thumbsDir, `${exercicioId}.jpg`);
    try { if (dest.exists) dest.delete(); } catch { /* substitui */ }
    new File(result.uri).move(dest);
    return dest.uri;
  } catch {
    return null;
  }
}
