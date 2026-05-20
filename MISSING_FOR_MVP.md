# Missing for MVP / 1.0

> Lacunas entre o estado atual e uma versão 1.0 publicável.
> Atualizado em `2026-05-20`.

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

### 2. Onboarding / estado vazio
Primeira abertura abre em telas ocas. Provavelmente parece quebrado para um usuário novo.

**Escopo mínimo:**
- Tab Treinos vazia → CTA "Criar primeiro treino"
- Tab Sessão sem sessão ativa → CTA "Iniciar treino"
- Dashboard sem dados → mensagem amigável em vez de gráficos vazios

---

## P1 — Forte recomendação antes de 1.0

### 3. Editar série já registrada
Marcado como fora-do-escopo no roadmap ("deletar e redigitar é suficiente"), mas em meio de treino isso é fricção real. Tela de detalhe já existe; falta `UpdateSerieUseCase` + entrada no UI.

**Custo:** algumas horas.

---

### 4. Testes de hook controller
Hoje cobertos: entities, use cases, repos, presenters. Descobertos: `useSessaoAtivaController`, `useExerciseCatalogController`, `usePerfilController`, etc. — onde mais aparecem regressões (state + efeitos + race conditions).

**Estratégia:** `@testing-library/react-native` já está instalado. Começar pelos controllers da sessão (caminho crítico).

---

## P2 — Pode esperar pós-1.0

### 5. Sync automático em nuvem
Próximo passo do item 1. Só vale se backup manual virar fricção.

### 6. Mídia custom de exercício
`expo-video` + `expo-image-picker` já estão no `package.json` e existe `ExerciseMediaViewer`. Suspeita: infra está 80% pronta — checar se vale terminar para permitir upload de GIF próprio.

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

**É um v1 honesto, não um MVP.** ~1–2 semanas focadas em P0+P1 e vira "1.0 publicável na Play Store". O único item que muda o risco do produto é **backup** — sem ele, qualquer usuário que trocar de celular perde tudo.
