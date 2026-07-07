# Plano — Auditoria Rodada 3: corretude, bugs, mistakes e integridade

> Rodadas 1–2 (docs/audits/2026-07-06-auditoria-perf-techdebt.md) cobriram
> performance, dívida de código e arquitetura — e seus P0/P1 já foram corrigidos.
> Esta rodada muda a lente: **o app faz a coisa CERTA?** (corretude de domínio,
> integridade de dados, conflitos de sync, segurança, UX quebrada e qualidade
> real dos testes). Executar com 6 agentes paralelos read-only + 1 fase de
> verificação adversarial antes de reportar.

## Critério de priorização do relatório final
P0 = corrompe/perde dados do usuário ou dá resultado errado silencioso;
P1 = quebra visível com caminho de reprodução; P2 = risco latente/robustez;
P3 = higiene. Cada achado exige: arquivo:linha, cenário concreto de falha
(inputs → resultado errado) e sugestão de fix em 1 linha. Achado sem cenário
reproduzível não entra.

## Fase 1 — 6 varreduras paralelas (agentes read-only)

### A. Corretude de domínio (cálculos e regras)
- Fórmulas: 1RM Epley (`estimativa1rmSql`), volume/tonelagem, deltas de peso,
  aderência semanal/mensal/anual (semana começa em?, timezone!), sugestão de
  progressão (`_avaliar` slice(0,2) — ordena por quê?), plateau (janela).
- **Datas/fuso**: tudo é ISO-UTC no banco mas exibido local — procurar
  comparações de "mesmo dia"/"este mês" feitas em UTC (dashboard `date()`,
  `strftime('%Y-%m')`, aderência, "Hoje/Ontem" da sessão) → treino às 21h
  BRT cai no dia seguinte? DST? `new Date(iso)` vs date-only strings.
- Parsing decimal (`parseDecimalInput` vírgula/ponto), arredondamentos de carga
  (kgIndexFor, incrementos 0.5), limites (reps 0/negativo, carga 0 válida?).
- Plano semanal: dia da semana calculado como (getDay? ISO?) — domingo/segunda.

### B. Integridade de dados (SQLite)
- Escrever queries de invariantes e RODAR contra um DB montado com o db-setup:
  órfãos (series sem sessao_exercicio vivo, sessao_exercicios sem sessao),
  `ordem` duplicada viva por sessao_exercicio, tombstone com filhos vivos,
  dirty=1 preso em linha deletada, exercises.normalized_name vs normalizeText
  divergente, alternativas apontando para tombstone.
- Replay de migrações: teste v0→v23 encadeado (better-sqlite3) com dados de
  cada versão intermediária (o rebuild v22 preserva? FKs pós-v23 íntegras?).
- Cascatas: deletar treino/exercício/sessão — o que órfã? resetHistorico limpa tudo?

### C. Sync & conflitos (mobile↔API)
- LWW: updated_at empatado, clock skew do device, tombstone vs edição
  concorrente, cursor: perda de mudanças entre getDirty e resposta (janela em
  que uma escrita local nova vira dirty durante o sync — o clear do dirty
  apaga ela sem enviar?** suspeita forte**), retry duplicando envio (idempotência).
- Contrato: campos novos do mobile (tracking_type etc.) presentes no Prisma/
  contracts? seeds/catalog sync: is_custom=0 não sincroniza — alternativas de
  custom→catalog sobrevivem no outro device?
- AuthSession: refresh expirado durante sync em background; token clear vs fila.

### D. Segurança & robustez de entrada
- SQL: alguma query montada por interpolação/template em vez de placeholder?
  (grep `${` dentro de strings SQL; IN(...) dinâmico do chunking).
- API Nest: validação de DTOs (class-validator?), ownership checks por rota,
  rate limit ausente, erros vazando stack; JWT expiry/refresh rotation.
- Mobile: URLs de mídia (SSRF-ish no download? file:// injection no viewer),
  import de backup .db (valida schema antes de substituir?), logs com dados
  sensíveis (email/token no ConsoleAppLogger?).

### E. UX mistakes & estados
- Double-submit (botões sem disabled durante await — grep onPress com async
  sem isSubmitting), estados vazios/erro ausentes por tela, feedback de erro
  que some sozinho vs persiste, gestos: BackHandler em modais/sheets,
  teclado cobrindo inputs (telas sem KeyboardAvoiding), a11y: labels ausentes
  em Pressables de ícone, contraste dos temas.
- Race de navegação: trocar de aba durante submit; keep-alive novo — efeitos
  que assumiam remount (dados stale ao voltar? dashboard desatualizado após
  finalizar sessão em outra aba!** suspeita forte pós-keep-alive**).

### F. Qualidade real dos testes + CI
- Testes que não falham: rodar mutação manual em 5 use cases críticos
  (inverter uma condição → suite continua verde? = assert fraco).
- Buracos conhecidos (rodada 2): ExpoSQLiteDatabaseClient (migrações),
  SqliteDashboardRepository, SyncApiClient, useBackupSync — escrever os 4.
- CI: workflows rodam tsc+vitest do mobile? validate-exercise-seeds só? API
  testada no CI? Node/lockfile pinados?

## Fase 2 — Verificação adversarial
Para cada achado P0/P1 da Fase 1: um verificador independente tenta REFUTAR
(reproduzir o cenário via teste ou leitura completa do fluxo). Só CONFIRMED
entra no relatório; PLAUSIBLE vira P2 com nota. (2 suspeitas fortes já
plantadas: janela do dirty-clear no sync [C] e dashboard stale pós-keep-alive [E].)

## Fase 3 — Relatório & execução
- Consolidar em docs/audits/2026-07-06-auditoria-rodada3.md (mesmo formato
  P0–P3 das rodadas anteriores + seção "verificado e OK" para não re-auditar).
- Corrigir na ordem: P0 (com teste de regressão TDD cada) → P1 → decidir P2/P3
  com o usuário. Commits atômicos por tema; suite verde em cada um.
- Atualizar pendencias.md (defasado desde 2026-06-20) e memória do projeto.

## Fora de escopo desta rodada
GIFs→CDN (aguarda hospedagem), telas-deus refactor (P2 rodada 1), listLite/
pré-filtro SQL substitutos (pendentes rodada 2), i18n de nomes de exercício.
