# Design: i18n / Language Switcher

> Status: approved design, not yet planned/implemented. Queued as a future sub-project (after sub-project 5).

## Why

The app is currently 100% hardcoded PT-BR — zero i18n infrastructure (no `i18next`, `expo-localization`, translation files, or locale config). The trainer↔client features planned in sub-projects 3–4 may involve non-Portuguese-speaking users, so English support matters for reach. A language switcher gives users (and future trainer/client pairs) the ability to use the app in their preferred language.

**Scope at a glance:** ~176+ inline PT-BR strings across 38 files (≈76% of the UI layer), spanning 7 feature folders (`dashboard`, `exercises`, `historico`, `perfil`, `peso`, `sessao`, `treinos`) plus presenters/view-models and validation messages embedded in use-cases/entities.

## Architecture

- **Stack**: `i18next` + `react-i18next` + `expo-localization`. Standard combo for Expo/React Native — `expo-localization` reads the device locale, `i18next` handles translation lookup/interpolation/pluralization, `react-i18next` provides the `useTranslation()` hook.
- **Provider composition**: a new `I18nProvider` wraps the app alongside the existing `ThemeProvider` (same composition point in the app root).
- **Translation resources**: organized into i18next *namespaces* mirroring the 7 existing feature folders, plus:
  - `common` — shared strings (buttons like "Salvar"/"Cancelar"/"Confirmar", generic error/success messages)
  - `domain` — validation messages currently embedded in use-cases/entities (these are not purely UI-layer strings and need their own extraction pass)
- **Component usage**: `useTranslation('namespace')` — a drop-in parallel to the existing `useTheme()` hook already used in ~50 components, so the pattern feels familiar to the codebase.

## Locale resolution & persistence

- **First launch**: read device locale via `expo-localization`. If it starts with `pt`, default to `pt-BR`; otherwise default to `en`.
- **Persistence**: mirrors theme preference exactly — a `locale` key stored via `databaseClient.getSetting`/`setSetting` (the same generic SQLite settings table `useThemeProvider` already uses; no new persistence mechanism).
- **Override behavior**: once the user explicitly picks a locale, that stored preference overrides device-locale detection on subsequent launches. An "Automático" option lets them revert to device-locale-driven behavior.

## Switcher UI

Lives in `PerfilScreen.tsx`, mirroring the existing `THEME_OPTIONS` chip-selector pattern (`Auto / Claro / Escuro`):

- New `useLocalePreference()` hook, parallel to `useThemePreference()`
- Chip selector with options: `Automático / Português / English`

## Testing approach

Existing tests assert on hardcoded PT-BR strings (e.g. `expect(screen.getByText('Salvar'))`). Rather than rewriting ~176+ assertions:

- Test render setup wraps components with the i18n provider defaulting to `pt-BR` — existing PT-BR assertions keep passing unchanged.
- New tests target the switcher itself: verify the `locale` setting persists via `databaseClient` and resolves correctly on reload (mirroring how `useThemeProvider` is tested).

## Extraction phasing (within one dedicated sub-project)

Ordered so the work can be reviewed/merged incrementally rather than as one giant PR:

1. **Infrastructure phase**: install deps, build `I18nProvider`/`useLocalePreference`, set up namespace structure with `common` + `domain` populated, wire the switcher into `PerfilScreen`. App still renders 100% PT-BR (now via i18next, not hardcoded) — functionally invisible to users, but everything is now translatable.
2. **Per-feature extraction phases** (7 phases): `dashboard` → `exercises` → `sessao` → `treinos` → `historico` → `peso` → `perfil`, ordered by string density and how often each area is actively touched by the current roadmap (exercises/sessao first).
3. **EN translation pass**: once all keys exist in PT-BR, translate to English namespace-by-namespace.

## Error handling & edge cases

- **Missing translation keys**: i18next falls back to the key string in dev (visible during testing) and to the `pt-BR` resource in production — never shows raw keys to users.
- **Pluralization**: PT-BR and EN have different plural rules (e.g. "1 série" / "2 séries" vs "1 set" / "2 sets") — handled via i18next's built-in plural support, called out explicitly so extraction phases account for it instead of string concatenation.
- **Date/number formatting**: the 3 existing hardcoded `toLocaleDateString('pt-BR', ...)` calls (in `PerfilScreen.tsx`, `PesoScreen.tsx`, `ExportarHistoricoUseCase.ts`) switch to the active locale, driven by the same `locale` setting.

## Out of scope

- Languages other than PT-BR and EN
- Per-screen string extraction spread across unrelated sub-projects (decided: full extraction happens in one dedicated effort)
- Changing the default-locale behavior for existing users beyond what device-locale detection naturally produces (no forced migration/prompt)

## Sequencing

Queued as a future sub-project. To be picked up after sub-project 5 (Exercise Intelligence) per the user's current focus — not blocking it, not blocked by it.
