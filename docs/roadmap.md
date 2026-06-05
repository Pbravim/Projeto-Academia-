# Roadmap — Features Pendentes

> Atualizado em `2026-05-07` (sessão 3). Itens 1, 3, 4, 6, 7, 8 concluídos nesta sessão.

---

## Prioridade Alta

### Sub-projeto 5: Exercise Intelligence — modelo de exercício mais rico + substituição escalonada

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

### 1. Sincronização / Backup na nuvem

**O que:** backup do banco local em conta do usuário (iCloud / Google Drive / backend próprio)  
**Por que:** proteção contra perda de dados por troca de celular  
**Estratégia recomendada:** backup do arquivo SQLite completo como primeiro passo  
**Depende de:** expo-file-system + autenticação (Supabase ou Firebase Auth)

---

## Sugestões Futuras

Itens considerados valiosos mas sem prazo definido. Podem ser retomados se houver demanda.

**RIR / RPE por série** — campo opcional de esforço percebido (RIR 0–4 ou RPE 1–10) por série; impacto no schema: nova coluna em `series_registradas`

**Planejamento semanal** — definir quais treinos serão feitos em quais dias; requer novo modelo `PlanoSemanal` + `DiaTreino`

**Múltiplos perfis** — mais de uma pessoa usando o mesmo dispositivo; depende de `PerfilLocal` (já previsto no modelo de domínio original)

**Integração com HealthKit / Google Fit** — registrar treino concluído na saúde do dispositivo; depende de `expo-health` ou biblioteca nativa

---

## Fora do Escopo

Itens deliberadamente deixados de fora, revisáveis no futuro:

- Login e autenticação
- Backend próprio
- Versão web
- Edição de série já registrada (deletar e redigitar é suficiente por ora)
- Recursos sociais (compartilhar treino, seguir amigos)
- Integração com wearables (smartwatch, sensor de frequência cardíaca)
- Monetização
- Analytics de produto (Mixpanel, Amplitude)
- Fotos/vídeos de execução
