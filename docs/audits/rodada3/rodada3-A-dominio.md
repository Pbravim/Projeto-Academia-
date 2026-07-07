# Rodada 3 — Agente A — Corretude de domínio

Repo: `C:\Users\Usuario\Documents\Github\projeto-academia-` (apps/mobile). Modo read-only.
Achados ordenados por prioridade. Os dois primeiros foram **verificados empiricamente** com better-sqlite3 (script em `scratchpad/check-maxid.cjs`).

---

## P0-1 — `getUltimasExecucoesValidas` descarta exercícios silenciosamente (JOIN com MAX independentes)

**Arquivo:** `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts:38-45`

A subquery calcula `MAX(st2.data_hora_fim) AS max_fim, MAX(st2.id) AS max_id` **independentemente** no mesmo GROUP BY, e o join exige `st.data_hora_fim = latest.max_fim AND st.id = latest.max_id`. `max_id` é o maior id lexicográfico entre TODAS as sessões do exercício, não o id da sessão mais recente.

**Cenário (reproduzido com better-sqlite3, retornou 0 linhas):**
- Sessão `st-zzz` finalizada 2026-01-01, sessão `st-aaa` finalizada 2026-02-01, ambas com Supino.
- `max_fim = 2026-02-01`, `max_id = 'st-zzz'` → nenhuma sessão satisfaz as duas condições → **exercício some do mapa**.
- Com UUIDs aleatórios isso acontece sempre que a sessão mais recente não tiver o maior id lexicográfico (~50% dos casos com 2 sessões; piora com mais sessões).

**Impacto:** "última execução" some do catálogo de exercícios (`useExerciseCatalogController`) e `SugerirSubstitutosUseCase` perde a carga de referência dos substitutos. Silencioso.
O teste `SQLiteHistoricoRepository.tiebreak.test.ts` só cobre o caso de `data_hora_fim` idênticos (onde o bug não aparece).

**Fix (1 linha de ideia):** selecionar a sessão mais recente por exercício com ordenação conjunta, e.g. window function `ROW_NUMBER() OVER (PARTITION BY se2.exercicio_id ORDER BY st2.data_hora_fim DESC, st2.id DESC) = 1`, em vez de dois MAX independentes.

---

## P1-2 — Aderência semanal/mensal/anual bucketa por dia UTC; treino noturno cai no dia seguinte e "hoje" marca o dia errado

**Arquivo:** `apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts:28, 99-118` (e chaves locais em 159-180)

As sessões são gravadas em ISO-UTC (`SessaoTreino.create` → `toISOString()`, `SessaoTreino.ts:27`). As queries agrupam com `date(data_hora_inicio)` e `strftime('%Y-%m'/'%Y', ...)` — tudo em **UTC** — enquanto os rótulos da semana/mês são construídos com datas **locais** (truque do meio-dia em `getMondayOfWeek`). Além disso `todayKey = now.toISOString().split('T')[0]` (linha 28) é a data UTC.

**Cenários (Brasil, UTC-3; `date('2026-07-07T00:30:00.000Z')` confirmado = `2026-07-07`):**
1. Treino segunda 06/07 às 21:30 BRT → gravado `2026-07-07T00:30Z` → barra da aderência semanal aparece na **terça**.
2. Treino 31/07 às 21:30 BRT → `2026-08-01T…Z` → **some do calendário de julho** e conta em agosto.
3. Treino 31/12 às 21:30 BRT → conta no **ano seguinte** (aderência anual do ano corrente perde a sessão).
4. Às 21:30 de segunda, `todayKey` já é terça (UTC) → o destaque "hoje" (`isToday`) marca **terça** na semana/calendário antes de o dia começar.

Janela de erro diária: 21:00–24:00 local em UTC-3 (00:00–02:00 em UTC+2, etc.).

**Fix:** bucketar em SQL com `date(data_hora_inicio, 'localtime')` / `strftime('%Y-%m', data_hora_inicio, 'localtime')` e calcular `todayKey` a partir de campos locais (`getFullYear/getMonth/getDate`), não de `toISOString()`.

---

## P1-3 — "Hoje/Ontem/há N dias" calculado por horas/24, não por dia de calendário

**Arquivo:** `apps/mobile/src/ui/sessao/screens/SessaoInicioScreen.tsx:21-23`

`const dias = Math.floor((Date.now() - new Date(ultimaSessao).getTime()) / 86_400_000)` mede tempo decorrido, não dias de calendário.

**Cenário:** treinou ontem às 22:00; hoje às 08:00 abre a tela → 10h decorridas → `dias = 0` → mostra **"Hoje"** (deveria ser "Ontem"). Simetricamente, "há 2 dias" só aparece após 48h corridas.

**Fix:** comparar datas de calendário locais (normalizar ambas com `setHours(0,0,0,0)` antes de dividir por 86.4M).

---

## P1-4 — SQLite `getUltimaExecucaoValida`/`getUltimasExecucoesValidas` não filtram `tipo_serie='valida'` (divergem da implementação de referência)

**Arquivo:** `apps/mobile/src/infrastructure/historico/SQLiteHistoricoRepository.ts:34-76` (vs `InMemoryHistoricoRepository.ts:39-47,62-66` que filtra `tipoSerie === 'valida'`)

Apesar do nome "válida", as queries SQL incluem séries de aquecimento e não caem para a sessão anterior quando a mais recente não tem série válida.

**Cenários:**
1. Última sessão do exercício registrou apenas 1 série de **aquecimento** (20kg×10) — a anterior teve válidas 80kg×8. SQLite retorna 20kg×10 como "última execução"; InMemory (comportamento especificado nos testes) retorna 80kg×8.
2. Na mesma sessão: aquecimento 50kg×25 → Epley 91.7 vence a válida 80kg×2 → 85.3; o `ORDER BY … 1RM DESC` elege o **aquecimento** como melhor série da última execução.

**Fix:** adicionar `AND sr.tipo_serie = 'valida'` nas duas queries (e no subselect "latest", exigir existência de série válida).

---

## P1-5 — Recordes pessoais incluem séries de sessões canceladas e em andamento

**Arquivo:** `apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts:81-93`

A query de `recordesPessoais` filtra `st.arquivado = 0` e `deleted_at`, mas **não** `st.status = 'finalizada'` — única query de leitura do app sem esse filtro (histórico, stats, evolução e aderência todos filtram).

**Cenário:** usuário inicia sessão, digita 500kg×10 por engano, **cancela** a sessão (CancelarSessaoUseCase preserva as linhas, só muda status — `CancelarSessaoUseCase.ts:25-26`). O card de recordes mostra "1RM ~666.7kg" para sempre, e nenhuma outra tela exibe essa série para o usuário corrigir.

**Fix:** adicionar `AND st.status = 'finalizada'` no WHERE.

---

## P2-6 — Volume e melhor 1RM do dashboard incluem séries de aquecimento; histórico exclui → números divergem entre telas

**Arquivos:** `apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts:71-72` (volume_total/melhor_orm por sessão), `:82-83` (recordes), `:206-220` + `TreinoEvolucaoScreen.tsx:91,117` (evolução: nem passa `muted`) — vs `sessionSeriesTableModel.ts:68-92` e `buildHistoricoExercicioViewModel.ts:78-82`, que excluem aquecimento do 1RM/volume.

**Cenário:** sessão com aquecimento 20kg×10 (200kg) + válida 100kg×5 (500kg): dashboard mostra volume **700kg**; a tabela do histórico do exercício mostra **500kg** para a mesma sessão. O gráfico de 1RM do histórico ignora aquecimentos, mas o `melhorOrm` do dashboard não.

**Fix:** adicionar `AND sr.tipo_serie = 'valida'` nas agregações do dashboard (ou propagar `muted` na evolução) para alinhar com o histórico.

---

## P2-7 — `formatCarga`/`formatVolume` hardcodam vírgula decimal — errado em en-US

**Arquivo:** `apps/mobile/src/ui/shared/components/sessionSeriesTableModel.ts:42,46`

`.replace('.', ',')` incondicional, embora `buildSessionTableRows` receba `locale`.

**Cenário:** locale en-US, série 82.5kg → tabela mostra "82,5" e volume 1240kg → "1,2 t" (en-US esperaria "82.5" / "1.2 t"). Existe `formatFixedDecimal(locale)` em `i18n/formatters.ts:43` que resolve exatamente isso.

**Fix:** aceitar `locale` em `formatCarga`/`formatVolume` e usar `formatFixedDecimal`.

---

## P2-8 — Editor de série arredonda a carga exibida para múltiplos de 2.5kg

**Arquivo:** `apps/mobile/src/ui/sessao/screens/ExercicioDetalheScreen.tsx:64-66` (`kgIndexFor` = `Math.round(kg/2.5)`) e `:1113-1116` (editor usa só carrossel: `selectedIndex={kgIndexFor(editKg)}`).

**Cenário:** série registrada via modo texto com 6kg (halteres pequenos). Ao abrir "editar série", o carrossel exibe **5** (índice arredondado) enquanto o valor real é 6; qualquer toque no carrossel salva 5 — perda silenciosa dos 1kg. Não há modo texto no editor.

**Fix:** no editor, exibir input de texto (ou pré-carregar texto) quando `editKg % 2.5 !== 0`.

---

## P2-9 — Delta de peso igual a zero exibe "-0 kg"

**Arquivo:** `apps/mobile/src/ui/peso/presenters/buildPesoViewModel.ts:64-68`

`formatDelta`: `delta > 0 ? '+…' : '-…'` — zero cai no ramo negativo.

**Cenário:** dois registros consecutivos com 80kg → card mostra delta **"-0 kg"** (com seta de queda, `pesoAumentou=false`).

**Fix:** tratar `delta === 0` (exibir "0 kg" neutro ou omitir o delta).

---

## P3-10 — `getMondayOfWeek` (truque do meio-dia + `toISOString`) quebra em UTC+13/+14

**Arquivo:** `apps/mobile/src/infrastructure/dashboard/SqliteDashboardRepository.ts:15-21`

Meio-dia local convertido para UTC muda de dia quando |offset| > 12h.

**Cenário:** usuário em Kiritimati (UTC+14) ou Tonga no DST (UTC+14): segunda 12:00 local = domingo 22:00Z → `toISOString().split('T')[0]` devolve **domingo** → toda a semana da aderência desloca um dia.

**Fix:** montar a chave com `getFullYear/getMonth/getDate` locais em vez de `toISOString()`.

---

## P3-11 — Epley aplicado a reps=1 estima 1RM acima da carga realmente levantada

**Arquivo:** `apps/mobile/src/shared/utils/estimativa1rm.ts:9-11` (e `estimativa1rmSql:22-24`)

`carga * (1 + reps/30)` para reps=1 dá 3.3% acima do peso levantado.

**Cenário:** single de 100kg×1 → app mostra "1RM ~103.3 kg" e esse valor vira recorde, acima do 1RM real demonstrado (100kg).

**Fix:** retornar `cargaKg` quando `repeticoes <= 1` (nas versões JS e SQL, e.g. `CASE WHEN repeticoes <= 1 THEN carga_kg ELSE … END`).

---

## P3-12 — Carga recomendada "0" (peso corporal) é silenciosamente descartada no treino

**Arquivo:** `apps/mobile/src/ui/treinos/screens/TreinoDetailScreen.tsx:143`

`Number.isFinite(cv) && cv > 0 ? cv : null` — digitou 0 → salva `null` sem aviso, enquanto o registro de série aceita carga 0 (`SerieRegistrada.ts:45` usa `< 0`).

**Cenário:** usuário define carga recomendada 0 para barra fixa (peso corporal) → salvo como "sem recomendação"; a sugestão de progressão passa a usar `Math.max` do histórico em vez do padrão.

**Fix:** aceitar `cv >= 0` (alinhado à validação da série) ou mostrar erro em valor negativo.

---

## P3-13 — Peso corporal e delta exibidos sem separador decimal do locale

**Arquivo:** `apps/mobile/src/ui/peso/presenters/buildPesoViewModel.ts:39,59,66`

`${registro.pesoKg} kg` e `abs.toFixed(1)` usam ponto sempre.

**Cenário:** pt-BR, registro 80.5kg → card mostra "80.5 kg" e delta "+0.5 kg" (deveria "80,5"/"+0,5" — o resto do app usa vírgula via `formatFixedDecimal`).

**Fix:** usar `formatFixedDecimal(n, locale, …)` de `i18n/formatters.ts`.

---

# Verificado e OK

- **Fórmula Epley**: JS e fragmento SQL idênticos (`carga*(1+reps/30)`), divisão em float (`30.0`) no SQL — sem truncamento inteiro; arredondamento de exibição `Math.round(x*10)/10` consistente.
- **`_avaliar` / `slice(0,2)`** (`SugerirProgressaoUseCase.ts:52`): `getHistoricoExercicio`/`getHistoricoExercicios` ordenam por `st.data_hora_fim DESC` (com re-sort estável pós-chunk em `SQLiteHistoricoRepository.ts:117-121`) → as 2 posições iniciais são de fato as 2 sessões mais recentes; exige série válida em ambas e todas as válidas ≥ meta; `cargaPadrao` é ratcheted automaticamente quando o usuário supera a carga com a meta de reps (`useSessaoAtivaController.novaCargaPadrao` espelhando `RegistrarSerieUseCase`), então `cargaPadrao + 2.5` não fica abaixo do praticado; séries `reps_only` (carga null) são filtradas em `groupBySession` → sem sugestão espúria de "2.5kg" para exercícios de peso corporal.
- **Plateau** (`buildHistoricoExercicioViewModel.ts:84-105`): janela = 4 execuções mais recentes **com séries válidas** (ignora sessões só-aquecimento), compara max da janela vs mais antiga com limiar 1.0kg — janela e semântica corretas; aquecimentos excluídos do 1RM.
- **Semana começa segunda-feira** consistentemente: `getMondayOfWeek` (dom→-6), labels `Seg..Dom`, headers do calendário Mon..Sun, `DIAS_SEMANA` — sem off-by-one domingo/segunda (exceto o caso UTC+13/14 do P3-10).
- **Plano semanal / dia de hoje** (`DiaSemana.ts:10-13`): `getDay()` local com map `['dom','seg',...]` correto (0=domingo); vira à meia-noite **local** — correto.
- **`sessoesUltimoMes`**: comparação lexicográfica de ISO strings com formato uniforme (`toISOString()` sempre) — válida.
- **Evolução por exercício** (`getEvolucaoExercicios`): `ORDER BY st.data_hora_inicio DESC` + corte nas 10 primeiras sessões distintas → 10 mais recentes de fato; reversão para ordem cronológica nos gráficos correta; delta `first vs last` calculado sobre a ordem ascendente correta.
- **`parseDecimalInput`**: vírgula e ponto aceitos; todos os call-sites validam com `Number.isFinite`/`Number.isInteger` antes de usar (registro de série, bi-set, cardio/hold/reps_only, treino, peso) — NaN não propaga para o banco.
- **Validações de domínio** (`SerieRegistrada.create`): reps inteiro ≥ 1 (0/negativo rejeitados), carga ≥ 0 (0 = peso corporal aceito), cardio/hold exigem duração ≥ 1s; `RegistroPeso.create` exige peso finito > 0. UI espelha as mesmas regras antes de submeter.
- **Tie-break de sessões com mesmo `data_hora_fim`** em `getUltimasExecucoesValidas`: determinístico via `MAX(id)` (coberto por teste) — o problema é só o caso de fins distintos (P0-1).
- **Formatters de data** (`i18n/formatters.ts`): recebem sempre ISO timestamps completos (nunca strings date-only) → `new Date(iso)` exibe em fuso local corretamente; nenhum uso de `new Date('YYYY-MM-DD')` (parsing UTC de date-only) encontrado no app.
- **Peso: ordenação e deltas**: `ORDER BY data_registro DESC` + delta contra o próximo da lista = comparação com o registro imediatamente anterior no tempo — correta (inclusive com datas retroativas via picker).
