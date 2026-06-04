# Onboarding / Empty States — P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first-run experience feel intentional: TreinoListScreen empty state gains a "Criar primeiro treino" CTA button that focuses the name field; SessaoInicioScreen and DashboardScreen are already acceptable (no changes needed).

**Architecture:** `TreinoListScreen` owns a `TextInput` ref for the name field. The local `Field` component gains an optional forwarded ref. The empty state renders a `Pressable` CTA that calls `ref.current?.focus()` — React Native auto-scrolls to focused inputs, so no `ScrollView` ref is needed.

**Tech Stack:** React Native, TypeScript, no new deps.

---

### Task 1: Add CTA button to TreinoListScreen empty state

**Files:**
- Modify: `apps/mobile/src/ui/treinos/screens/TreinoListScreen.tsx`

**Current state:** Lines 59-66 show text-only empty state. The `Field` component (line 363) wraps a `TextInput` but accepts no ref. 

- [ ] **Step 1: Add `forwardRef` to local `Field` component**

Replace the `Field` function definition (lines 363-391) with a forwarded-ref version. The existing `FieldProps` interface (line 351) does not change — add a second type param for the ref:

```tsx
const Field = React.forwardRef<TextInput, FieldProps>(function Field(
  { label, placeholder, value, onChangeText, onSubmitEditing, editable, required, styles, placeholderTextColor },
  ref,
) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.requiredMark}> *</Text> : null}</Text>
      <TextInput
        ref={ref}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        editable={editable}
        returnKeyType="done"
      />
    </View>
  );
});
```

Also add `import React, { useRef } from 'react';` (replace the existing `import { ... } from 'react'` — add `React` as the default import and add `useRef`).

- [ ] **Step 2: Create `nameInputRef` and wire it to the Name `Field`**

Inside `TreinoListScreen`, before the `return`, add:

```tsx
const nameInputRef = useRef<TextInput>(null);
```

Then change the first `<Field` inside `formCard` (the Name field, around line 80) to pass the ref:

```tsx
<Field
  ref={nameInputRef}
  label="Nome"
  placeholder="Ex.: Treino A"
  value={draft.name}
  onChangeText={(v) => onChangeField('name', v)}
  onSubmitEditing={() => { if (canSubmit) void onSubmit(); }}
  editable={!isSubmitting}
  required
  styles={styles}
  placeholderTextColor={c.inputPlaceholder}
/>
```

- [ ] **Step 3: Replace text-only empty state with CTA version**

Replace lines 59-66 (the `emptyState` view) with:

```tsx
{treinos.length === 0 && !isLoading ? (
  <View style={styles.emptyState}>
    <Text style={styles.emptyStateTitle}>Nenhum treino ainda</Text>
    <Text style={styles.emptyStateBody}>
      Crie seu primeiro treino para comecar a registrar sessoes.
    </Text>
    <Pressable
      onPress={() => nameInputRef.current?.focus()}
      style={({ pressed }) => [styles.emptyStateCta, pressed ? { opacity: 0.85 } : null]}
    >
      <Text style={styles.emptyStateCtaText}>Criar primeiro treino</Text>
    </Pressable>
  </View>
) : null}
```

- [ ] **Step 4: Add CTA styles to `makeStyles`**

Inside the `makeStyles` function, add after the existing `emptyStateBody` style:

```tsx
emptyStateCta: {
  marginTop: 8,
  alignSelf: 'flex-start',
  backgroundColor: c.accent,
  borderRadius: 12,
  paddingHorizontal: 18,
  paddingVertical: 10,
},
emptyStateCtaText: {
  color: c.accentText,
  fontSize: 14,
  fontWeight: '700',
},
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/ui/treinos/screens/TreinoListScreen.tsx
git commit -m "feat(treinos): add CTA button to empty state that focuses create form"
```

---

### Task 2: Verify DashboardScreen and SessaoInicioScreen empty states

Both screens already have acceptable empty states (no code changes needed). This task is a quick manual audit to confirm they meet the MVP bar.

**Files:**
- Read-only: `apps/mobile/src/ui/dashboard/screens/DashboardScreen.tsx`
- Read-only: `apps/mobile/src/ui/sessao/screens/SessaoInicioScreen.tsx`

- [ ] **Step 1: Confirm SessaoInicioScreen empty state**

`SessaoInicioScreen` at lines 68-83 already renders:
- "Nenhum treino cadastrado" title
- "Crie um treino primeiro para poder iniciar uma sessao." body
- "Ir para Treinos" CTA button (rendered when `onGoToTreinos` is provided)

Confirm `onGoToTreinos` is wired in the parent navigator (usually `SessaoTab` or root navigator). No code change needed unless this prop is not being passed.

- [ ] **Step 2: Confirm DashboardScreen empty state**

`DashboardScreen` already shows friendly messages when `stats` is null or session count is zero. No code change needed.

- [ ] **Step 3: Done — no commit needed for this task**
