import { Directory,File, Paths } from 'expo-file-system';

import type { ExerciseRepository } from '../../../domain/exercises/repositories/ExerciseRepository';

export function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com/') || url.includes('youtu.be/');
}

export function isDownloadableUrl(url: string): boolean {
  return url.startsWith('http') && !isYouTubeUrl(url);
}

interface BaixarMidiaExercicioDependencies {
  exerciseRepository: ExerciseRepository;
  /** Gera a thumb estática da mídia baixada (best-effort, fire-and-forget). */
  gerarThumb?: (exercicioId: string, mediaUri: string) => Promise<string | null>;
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

    // O download salva com o nome derivado da URL; renomeia para <id>.<ext>.
    // (O código anterior gravava localFile.uri SEM renomear — media_local
    // apontava para um arquivo inexistente quando os nomes diferiam.)
    const downloadedFileName = downloadedFile.uri.split('/').pop() ?? '';
    let finalLocalUri = downloadedFile.uri;
    if (downloadedFileName !== `${exercicioId}.${ext}`) {
      try {
        downloadedFile.move(localFile);
        finalLocalUri = localFile.uri;
      } catch {
        // Renomear falhou (ex.: destino já existe): usa a URI real baixada —
        // um nome fora do padrão é melhor que um ponteiro quebrado.
      }
    }

    await this.deps.exerciseRepository.updateMedia(exercicioId, mediaOnline, finalLocalUri);
    if (this.deps.gerarThumb) void this.deps.gerarThumb(exercicioId, finalLocalUri);
    return finalLocalUri;
  }
}
