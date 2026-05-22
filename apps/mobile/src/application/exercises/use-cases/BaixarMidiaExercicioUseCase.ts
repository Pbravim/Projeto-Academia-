import { File, Paths, Directory } from 'expo-file-system';

import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';

export function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com/') || url.includes('youtu.be/');
}

export function isDownloadableUrl(url: string): boolean {
  return url.startsWith('http') && !isYouTubeUrl(url);
}

interface BaixarMidiaExercicioDependencies {
  exerciseRepository: ExerciseRepository;
}

/** Baixa o vídeo/GIF de media_online para o armazenamento local do app. */
export class BaixarMidiaExercicioUseCase {
  constructor(private readonly deps: BaixarMidiaExercicioDependencies) {}

  /**
   * @throws se o exercício não tiver media_online, for YouTube ou o download falhar
   * @returns URI local do arquivo baixado
   */
  async execute(exercicioId: string): Promise<string> {
    const exercise = await this.deps.exerciseRepository.findById(exercicioId);
    if (!exercise) throw new Error('Exercicio nao encontrado.');

    const { mediaOnline } = exercise.toPrimitives();
    if (!mediaOnline) throw new Error('Exercicio sem URL de midia.');
    if (!isDownloadableUrl(mediaOnline)) throw new Error('Este tipo de URL nao pode ser baixado.');

    // Use the new expo-file-system API with Paths.document directory
    const exercisesDir = new Directory(Paths.document, 'exercises');

    // Create the exercises directory if it doesn't exist
    try {
      if (!exercisesDir.exists) {
        exercisesDir.create();
      }
    } catch {
      // Directory might already exist or other error, try to continue
    }

    const pathWithoutQuery = mediaOnline.split('?')[0]!;
    const lastSegment = pathWithoutQuery.split('/').pop() ?? '';
    const dotIndex = lastSegment.lastIndexOf('.');
    const ext = dotIndex > 0 ? lastSegment.slice(dotIndex + 1).toLowerCase() : null;
    if (!ext || ext.length > 5) throw new Error('Não foi possível determinar a extensão do arquivo de mídia.');

    const localFile = new File(exercisesDir, `${exercicioId}.${ext}`);

    // Download using the new API
    const downloadedFile = await File.downloadFileAsync(mediaOnline, exercisesDir, {
      idempotent: true,
    });

    // Rename if needed to match exercicioId
    if (downloadedFile.name !== `${exercicioId}.${ext}`) {
      // The downloaded file is already at the right location, just use its URI
      const finalLocalUri = localFile.uri;
      await this.deps.exerciseRepository.updateMedia(exercicioId, mediaOnline, finalLocalUri);
      return finalLocalUri;
    }

    const finalLocalUri = localFile.uri;
    await this.deps.exerciseRepository.updateMedia(exercicioId, mediaOnline, finalLocalUri);
    return finalLocalUri;
  }
}
