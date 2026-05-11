# Plano — Feature Perfil

> Criado em `2026-05-11`.

## Objetivo

Criar um módulo **Perfil** que substitui a tab **Peso** na barra de navegação inferior. O Perfil exibe um cabeçalho com foto/avatar e nome editável, e embute toda a funcionalidade de acompanhamento de peso abaixo.

---

## Resultado esperado

### Navegação (tab bar)
```
Antes: Sessao | Treinos | Exercicios | Peso     | Evolucao
Depois: Sessao | Treinos | Exercicios | Evolucao | Perfil
```

### Tela de Perfil
```
┌─────────────────────────────────────┐
│  [Avatar circular — iniciais]        │
│  Nome do usuário          [editar]   │
│  ⚖ 82.5 kg  (último registro)       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Evolucao                            │
│  [Gráfico de linha — peso ao longo] │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Registrar peso                      │
│  [Formulário peso + data + obs]      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Historico                           │
│  [Lista de registros com delta]      │
└─────────────────────────────────────┘
```

---

## Arquivos a criar

### `src/ui/perfil/hooks/usePerfilController.ts`
- Lê e salva o `displayName` via `AsyncStorage` (chave `'perfil_nome'`)
- Expõe: `displayName`, `onSaveName(name: string) => Promise<void>`
- Sem dependências externas — sem new use case, sem nova tabela

### `src/ui/perfil/screens/PerfilScreen.tsx`
- Props: `perfil: PerfilControllerState` + `peso: PesoControllerState`
- Um único `ScrollView` com:
  1. **Hero card de perfil**: avatar circular (círculo com iniciais do nome, fundo `c.accent`), nome editável ao tap, badge com último peso registrado
  2. **Seção peso**: todo o conteúdo de `PesoScreen` inlined (gráfico, formulário, histórico) — sem `ScrollView` próprio

### `src/ui/perfil/PerfilFeature.tsx`
```tsx
export function PerfilFeature({ dependencies }) {
  const pesoController = usePesoController(dependencies.peso);
  const perfilController = usePerfilController();
  return <PerfilScreen peso={pesoController} perfil={perfilController} />;
}
```
- `dependencies.peso` é o mesmo objeto `mobileDependencies.peso` já existente

---

## Arquivos a modificar

### `src/app/MobileApp.tsx`
- `ActiveModule`: substituir `'peso'` por `'perfil'`
- Imports: remover `PesoFeature`, adicionar `PerfilFeature`
- Tab bar: substituir tab "Peso" por "Perfil" (mover Evolucao uma posição para a esquerda, Perfil no final)
- Render: `activeModule === 'perfil'` → `<PerfilFeature dependencies={{ peso: mobileDependencies.peso }} />`

### `src/bootstrap/mobileDependencies.ts`
- Nenhuma mudança necessária: `mobileDependencies.peso` continua existindo e será passado para `PerfilFeature`

---

## Detalhes de implementação

### Avatar
- Círculo com `width: 80, height: 80, borderRadius: 40`, `backgroundColor: c.accent`
- Iniciais: primeiras letras das primeiras duas palavras do `displayName` (ex: "Pedro Bravo" → "PB"), ou primeira letra se nome for uma palavra só
- Placeholder enquanto sem nome: ícone "👤" ou inicial "?"
- Sem câmera por enquanto — avatar é gerado, sem upload

### Nome editável
- Padrão: exibe o nome com botão de edição ao lado
- Ao tap: transforma em `TextInput` com `autoFocus`, confirma no `onBlur` ou `returnKey`
- Persiste em `AsyncStorage` com chave `'perfil_nome'`

### Badge de peso no hero
- Mostra o `viewModel.pesoAtual` de `PesoControllerState` (já calculado pelo presenter)
- Exemplo: "82.5 kg · hoje"
- Se não houver registro: não mostra nada

### PesoScreen → inlining
- Copiar o conteúdo JSX de `PesoScreen.tsx` para dentro de `PerfilScreen.tsx`, removendo o `ScrollView` wrapper externo
- `PesoScreen.tsx` e `PesoFeature.tsx` **não são deletados** — ficam no repositório, apenas deixam de ser usados pela navegação principal

---

## Ordem de execução

1. Criar `usePerfilController.ts`
2. Criar `PerfilScreen.tsx` (hero + peso inlined)
3. Criar `PerfilFeature.tsx`
4. Atualizar `MobileApp.tsx`
5. Verificar TypeScript: `npm --prefix apps/mobile run typecheck`
6. Testar no device: avatar, edição de nome, persistência, todos os flows de peso

---

## Fora de escopo (para depois)

- Upload de foto real (câmera / galeria)
- Estatísticas de perfil (total de sessões, treino favorito, etc.)
- Configurações de app na tela de perfil (tema já está na topbar)
