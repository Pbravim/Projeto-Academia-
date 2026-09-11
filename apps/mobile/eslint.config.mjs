// Config flat própria do mobile. Espelha @inovatecjp/eslint-config, mas NÃO
// importa o preset `react-native` da org: ele arrasta eslint-plugin-react-hooks
// @4.6.2, que crasha no eslint 9 (`context.getSource is not a function`).
// ALVO FUTURO: quando a org publicar o preset corrigido, trocar tudo isto por
// `export { default } from '@inovatecjp/eslint-config/react-native'` + os
// desvios documentados abaixo. Ver docs/pipeline/LEARNINGS.md.
import base from '@inovatecjp/eslint-config/base';
import reactHooks from 'eslint-plugin-react-hooks';
import rn from 'eslint-plugin-react-native';

export default [
  ...base,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-native': rn },
    rules: {
      // ---- camada react-native da org ----
      'react-native/split-platform-components': 'error',
      'react-native/no-inline-styles': 'error',
      'react-native/no-single-element-style-arrays': 'error',
      'react-native/no-raw-text': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ---- DESVIO 1: makeStyles(theme) ----
      // 1183 falsos positivos ("Unused style detected: undefined.<chave>") em
      // 38 arquivos: o plugin não rastreia StyleSheet.create dentro da fábrica
      // de tema usada em 42 arquivos do app. Medido em 2026-08-16.
      'react-native/no-unused-styles': 'off',

      // ---- DESVIO 2: idioma `== null` ----
      // 99/99 achados de eqeqeq eram `x == null` / `x != null` (null OU
      // undefined). Trocar por === seria mudança de comportamento em código de
      // produção (ex.: RegistrarSerieUseCase.ts:94).
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // ---- DESVIO 3: `import type` ----
      // A regra core não entende import type: 20/20 achados eram
      // `import {X}` + `import type {Y}` do mesmo módulo. A do plugin import
      // entende (0 achados).
      'no-duplicate-imports': 'off',
      'import/no-duplicates': 'error',

      // ---- DESVIO 4 (não previsto no plano; medido em 2026-09-09) ----
      // O plano previa `eslint-plugin-react-native-a11y@^3.5.1`, mas TODAS as
      // versões publicadas (a última é a 3.5.1) declaram
      // peerDependencies.eslint = "^3 || ... || ^8" — o npm recusa com ERESOLVE
      // no eslint 9, e instalar com --legacy-peer-deps seria fingir suporte que
      // o autor não declara. Custo real de deixar o plugin fora, sob a Opção A:
      // UMA regra, `has-valid-accessibility-actions`, que mediu 0 achados; a
      // outra (`has-accessibility-hint`, 15 achados) já estava diferida.
      // Quando a dívida de a11y for retomada, ela precisa primeiro de um plugin
      // que suporte eslint 9 — não basta ligar a regra.

      // TODO(mobile-lint-debt): reativar as duas regras abaixo numa operação
      // própria. no-color-literals = 62 achados/24 arquivos (exige tokens de
      // tema novos); has-accessibility-hint = 15/7 (exige copy nova em pt-BR
      // e en-US). Decisão do supervisor em 2026-08-16 (Opção A do plano).
      'react-native/no-color-literals': 'off',
    },
  },
  {
    // O polyfill de crypto TEM de ser o primeiro import (uuidv7 depende dele
    // em tempo de carga). O sorter o moveria para depois de `./App`.
    files: ['index.ts'],
    rules: { 'simple-import-sort/imports': 'off' },
  },
  {
    // telas-deus fora de escopo (decisão do Portão 1, reafirmada 2026-09-11);
    // o portão loc bloqueia qualquer toque em módulo > 800 LOC; reativar
    // quando as telas forem fatiadas. Regras medidas com os arquivos
    // revertidos a origin/development (ver docs/pipeline/LEARNINGS.md).
    files: [
      'src/ui/perfil/screens/PerfilScreen.tsx',
      'src/ui/sessao/screens/ExercicioDetalheScreen.tsx',
    ],
    rules: {
      'simple-import-sort/imports': 'off',
      'import/first': 'off',
      'react-native/no-inline-styles': 'off',
      'no-shadow': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
];
