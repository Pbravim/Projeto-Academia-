# Mídia por Exercício — Funcionamento Completo

> Documento de referência para adicionar arquivos de mídia ao app.  
> Atualizado em `2026-05-07`.

---

## Visão Geral

Cada exercício pode ter **dois tipos de mídia**, independentes entre si:

| Campo | Coluna no banco | Descrição |
|---|---|---|
| **Online** | `exercises.media_online` | URL externa: YouTube, GIF hospedado, MP4 direto |
| **Local** | `exercises.media_local` | Caminho de arquivo no dispositivo |

O app usa `media_local` com prioridade sobre `media_online`. Se o arquivo local existir, ele é exibido offline; caso contrário, o app usa a URL online.

---

## Estrutura de Arquivos no Dispositivo

```
<documentDirectory>/
└── exercises/
    ├── exercise_id_1.gif          ← arquivo baixado ou copiado da galeria
    ├── exercise_id_2.mp4
    └── exercise_id_3.webp
```

`documentDirectory` é o diretório persistente do app (não apagado pelo sistema). No iOS é incluído no backup do iCloud automaticamente.

---

## Como Adicionar GIFs Bundled (Arquivos do Projeto)

Para que o usuário possa consumir GIFs embutidos no app **sem internet e sem baixar**, adicione os arquivos como assets do projeto e mapeie-os por `exercicioId` ou por nome normalizado.

### Passo 1 — Adicionar os arquivos

Coloque os GIFs em:

```
apps/mobile/assets/exercises/
├── supino-reto.gif
├── remada-curvada.gif
├── agachamento.gif
└── ...
```

### Passo 2 — Criar o mapa de assets bundled

Crie o arquivo:

```
apps/mobile/src/ui/exercises/assets/exerciseMediaAssets.ts
```

```typescript
// Cada chave é o normalized_name do exercício (lowercase, sem acentos)
export const EXERCISE_MEDIA_ASSETS: Record<string, ReturnType<typeof require>> = {
  'supino reto':        require('../../../assets/exercises/supino-reto.gif'),
  'remada curvada':     require('../../../assets/exercises/remada-curvada.gif'),
  'agachamento livre':  require('../../../assets/exercises/agachamento.gif'),
  // adicionar demais exercícios aqui
};
```

### Passo 3 — Usar o asset no viewer

No `ExerciseMediaViewer.tsx`, antes de usar `mediaLocal ?? mediaOnline`, consultar o mapa:

```typescript
import { EXERCISE_MEDIA_ASSETS } from '../assets/exerciseMediaAssets';

// Dentro do componente, calcular activeUri assim:
const bundledAsset = normalizedName ? EXERCISE_MEDIA_ASSETS[normalizedName] : null;
const activeUri = mediaLocal
  ?? (bundledAsset ? undefined : mediaOnline)  // se tem bundled, não usa online para imagem
  ?? mediaOnline;
const activeBundled = !mediaLocal && bundledAsset;
```

Para renderizar o asset bundled (require retorna número no React Native):

```tsx
{activeBundled ? (
  <Image source={bundledAsset} style={styles.image} resizeMode="contain" />
) : /* resto da lógica existente */ }
```

### Passo 4 — Passar `normalizedName` para o viewer

O `ExerciseMediaViewer` precisará receber `normalizedName?: string` como prop adicional. O catálogo já tem acesso a `exercise.normalizedName` no momento de chamar `setViewerExercise`.

---

## Fluxo de Download (URL Online → Arquivo Local)

```
Usuário toca "⬇ Mídias offline" no detalhe do treino
        ↓
BaixarMidiasTreinoUseCase.execute(treinoId)
  → lista TreinoExercicios
  → para cada exercício com media_online preenchido,
    sem media_local, e URL não-YouTube:
      → BaixarMidiaExercicioUseCase.execute(exercicioId)
          → GET <media_online>
          → salva em documents/exercises/<id>.<ext>
          → UPDATE exercises SET media_local = '<path>'
        ↓
Recarrega exercícios → media_local passa a ser usado
```

**URLs que não podem ser baixadas:**
- `youtube.com/...` — abre no browser nativo
- `youtu.be/...` — abre no browser nativo

**URLs que podem ser baixadas:**
- Qualquer URL direta terminando em `.gif`, `.mp4`, `.webp`, `.mov`, etc.
- CDNs de imagem/vídeo sem autenticação

---

## Fluxo de Seleção da Galeria

```
Usuário toca "📂 Selecionar da galeria" no formulário
        ↓
expo-image-picker (solicita permissão se necessário)
  videoQuality: Medium (~50% da qualidade original)
  videoMaxDuration: 30 segundos
        ↓
Se exercício JÁ TEM id (edição):
  → copia para documents/exercises/<id>_local.<ext>
  → salva caminho no draft.mediaLocal

Se exercício AINDA NÃO TEM id (criação):
  → salva temporariamente em documents/exercises/tmp_<timestamp>_local.<ext>
  → após createExercise retornar o id real:
      → move tmp → documents/exercises/<id>.<ext>
      → chama exerciseRepository.updateMedia(id, online, novoPath)
```

---

## Lógica de Exibição no Viewer

```
mediaLocal existe?
  ├── SIM → exibe arquivo local
  │         ├── extensão .gif/.jpg/.png/.webp → <Image> animado
  │         └── outros → expo-video com controles nativos
  └── NÃO → usa mediaOnline
              ├── youtube.com / youtu.be → botão "Abrir no YouTube"
              ├── extensão de imagem     → <Image>
              └── outros                 → expo-video
```

Badge exibido no rodapé do viewer:
- `📱 Salvo offline` — quando `mediaLocal` está preenchido
- `🌐 Online` — quando só tem `mediaOnline` e não é YouTube
- Sem badge — YouTube (pois não é exibido diretamente)

---

## Estado do Banco

```sql
-- Exercício só com URL online
SELECT name, media_online, media_local FROM exercises WHERE name = 'Supino reto';
-- 'Supino reto' | 'https://youtube.com/watch?v=xxx' | NULL

-- Exercício com arquivo baixado
SELECT name, media_online, media_local FROM exercises WHERE name = 'Remada Curvada';
-- 'Remada Curvada' | 'https://cdn.exemplo.com/remada.gif' | 'file:///data/.../exercises/ex-abc.gif'

-- Exercício com arquivo da galeria (sem URL online)
SELECT name, media_online, media_local FROM exercises WHERE name = 'Exercicio Custom';
-- 'Exercicio Custom' | NULL | 'file:///data/.../exercises/ex-xyz_local.mp4'
```

---

## Checklist para Adicionar GIFs Bundled

- [ ] Criar `apps/mobile/assets/exercises/` e colocar os arquivos `.gif`
- [ ] Criar `src/ui/exercises/assets/exerciseMediaAssets.ts` com o mapa
- [ ] Adicionar prop `normalizedName` ao `ExerciseMediaViewer`
- [ ] Atualizar lógica de `activeUri` no viewer para checar assets bundled primeiro
- [ ] Passar `exercise.normalizedName` ao chamar `setViewerExercise` no catálogo
- [ ] Testar: exercício com bundled GIF deve exibir sem internet e sem baixar
