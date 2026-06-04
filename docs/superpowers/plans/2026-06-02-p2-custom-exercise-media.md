# Custom Exercise Media — P2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The core upload feature is already implemented (`MediaFields` in `ExerciseFormFields.tsx`). This plan covers the one remaining gap: orphaned local media files are never deleted from disk when the user removes the media reference or deletes the exercise.

**Architecture:** When `onChangeLocal(null)` is called and the existing `mediaLocal` is a `file://` URI (not a bundled asset key), delete the old file with `expo-file-system`. Similarly, `DeleteExerciseUseCase` should delete the local file via an optional `fileSystem` port. Both operations are best-effort (ignore file-not-found errors).

**What's already done:**
- `MediaFields` component picks images/videos, copies to `documentDirectory/exercises/<id>_local.<ext>`, shows previews, and has a "Remover" button.
- `UpdateExerciseUseCase` persists `mediaLocal` to the database.
- `ExerciseMediaViewer` displays local files and online media.
- `expo-image-picker` and `expo-file-system` are installed.

**Tech Stack:** TypeScript, `expo-file-system/legacy` (already used in the project), Vitest.

---

### Task 1: Delete old local file when user removes or replaces media

When the user taps "Remover" on a local file, or picks a new file (replacing the old one), the old file at `file://...` should be deleted from `documentDirectory`.

**Files:**
- Modify: `apps/mobile/src/ui/exercises/components/ExerciseFormFields.tsx`

- [ ] **Step 1: Add file deletion helper inside `MediaFields`**

At the top of the `MediaFields` function body (inside `ExerciseFormFields.tsx`, after the `useState(false)` for `picking`), add:

```tsx
const currentLocalRef = React.useRef(mediaLocal);
React.useEffect(() => { currentLocalRef.current = mediaLocal; }, [mediaLocal]);

const deleteFileIfLocal = async (uri: string | null) => {
  if (!uri) return;
  // Only delete file:// URIs we copied to app storage — not bundled asset keys
  if (!uri.startsWith('file://')) return;
  try {
    await FileSystemLegacy.deleteAsync(uri, { idempotent: true });
  } catch {
    // best-effort — ignore errors
  }
};
```

Also add `import React from 'react';` at the top of the file (if not already present — check the existing imports).

- [ ] **Step 2: Call `deleteFileIfLocal` before `onChangeLocal(null)` in the remove button**

Find the `Pressable` in `MediaFields` that calls `onChangeLocal(null)` (line ~506):

```tsx
<Pressable onPress={() => onChangeLocal(null)} style={styles.removeBtn}>
```

Replace with:

```tsx
<Pressable
  onPress={() => {
    void deleteFileIfLocal(currentLocalRef.current);
    onChangeLocal(null);
  }}
  style={styles.removeBtn}
>
```

- [ ] **Step 3: Call `deleteFileIfLocal` before copying a new file in `handlePickFile`**

Inside `handlePickFile`, before `await FileSystemLegacy.copyAsync(...)`, add:

```tsx
await deleteFileIfLocal(currentLocalRef.current);
```

So the full relevant section becomes:

```tsx
const asset = result.assets[0];
const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'mp4';
const dir = FileSystemLegacy.documentDirectory + 'exercises/';
await FileSystemLegacy.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
const id = exercicioId ?? ('tmp_' + Date.now());
const dest = dir + id + '_local.' + ext;
await deleteFileIfLocal(currentLocalRef.current);  // ← add this line
await FileSystemLegacy.copyAsync({ from: asset.uri, to: dest });
onChangeLocal(dest);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/ui/exercises/components/ExerciseFormFields.tsx
git commit -m "fix(exercises): delete orphaned local media file when user removes or replaces it"
```

---

### Task 2: Delete local media file when exercise is deleted

When `DeleteExerciseUseCase` runs, if the exercise has a `mediaLocal` that is a `file://` URI, that file should be removed.

**Files:**
- Modify: `apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.ts`
- Modify: `apps/mobile/src/bootstrap/mobileDependencies.ts`

- [ ] **Step 1: Read the current `DeleteExerciseUseCase`**

Open `apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.ts` and note its current `Deps` interface and `execute` method signature.

- [ ] **Step 2: Add optional `deleteLocalFile` to the deps interface**

Add an optional file-deletion callback to the `Deps` interface:

```ts
interface Deps {
  exerciseRepository: ExerciseRepository;
  deleteLocalFile?: (uri: string) => Promise<void>;
}
```

- [ ] **Step 3: Call `deleteLocalFile` after retrieving the exercise, before deleting it**

Inside `execute`, after fetching the exercise and before calling `exerciseRepository.delete()`, add:

```ts
const primitives = exercise.toPrimitives();
if (this.deps.deleteLocalFile && primitives.mediaLocal?.startsWith('file://')) {
  await this.deps.deleteLocalFile(primitives.mediaLocal).catch(() => {});
}
```

- [ ] **Step 4: Wire `deleteLocalFile` in `mobileDependencies.ts`**

In `apps/mobile/src/bootstrap/mobileDependencies.ts`, find where `DeleteExerciseUseCase` is instantiated and add the `deleteLocalFile` callback:

```ts
import * as FileSystemLegacy from 'expo-file-system/legacy';

// Inside the dependencies object:
deleteExercise: new DeleteExerciseUseCase({
  exerciseRepository,
  deleteLocalFile: (uri) => FileSystemLegacy.deleteAsync(uri, { idempotent: true }),
}),
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.ts \
        apps/mobile/src/bootstrap/mobileDependencies.ts
git commit -m "fix(exercises): delete local media file from disk when exercise is deleted"
```

---

### Task 3: Add unit test for `DeleteExerciseUseCase` file cleanup

**Files:**
- Modify: `apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.test.ts` (add one test case)

- [ ] **Step 1: Find the existing test file and append a new `it` block**

Open the existing test file. At the end of the `describe` block, add:

```ts
it('calls deleteLocalFile when exercise has a local file URI', async () => {
  const exerciseRepo = new InMemoryExerciseRepository();
  const deleteLocalFile = vi.fn().mockResolvedValue(undefined);

  const exercise = Exercise.create({
    id: 'ex1',
    name: 'Supino',
    normalizedName: 'supino',
    groupMuscle: 'Peito',
    isCustom: true,
    loadUnit: 'kg',
    mediaLocal: 'file:///data/exercises/ex1_local.mp4',
    createdAt: new Date('2026-01-01'),
  });
  await exerciseRepo.save(exercise);

  const useCase = new DeleteExerciseUseCase({ exerciseRepository: exerciseRepo, deleteLocalFile });
  await useCase.execute('ex1');

  expect(deleteLocalFile).toHaveBeenCalledWith('file:///data/exercises/ex1_local.mp4');
  expect(await exerciseRepo.findById('ex1')).toBeNull();
});
```

- [ ] **Step 2: Run the test**

```bash
npm --prefix apps/mobile test -- --reporter=verbose DeleteExerciseUseCase.test
```

Expected: all existing tests plus the new one pass.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/application/exercises/use-cases/DeleteExerciseUseCase.test.ts
git commit -m "test(exercises): verify DeleteExerciseUseCase deletes local media file"
```
