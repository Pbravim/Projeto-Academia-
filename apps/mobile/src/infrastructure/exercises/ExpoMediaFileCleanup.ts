import { File } from 'expo-file-system';

import type { MediaFileCleanup } from '../../application/exercises/use-cases/DeleteExerciseUseCase';

export class ExpoMediaFileCleanup implements MediaFileCleanup {
  async deleteFileIfExists(uri: string): Promise<void> {
    // Handle both file:// and content:// URIs
    // file:// URIs can be deleted directly
    // content:// URIs (Android content provider URIs) may not support deletion
    if (uri.startsWith('content://')) {
      // Android content:// URIs typically cannot be deleted directly via File API
      // Log a warning and skip deletion for content:// URIs
      // In a real app, you might use ContentProvider APIs to delete these
      console.warn(`Cannot delete content:// URI: ${uri}. This requires ContentProvider access.`);
      return;
    }

    try {
      const file = new File(uri);
      if (file.exists) {
        // delete() is synchronous in the new expo-file-system API
        file.delete();
      }
    } catch (error) {
      // Log but don't throw — file may have already been deleted or permission denied
      console.warn(`Failed to delete file at ${uri}:`, error);
    }
  }
}
