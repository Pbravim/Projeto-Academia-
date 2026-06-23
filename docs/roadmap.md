# Roadmap — Features Pendentes

> Estrutura original de `2026-05-07` (sessão 3). **Status revisado em `2026-06-22`** — ver notas
> ⚠️ em cada item. A fonte de verdade priorizada do que está aberto é `docs/pendencias.md`.

> ⚠️ **Mudanças relevantes desde 2026-05-07:**
> - **Backend criado** (`apps/api`, NestJS + Prisma + Postgres: auth/users/treinos/exercises/sync) —
>   vários itens abaixo marcados "sem backend / fora do escopo" já não valem.
> - **Sub-projeto 5 (Exercise Intelligence)** em grande parte **implementado** (schema v20–v22,
>   campos biomecânicos, engine de substituição, `tracking_type`). Restam auditorias de grupos e
>   a categoria `reabilitacao_lombar_core`.
> - **Planejamento semanal** e **edição de série registrada** (antes listados como futuros/fora de
>   escopo) já estão **implementados**.

---

## Prioridade Alta

### Sub-projeto 5: Exercise Intelligence — modelo de exercício mais rico + substituição escalonada

> ⚠️ **Status (2026-06-22): em grande parte CONCLUÍDO.** Os campos biomecânicos e o engine de
> substituição abaixo já foram implementados (schema v20–v22; engine escalonado landou em 2026-06-10).
> Pendente: auditoria de ~7 grupos musculares restantes e a 9ª categoria de expansão
> `reabilitacao_lombar_core`. Detalhes em `docs/exercises/catalog-maintenance.md` e `docs/pendencias.md`.

**O que:** enriquecer a entidade `Exercise` com dados biomecânicos estruturados e melhorar o engine de sugestão de substitutos com camadas de similaridade.

**Mudanças planejadas na entidade `Exercise`:**
- `movement_pattern` — novo campo enum (`Horizontal Push`, `Vertical Push`, `Horizontal Pull`, `Vertical Pull`, `Squat`, `Hinge`, `Lunge`, `Rotation`, `Anti-Rotation`, `Carry`, `Gait`, `Jump`, `Sprint`)
- `musculo_alvo` — expandir de `string | null` para `string[]` (músculos principais)
- `stabilizers: string[]` — músculos estabilizadores (informativo)
- `execution_type` — `Unilateral | Bilateral | Can Be Both`
- `name_variations: string[]` — variações de nome para melhorar busca
- `primary_equipment` / `secondary_equipment` — vocabulário controlado (Barbell, Dumbbell, Cable, Smith Machine, etc.) em vez de texto livre

**Mudanças no `SugerirSubstitutosUseCase` — 3 camadas de similaridade:**

| Camada | Label | Critério |
|--------|-------|----------|
| 0 | Predefinidos | `listAlternativas` manual (sem mudança) |
| 1 | Quase igual | Mesmo `movement_pattern` E interseção de `musculo_alvo[]` |
| 2 | Similar | Mesmo `movement_pattern` OU alta sobreposição de `musculo_alvo[]` |
| 3 | Mesmo grupo | Mesmo `groupMuscle` (comportamento atual de camada 2) |

**Split de `listAlternativas` em `ExerciseRepository`:**
- `listEquivalentAlternativas(id)` — biomechanicamente equivalentes
- `listMuscleGroupAlternativas(id)` — mesmo músculo, padrão de movimento diferente

**Depende de:** nenhum backend — pode ser feito em paralelo com sub-projeto 1.
**Referência de dados:** usar a skill `exercise-intelligence-research` para pesquisar e popular os dados.

---

## Prioridade Média

### Sub-projeto 6: i18n / Language Switcher

**O que:** infraestrutura de internacionalização (i18next + react-i18next + expo-localization) + seletor de idioma na tela de Perfil (PT-BR / English / Automático), com extração das ~176+ strings hardcoded em PT-BR espalhadas por 38 arquivos (7 áreas de feature + use-cases/entidades).

**Por que:** os recursos de trainer↔client (sub-projetos 3-4) podem envolver usuários que não falam português; suporte a inglês amplia o alcance.

**Spec completa:** `docs/superpowers/specs/2026-06-07-i18n-language-switcher-design.md`

**Sequenciamento:** fila para depois do sub-projeto 5 — não bloqueia nem é bloqueado por ele.

---

### 1. Sincronização / Backup na nuvem

> ⚠️ **Status (2026-06-22):** o backend próprio já existe (`apps/api`, com `auth` + `sync` e o
> contrato de sync em `packages/contracts`); o schema mobile já carrega metadados de sincronização
> (v19). Falta ligar o sync no app e os itens de prontidão listados em `docs/pendencias.md`
> (sub-projeto 2). Não depende mais de Supabase/Firebase.

**O que:** backup do banco local em conta do usuário (iCloud / Google Drive / backend próprio)  
**Por que:** proteção contra perda de dados por troca de celular  
**Estratégia recomendada:** backup do arquivo SQLite completo como primeiro passo  
**Depende de:** `apps/api` (auth + sync) já criado — falta integração no mobile

---

## Sugestões Futuras

Itens considerados valiosos mas sem prazo definido. Podem ser retomados se houver demanda.

---

### Visualizador 3D de Anatomia Muscular (Muscle Highlight App)

**O que:** app interativo 3D onde o usuário vê quais músculos são ativados em cada exercício — músculo primário em vermelho, secundário em laranja, estabilizador em amarelo. Clique no músculo exibe informações detalhadas. Animações de execução reproduzidas no modelo 3D.

**Origem:** existe um modelo anatômico 3D desenvolvido no Blender com texturas individuais por músculo. O pipeline previsto é exportar como `.glb` (Draco-compressed) e carregar no app via React Three Fiber.

**Stack prevista:** React + Vite + React Three Fiber + `@react-three/drei` + Zustand + Tailwind.

**Princípio de funcionamento:**
- Cada músculo é um mesh separado com nome padronizado (ex: `Pectoralis_Major_Sternocostal`)
- `exercises.json` mapeia exercício → `{ primary[], secondary[], stabilizer[] }` de nomes de meshes
- Ao selecionar exercício, o app sobrescreve a cor do material de cada mesh em runtime (preservando o material original em `userData.originalMaterial`)
- Animações: clips nomeados no `.glb` são acionados via `useAnimations` do drei

**Schema de cores:**
```
primary    → #FF2222 (vermelho)
secondary  → #FF8800 (laranja)
stabilizer → #FFDD00 (amarelo)
inactive   → #AAAAAA (cinza)
```

**Roadmap interno do sub-projeto:**

| Fase | Funcionalidades |
|------|----------------|
| 1 — MVP | Modelo 3D no browser, rotação/zoom, lista de exercícios, highlight de músculos primários |
| 2 — Interatividade | Secundários e estabilizadores com cores distintas, painel de info por músculo, player de animação, legenda |
| 3 — Conteúdo | 20+ exercícios, filtro por grupo muscular, comparação lado a lado, modo quiz |
| 4 — Mobile/AR | PWA, React Native com WebView, WebXR (opcional) |

**Otimizações de performance previstas:** Draco compression (~60–70% menor), Decimate modifier no Blender, texturas ≤ 1024×1024px, LOD em runtime.

**Documentação técnica completa:** [`docs/muscle-highlight-app.md`](muscle-highlight-app.md) — inclui pipeline Blender→glb, estrutura de componentes, código dos componentes principais (`HumanModel.jsx`, `Scene.jsx`, `ExercisePanel.jsx`), schema do `exercises.json`, otimizações de performance e checklist para retomar o desenvolvimento.

**Dependências externas:** arquivo `human_model.glb` exportado do Blender (projeto existente). Sem dependência de backend.

---

**RIR / RPE por série** — campo opcional de esforço percebido (RIR 0–4 ou RPE 1–10) por série; impacto no schema: nova coluna em `series_registradas`

**Planejamento semanal** — ✅ **IMPLEMENTADO** (schema v16, `GetPlanoSemanalUseCase`/`SetDiaPlanoUseCase`, 7 linhas fixas por dia da semana)

**Múltiplos perfis** — mais de uma pessoa usando o mesmo dispositivo; depende de `PerfilLocal` (já previsto no modelo de domínio original)

**Integração com HealthKit / Google Fit** — registrar treino concluído na saúde do dispositivo; depende de `expo-health` ou biblioteca nativa

---

## Fora do Escopo

Itens deliberadamente deixados de fora, revisáveis no futuro:

- ~~Login e autenticação~~ — ⚠️ revisado: `apps/api` já tem módulo `auth` (JWT) para o sync/backup
- ~~Backend próprio~~ — ⚠️ revisado: `apps/api` (NestJS + Prisma + Postgres) já existe
- Versão web
- ~~Edição de série já registrada~~ — ✅ **IMPLEMENTADO** (long-press na série durante a sessão abre edição inline)
- Recursos sociais (compartilhar treino, seguir amigos)
- Integração com wearables (smartwatch, sensor de frequência cardíaca)
- Monetização
- Analytics de produto (Mixpanel, Amplitude)
- Fotos/vídeos de execução
