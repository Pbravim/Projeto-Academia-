import { File, Paths } from 'expo-file-system';

import { gifAssets } from '../exercises/components/gifAssets';
import { thumbAssets } from '../exercises/components/thumbAssets';

/**
 * Resolução ÚNICA de mídia de exercício (antes duplicada em 8 componentes).
 *
 * media_local pode conter 3 coisas:
 *  1. chave do pacote ('PEITO/supino.gif') → gifAssets (GIF cheio) / thumbAssets (jpeg estático);
 *  2. file:// de mídia custom da galeria ou baixada de media_online;
 *  3. (nunca http — URLs vivem em media_online).
 */
type ExerciseImageSource = number | { uri: string };

/** Placeholder neutro para exercícios sem mídia (ou com ponteiro morto). */
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const exercisePlaceholder: ExerciseImageSource = require('../../../assets/exercise-placeholder.png');

/** Como resolveThumbSource, mas nunca null — cai no placeholder. */
export function resolveThumbSourceOrPlaceholder(
  mediaLocal: string | null | undefined,
  exercicioId?: string,
): ExerciseImageSource {
  return resolveThumbSource(mediaLocal, exercicioId) ?? exercisePlaceholder;
}

const existsCache = new Map<string, boolean>();

function fileExists(uri: string): boolean {
  const cached = existsCache.get(uri);
  if (cached !== undefined) return cached;
  let ok = false;
  try {
    ok = new File(uri).exists;
  } catch {
    ok = false;
  }
  existsCache.set(uri, ok);
  return ok;
}

/** Invalida o cache de existência após gravar/apagar mídia ou thumb. */
export function invalidateMediaCache(uri: string): void {
  existsCache.delete(uri);
}

/** Caminho canônico da thumb derivada de mídia custom/baixada. */
export function customThumbUri(exercicioId: string): string {
  return new File(Paths.document, 'exercises', 'thumbs', `${exercicioId}.jpg`).uri;
}

/**
 * Fonte para THUMBS de lista: sempre o jpeg estático quando existir
 * (pacote → thumbAssets; custom/baixada → thumbs/<id>.jpg). GIF cheio só como
 * fallback de mídia antiga sem thumb. Ponteiro file:// morto → null.
 */
export function resolveThumbSource(
  mediaLocal: string | null | undefined,
  exercicioId?: string,
): ExerciseImageSource | null {
  if (!mediaLocal) return null;
  if (!mediaLocal.startsWith('file://') && !mediaLocal.startsWith('http')) {
    return thumbAssets[mediaLocal] ?? gifAssets[mediaLocal] ?? null;
  }
  if (exercicioId) {
    const thumb = customThumbUri(exercicioId);
    if (fileExists(thumb)) return { uri: thumb };
  }
  if (mediaLocal.startsWith('file://') && !fileExists(mediaLocal)) return null;
  return { uri: mediaLocal };
}

/** Fonte da mídia CHEIA (viewer / thumbs tocadas para animar). Ponteiro morto → null. */
export function resolveFullMediaSource(
  mediaLocal: string | null | undefined,
): ExerciseImageSource | null {
  if (!mediaLocal) return null;
  if (!mediaLocal.startsWith('file://') && !mediaLocal.startsWith('http')) {
    return gifAssets[mediaLocal] ?? null;
  }
  if (mediaLocal.startsWith('file://') && !fileExists(mediaLocal)) return null;
  return { uri: mediaLocal };
}
