import * as FileSystemLegacy from 'expo-file-system/legacy';

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

    const dir = FileSystemLegacy.documentDirectory + 'exercises/';
    await FileSystemLegacy.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

    const ext = mediaOnline.split('?')[0]!.split('.').pop()?.toLowerCase() ?? 'mp4';
    const localUri = dir + exercicioId + '.' + ext;

    const result = await FileSystemLegacy.downloadAsync(mediaOnline, localUri);
    if (result.status !== 200) throw new Error(`Download falhou (status ${result.status}).`);

    await this.deps.exerciseRepository.updateMedia(exercicioId, mediaOnline, localUri);
    return localUri;
  }
}
