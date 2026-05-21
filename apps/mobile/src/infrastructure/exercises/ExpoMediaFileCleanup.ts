import { File } from 'expo-file-system';

import type { MediaFileCleanup } from '../../application/exercises/use-cases/DeleteExerciseUseCase';

export class ExpoMediaFileCleanup implements MediaFileCleanup {
  async deleteFileIfExists(uri: string): Promise<void> {
    const file = new File(uri);
    if (file.exists) file.delete();
  }
}
