# P2 — Fix Remaining Comma Parse Occurrences in Screen Files

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 9 remaining occurrences of the single-replace comma-to-dot bug (`.replace(',', '.')`) in screen and detail components. The same bug was fixed in `usePesoController` (CQ-3, commit `f711c70`) — this plan applies the same fix to the remaining files.

**Background:** `.replace(',', '.')` only replaces the first comma. Input `"1,234,5"` becomes `"1.234,5"` — still unparseable. The fix: use `.replace(/,/g, '.')`.

**Affected files** (confirmed by CQ-3 agent scan):
- `apps/mobile/src/ui/sessoes/screens/TreinoDetailScreen.tsx`
- `apps/mobile/src/ui/sessoes/components/BiSetDetalheScreen.tsx`
- `apps/mobile/src/ui/sessoes/components/ExercicioDetalheScreen.tsx`

Each file may have multiple occurrences (agent found 9 total across all three).

**Architecture:** All 3 tasks are independent — different files, no shared state.

**Tech Stack:** TypeScript/TSX, Vitest. Test command: `npm --prefix apps/mobile test`.

---

### Task 1: TreinoDetailScreen.tsx

- [ ] **Step 1: Find all occurrences**

```bash
grep -n "replace.*','.*'\\.'" apps/mobile/src/ui/sessoes/screens/TreinoDetailScreen.tsx
```

Note line numbers and context for each occurrence.

- [ ] **Step 2: Import or inline the parsePesoInput helper**

Option A (preferred): import the already-created `parsePesoInput` helper:

```ts
import { parsePesoInput } from '../../peso/hooks/usePesoController';
```

Then replace `parseFloat(value.replace(',', '.'))` with `parsePesoInput(value)`.

Option B: inline the fix — change each `.replace(',', '.')` to `.replace(/,/g, '.')`.

Use Option A if the import is clean; Option B if the usage is deeply embedded and importing adds noise.

- [ ] **Step 3: Verify TypeScript**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no new errors.

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/ui/sessoes/screens/TreinoDetailScreen.tsx
git commit -m "fix(sessoes): use /,/g regex for comma parse in TreinoDetailScreen"
```

---

### Task 2: BiSetDetalheScreen.tsx

- [ ] **Step 1: Find all occurrences**

```bash
grep -n "replace.*','.*'\\.'" apps/mobile/src/ui/sessoes/components/BiSetDetalheScreen.tsx
```

Note line numbers and context for each occurrence.

- [ ] **Step 2: Apply the fix**

Same approach as Task 1: either import `parsePesoInput` or inline `.replace(/,/g, '.')`.

- [ ] **Step 3: Verify TypeScript**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no new errors.

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/ui/sessoes/components/BiSetDetalheScreen.tsx
git commit -m "fix(sessoes): use /,/g regex for comma parse in BiSetDetalheScreen"
```

---

### Task 3: ExercicioDetalheScreen.tsx

- [ ] **Step 1: Find all occurrences**

```bash
grep -n "replace.*','.*'\\.'" apps/mobile/src/ui/sessoes/components/ExercicioDetalheScreen.tsx
```

Note line numbers and context for each occurrence.

- [ ] **Step 2: Apply the fix**

Same approach as Task 1.

- [ ] **Step 3: Verify TypeScript**

```bash
npm --prefix apps/mobile run typecheck
```

Expected: no new errors.

- [ ] **Step 4: Run tests**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/ui/sessoes/components/ExercicioDetalheScreen.tsx
git commit -m "fix(sessoes): use /,/g regex for comma parse in ExercicioDetalheScreen"
```

---

### Task 4: Verify no remaining occurrences

- [ ] **Step 1: Final scan**

```bash
grep -r "replace.*','.*'\\.'" apps/mobile/src --include="*.ts" --include="*.tsx"
```

Expected: zero results. If any remain, fix them following the same pattern.

- [ ] **Step 2: Run full suite**

```bash
npm --prefix apps/mobile test
```

Expected: all tests pass.
