# Auditoria de Performance & Tech Debt — 2026-07-06

3 varreduras paralelas (runtime, código, arquitetura/dados) sobre apps/mobile + apps/api.
Higiene geral ACIMA da média: zero casts inseguros em produção, 1 TODO real, tracker ativo.

## 🔴 P0 — Lentidão sentida pelo usuário / correção

| # | Achado | Evidência | Fix |
|---|--------|-----------|-----|
| 1 | Sessão ativa recarrega TUDO a cada série (getSessaoDetalhe + sugestões em lote após cada registrar/deletar/toggle) | useSessaoAtivaController.ts:91-301 | Estado incremental; recomputar sugestão só do exercício afetado |
| 2 | Catálogo: 517 exercícios em ScrollView+map sem virtualização; busca expande tudo; handlers sem useCallback quebram React.memo das sections; filtros de sugestão sem useMemo | ExerciseCatalogScreen.tsx:120,442-461; useExerciseCatalogController.ts:265,138,181,69-75 | SectionList virtualizada + useCallback/useMemo |
| 3 | Seeding sem transação: ~1500 auto-commits serializados no 1º boot/bump de catálogo (starvation de leituras admitido em comentário) | ExerciseSeedLoader.ts:47-133 | withTransaction em volta de loadSeedFiles |
| 4 | 119 MB de GIFs (206 arquivos) empacotados no APK | assets/gifs + gifAssets.ts | CDN/remoto com cache (media_online já existe) ou WebP/vídeo |
| 5 | CSV exporta séries soft-deletadas e sessões arquivadas (só filtra status='finalizada') — bug de corretude | ExportarHistoricoUseCase.ts:35 | AND deleted_at IS NULL (sr/se) AND arquivado=0 |

## 🟠 P1 — Robustez / produção

| # | Achado | Evidência | Fix |
|---|--------|-----------|-----|
| 6 | Sync sem retry/backoff/fila offline; offline detectado por `instanceof TypeError`; applyServerRows linha a linha SEM transação (estado parcial em falha) | SyncEngine.ts:78-98; 7 repos applyServerRows | withTransaction global no run(); backoff; NetInfo |
| 7 | Token de auth em SQLite texto plano; clear() grava '' em vez de deletar | SettingsTokenStore.ts:35-41 | expo-secure-store (drop-in atrás da interface) — pré-produção |
| 8 | ReordenarExerciciosUseCase suporta transação mas é instanciado SEM database → cai no ramo sem transação | mobileDependencies.ts:295 vs use case :61-65 | Passar database: databaseClient (fix de 1 linha) |
| 9 | TreinoDetail performSave: N updates de recomendações sequenciais sem transação ao salvar | TreinoDetailScreen.tsx:130-149 | Batch em 1 transação |
| 10 | baseURL default http://localhost:3000 sem default de produção | config/apiConfig.ts:9-10 | Falhar em release sem EXPO_PUBLIC_API_URL |
| 11 | Sem índice em dirty (getDirty do sync) nem deleted_at (9 repos filtram) — cresce com histórico | grep idx = 0 | Índices parciais WHERE dirty=1 / deleted_at |
| 12 | Boot: 27 JSONs de seed (517 ex.) parseados sincronamente no load do módulo + ~50 use cases instanciados | mobileDependencies.ts:56-171 | Lazy-load dos seeds atrás da assinatura |
| 13 | Migração v22 (rebuild de tabela) fora de transação com FK ON | ExpoSQLiteDatabaseClient.ts:589-614 | Envolver em transação |

## 🟡 P2 — Higiene / manutenção

| # | Achado | Evidência |
|---|--------|-----------|
| 14 | Telas-deus: ExercicioDetalheScreen 1427 l (re-render total a cada keystroke), PerfilScreen 855, TreinoDetail 776, BiSet 747 (+4 >500) — fluxo de série duplicado entre ExercicioDetalhe/BiSet | pendencias.md subestima contagens |
| 15 | Código morto: PesoLineChart (PerfilScreen.tsx:658, nunca chamado; duplica o de PesoScreen) e listMuscleGroupAlternativas (interface+2 impls, só testes usam) | confirmados |
| 16 | catch {} vazio ao mover mídia tmp_ → canônico (mídia pode sumir se SO limpar tmp) | useExerciseCatalogController.ts:237-239 |
| 17 | Non-null assertions em produção (grupoId!, current!, cargaKg!, sugestao!) | TreinoDetailScreen.tsx:381 + telas de sessão |
| 18 | getStats usa date()/strftime() envolvendo coluna → índice inutilizado | SqliteDashboardRepository.ts:99-116 |
| 19 | Buracos de teste: ExpoSQLiteDatabaseClient (916 l, migrações v0→22 sem regressão), SqliteDashboardRepository, SyncApiClient, useBackupSync. (Obs.: useSessaoAtivaController TEM teste — relatório do agente errou) | — |
| 20 | ExpoSQLiteDatabaseClient mistura client+22 migrações+seeds embutidos legados (v4/v10/v13 duplicam JSONs — documentar como legado imutável) | 916 linhas |
| 21 | pendencias.md DESATUALIZADO: lista i18n (sub-6) e pesquisa sub-5 como não feitos — ambos entregues 2026-07-06; contagens de telas-deus defasadas | docs/pendencias.md |
| 22 | PickerCarousel monta 81 views por picker; blocos/sorted sem useMemo em TreinoDetail; O(n²) find em blocos.map | PickerCarousel.tsx:61; TreinoDetailScreen.tsx:201-357 |
| 23 | GIFs ~118 MB também no histórico git → candidato a LFS/limpeza | pendencias.md:46 |
| 24 | react-test-renderer possivelmente órfão em devDeps | package.json |

## Já otimizado (não mexer)
Dashboard/getStats sem N+1 (agregação single-query); GetSessaoDetalhe com findByIds em batch;
SugerirProgressao.executeLote com chunking; catálogo com updates otimistas; índices de FK cobertos.
