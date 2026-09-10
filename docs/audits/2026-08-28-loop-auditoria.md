# Auditoria em loop — 2026-08-28

> ## ⚠️ ERRATA (2026-09-09)
>
> A seção **"Débitos e falhas persistentes"** deste documento listava como abertos três
> itens que **já estavam fechados na data em que ela foi escrita**. Verificado item a item
> em 2026-09-09, contra o código:
>
> | Item listado como aberto | Situação real |
> |---|---|
> | "possível duplicidade da coluna `Serie` no CSV" | **Corrigido em 2026-06-20.** `RegistrarSerieUseCase` usava `COUNT(ativas)+1`, que reusava `ordem` após soft-delete; passou a usar `maxOrdemBySessaoExercicioId` (`MAX(ordem)` incluindo soft-deletadas). Com regressão. Ver `docs/pendencias.md`. |
> | "caso de histórico com uma única sessão" | **Não é bug — reclassificado em 2026-06-22** como UI/UX (o gráfico já tem guarda para 1 ponto). Movido para o roadmap, item "Melhorar UI/UX da visualização de sessões/exercícios já realizados". |
> | "loop O(N²) no repositório de histórico" | **Pendência obsoleta.** `InMemoryHistoricoRepository.getUltimasExecucoesValidas` (linhas 35-57) é uma passada única com `Map` — O(N). |
>
> Consequência: a conclusão "não foi atingido" continua **válida** (as vulnerabilidades de
> dependência são reais e seguem abertas), mas a justificativa por "bugs confirmados em uso
> real" **não se sustenta** — não havia bug de produto aberto. O que havia era débito
> **documental**: os documentos-índice não tinham sido atualizados quando as correções
> entraram.
>
> **Baseline de vulnerabilidades corrigido:** medido em 2026-09-09, `npm audit` reporta
> **49 vulnerabilidades (1 crítica, 20 high)**, não 44. A crítica é `tar`, puxada por
> `bcrypt@5 → @mapbox/node-pre-gyp`.
>
> Lição registrada: auditoria que lê documento-índice em vez de ler o código herda o atraso
> do índice. Item de débito só entra em auditoria depois de conferido na fonte.

## Escopo

Foram executadas cinco rodadas consecutivas de verificação, sem alteração de código:

- testes mobile: `npm run mobile:test` — 119 arquivos / 515 testes aprovados;
- testes unitários da API: `npm --prefix apps/api test -- --runInBand` — 12 suítes / 62 testes aprovados;
- typecheck mobile e API — aprovados;
- build da API — aprovado;
- auditoria de dependências — `npm audit --audit-level=critical --json`.

## Resultado das rodadas

| Rodada | Testes/typecheck/build | Auditoria de dependências | Resultado |
|---:|---|---|---|
| 1 | aprovado | 44 vulnerabilidades; 1 crítica | não limpa |
| 2 | aprovado | 44 vulnerabilidades; 1 crítica | não limpa |
| 3 | aprovado | 44 vulnerabilidades; 1 crítica | não limpa |
| 4 | aprovado | 44 vulnerabilidades; 1 crítica | não limpa |
| 5 | aprovado | 44 vulnerabilidades; 1 crítica | não limpa |

O Vitest emite ainda um warning sobre `vitest.config.ts` em CommonJS e o parâmetro `--reporter` usado na repetição gerou warning do npm; nenhum dos dois interrompeu os testes.

## Débitos e falhas persistentes

Os seguintes itens continuam documentados como abertos e impedem declarar cinco rodadas sem débito:

- vulnerabilidades de dependências: 44 no total, incluindo 1 crítica; a correção proposta pelo npm inclui upgrades major de Expo/NestJS e deve ser tratada em operação própria;
- bugs confirmados em uso real: caso de histórico com uma única sessão e possível duplicidade da coluna `Serie` no CSV;
- débitos P2 em `docs/pendencias.md`, incluindo cobertura insuficiente, loop O(N²) no repositório de histórico, telas grandes e TODO em `SugerirTreinoUseCase`;
- documentação divergente entre `AUDIT.md`, `docs/estado-atual.md`, `docs/pendencias.md` e auditorias anteriores.

## Decisão

O critério solicitado — cinco runs consecutivas sem falha ou débito técnico — **não foi atingido**. Conforme o escopo, nenhuma correção de código, dependência ou configuração foi aplicada; este arquivo é o único registro novo desta execução.

Próximo passo necessário para obter rodadas limpas: autorização explícita para tratar os débitos acima, especialmente a vulnerabilidade crítica e os bugs confirmados.
