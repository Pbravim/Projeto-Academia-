# Consolidação expo-video-thumbnails → expo-video — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o pacote `expo-video-thumbnails` usando a geração de thumbnail nativa do `expo-video` (SDK 52+), sem mudança de comportamento.

**Architecture:** Só um arquivo consome o pacote: `gerarThumbMidia.ts` extrai o frame 0 de vídeos antes de reduzir para JPEG 160px. A troca substitui `VideoThumbnails.getThumbnailAsync(uri)` por `createVideoPlayer(uri)` + `player.generateThumbnailsAsync(...)`, alimentando o resultado (SharedRef de imagem) na API de contexto do `expo-image-manipulator` (que aceita SharedRef, diferente da legada `manipulateAsync` que só aceita URI string).

**Tech Stack:** Expo SDK 54, expo-video ~3.0, expo-image-manipulator ~14.0, vitest com mocks de módulos expo.

## Global Constraints

- Comportamento externo idêntico: thumb JPEG ~160px salva em `exercises/thumbs/<id>.jpg`, falha silenciosa (retorna `null`).
- Expo SDK `~54.0.35` — validar assinaturas contra https://docs.expo.dev/versions/v54/sdk/video/ e /image-manipulator/ antes de codar (Task 1, Step 0).
- GIFs/imagens continuam SEM passar pelo caminho de vídeo (o branch `VIDEO_EXTS` só muda para vídeos).
- Todo commit com suite mobile verde (`npx vitest run` em `apps/mobile`) e `tsc --noEmit` limpo.

---

### Task 1: Trocar o backend de thumbnail de vídeo em gerarThumbMidia

**Files:**
- Modify: `apps/mobile/src/infrastructure/exercises/gerarThumbMidia.ts`
- Test (create): `apps/mobile/src/infrastructure/exercises/gerarThumbMidia.test.ts`

**Interfaces:**
- Consumes: `createVideoPlayer(source: string)` e `player.generateThumbnailsAsync(times)` de `expo-video`; `ImageManipulator.manipulate(source)` (API de contexto) de `expo-image-manipulator`.
- Produces: `gerarThumbMidia(exercicioId: string, mediaUri: string): Promise<string | null>` — assinatura INALTERADA (callers: `BaixarMidiaExercicioUseCase`, bootstrap).

- [ ] **Step 0: Confirmar as assinaturas do SDK 54**

Abrir https://docs.expo.dev/versions/v54/sdk/video/#generatethumbnailsasync e /image-manipulator/. Confirmar: (a) `generateThumbnailsAsync` existe no `VideoPlayer` e aceita `number | number[]` em segundos, retornando `VideoThumbnail[]` (SharedRef de imagem); (b) `ImageManipulator.manipulate()` aceita `SharedRef<'image'>` além de string; (c) `player.release()` é o descarte correto fora de React. Se alguma assinatura divergir, ajustar o código dos steps seguintes ANTES de escrever o teste.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// apps/mobile/src/infrastructure/exercises/gerarThumbMidia.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const released = vi.fn();
const generateThumbnailsAsync = vi.fn().mockResolvedValue([{ __sharedRef: 'frame0' }]);
vi.mock('expo-video', () => ({
  createVideoPlayer: vi.fn(() => ({ generateThumbnailsAsync, release: released })),
}));

const saveAsync = vi.fn().mockResolvedValue({ uri: 'file:///cache/manip.jpg' });
const renderAsync = vi.fn().mockResolvedValue({ saveAsync });
const resize = vi.fn().mockReturnValue({ renderAsync });
const manipulate = vi.fn(() => ({ resize, renderAsync }));
vi.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate },
  SaveFormat: { JPEG: 'jpeg' },
}));

vi.mock('expo-file-system', () => {
  class File {
    path: string;
    constructor(...parts: unknown[]) { this.path = parts.map((p) => (typeof p === 'string' ? p : (p as { path: string }).path)).join('/'); }
    get exists() { return false; }
    get uri() { return `file://${this.path}`; }
    move() {}
    delete() {}
  }
  class Directory extends File { create() {} }
  return { File, Directory, Paths: { document: 'DOC' } };
});

import { gerarThumbMidia } from './gerarThumbMidia';
import { createVideoPlayer } from 'expo-video';

describe('gerarThumbMidia — vídeo usa expo-video (não expo-video-thumbnails)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('extrai o frame 0 via createVideoPlayer + generateThumbnailsAsync e libera o player', async () => {
    const result = await gerarThumbMidia('ex-1', 'file:///media/video.mp4');

    expect(createVideoPlayer).toHaveBeenCalledWith('file:///media/video.mp4');
    expect(generateThumbnailsAsync).toHaveBeenCalledWith(0);
    expect(released).toHaveBeenCalled(); // sem leak de player nativo
    expect(manipulate).toHaveBeenCalledWith({ __sharedRef: 'frame0' });
    expect(result).toBe('file://DOC/exercises/thumbs/ex-1.jpg');
  });

  it('imagem/GIF não passa pelo player de vídeo', async () => {
    await gerarThumbMidia('ex-2', 'file:///media/anim.gif');
    expect(createVideoPlayer).not.toHaveBeenCalled();
    expect(manipulate).toHaveBeenCalledWith('file:///media/anim.gif');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/mobile; npx vitest run src/infrastructure/exercises/gerarThumbMidia.test.ts`
Expected: FAIL — o módulo ainda importa `expo-video-thumbnails` (mock ausente) ou asserts de `createVideoPlayer` falham.

- [ ] **Step 3: Implementação mínima**

```ts
// apps/mobile/src/infrastructure/exercises/gerarThumbMidia.ts (arquivo completo)
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
```

Nota: se o Step 0 mostrar que `manipulate().resize()` não encadeia assim no SDK 54 (ex.: `.resize()` retorna void e o render é `context.renderAsync()`), seguir a doc — o teste do Step 1 ajusta os mocks na mesma forma.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/infrastructure/exercises/gerarThumbMidia.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: tsc + suite completa**

Run: `node ..\..\node_modules\typescript\bin\tsc --noEmit -p tsconfig.json; npx vitest run`
Expected: tsc limpo; 517+ testes verdes.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/infrastructure/exercises/
git commit -m "refactor(midia): thumbs de video via expo-video (substitui expo-video-thumbnails)"
```

### Task 2: Remover a dependência

**Files:**
- Modify: `apps/mobile/package.json` (remover `"expo-video-thumbnails": "~10.0.8"`)
- Modify: `package-lock.json` (via npm)

**Interfaces:**
- Consumes: Task 1 concluída (zero imports restantes de `expo-video-thumbnails`).
- Produces: dependência removida; `expo doctor` 18/18.

- [ ] **Step 1: Confirmar zero usos**

Run: `cd apps/mobile; npx grep -r "expo-video-thumbnails" src` (ou Grep tool)
Expected: nenhum match em `src/`.

- [ ] **Step 2: Desinstalar**

Run: `npm uninstall expo-video-thumbnails`
Expected: package.json e lockfile atualizados.

- [ ] **Step 3: Validar toolchain**

Run: `node ..\..\node_modules\typescript\bin\tsc --noEmit -p tsconfig.json; npx vitest run; npx expo-doctor`
Expected: tsc limpo, suite verde, doctor 18/18.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json package-lock.json
git commit -m "chore(deps): remove expo-video-thumbnails (consolidado no expo-video)"
```

### Task 3: Validação em device (manual, bloqueia o merge)

**Files:** nenhum (checklist manual).

**Interfaces:**
- Consumes: APK do perfil `preview` com as Tasks 1-2.
- Produces: veredito go/no-go.

- [ ] **Step 1: Build**

Run: `cd apps/mobile; npx eas-cli build --platform android --profile preview --non-interactive --no-wait`
Expected: link de build; baixar o APK ao terminar.

- [ ] **Step 2: Checklist no device**

1. Catálogo → criar exercício custom com mídia **MP4** → voltar à lista → a thumb estática do frame 0 aparece no card (não placeholder).
2. Exercício com **GIF** existente → thumb continua aparecendo (caminho de imagem intocado).
3. Abrir o viewer da mídia MP4 → vídeo toca normalmente (o `createVideoPlayer` avulso não pode interferir no player do viewer).
4. Matar e reabrir o app → thumbs persistem (arquivos em `exercises/thumbs/`).

Expected: 4/4. Qualquer falha → reverter os 2 commits (`git revert`) e registrar o achado neste plano.
