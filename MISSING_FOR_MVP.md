# Missing for MVP / 1.0

> Lacunas entre o estado atual e uma versão 1.0 publicável.
> Atualizado em `2026-06-02`.

O app já cobre o loop completo (treinos → sessão → histórico → dashboard → perfil/peso) e tem 126 testes verdes. Para virar "1.0 publicável", faltam os itens abaixo, em ordem de prioridade.

---

## P0 — Bloqueadores de 1.0

### 1. Backup manual do banco
Sem isso, troca de celular = perda total de dados.

**Escopo mínimo:**
- Botão "Exportar banco" no Dashboard → copia `.db` via `expo-file-system` e abre `expo-sharing` (libs já no projeto)
- Botão "Importar banco" → substitui DB local e força restart

**Custo:** ~1 dia. Não exige backend, auth, nem mudança de arquitetura.

---

### ~~2. Onboarding / estado vazio~~ ✅ FEITO (2026-06-02)
- `TreinoListScreen` vazia → botão "Criar primeiro treino" que foca o campo de nome
- `SessaoInicioScreen` sem treinos → CTA "Ir para Treinos" (já existia)
- `DashboardScreen` sem dados → mensagem amigável (já existia)

---

## P1 — Forte recomendação antes de 1.0

### ~~3. Editar série já registrada~~ ✅ FEITO (2026-06-02)
`UpdateSerieUseCase`, UI (long-press na série → editar), e wiring no hook controller já estavam implementados. Testes adicionados (5 casos: happy path, not-found, sessão finalizada, sessão cancelada, observacao null).

---

### ~~4. Testes de hook controller~~ ✅ FEITO (2026-06-02)
218 testes passando (era 126). Controllers com cobertura: `useSessaoAtivaController`, `useSessaoFeatureController`, `useExerciseCatalogController`, `useTreinoListController`, `useDashboardController`, `useTreinoEvolucaoController`, `useStatsController`, `usePerfilController`.

---

## P2 — Pode esperar pós-1.0

### 5. Sync automático em nuvem
Próximo passo do item 1. Só vale se backup manual virar fricção.

### ~~6. Mídia custom de exercício~~ ✅ FEITO (2026-06-02)
`MediaFields` permite upload de imagem/vídeo da galeria, preview, remoção. Arquivos copiados para `documentDirectory/exercises/`. Limpeza de arquivos órfãos adicionada (ao remover, substituir, ou deletar exercício).

### 7. RIR / RPE por série
Só fazer se você usar pessoalmente. Caso contrário, scope creep.

---

## Explicitamente NÃO fazer para 1.0

Itens do roadmap que devem permanecer fora:

- **Múltiplos perfis** — custo arquitetural alto (toda query precisa de `perfil_id`), sem demanda.
- **Planejamento semanal** — modelo novo (`PlanoSemanal` + `DiaTreino`) sem dor real para resolver.
- **HealthKit / Google Fit** — exige config nativa, sai do Expo Go puro. Adiar até depois de publicar.
- **Login / auth / backend próprio / web / social / monetização / analytics** — todos já fora-do-escopo no roadmap, manter.
- **Refactor de arquitetura** — Clean Architecture está saudável, não tocar.
- **Trocar SQLite** (WatermelonDB, etc) — sem ganho real para single-user offline.

---

## Veredito

**Resta apenas o item 1 (backup manual).** P1 e P2 concluídos. O único bloqueador real de 1.0 é o backup — sem ele, troca de celular = perda total de dados.
