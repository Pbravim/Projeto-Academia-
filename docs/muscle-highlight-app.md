# 🏋️ Muscle Highlight App — Documentação Técnica

> Documentação para desenvolvimento de aplicativo interativo de anatomia muscular 3D,
> com destaque de músculos por exercício. Gerada a partir do projeto Blender existente.

---

## 1. Visão Geral do Projeto

O objetivo é transformar um modelo anatômico 3D desenvolvido no Blender (com texturas
individuais por músculo) em uma aplicação interativa onde o usuário pode:

- Visualizar o corpo humano em 3D com rotação e zoom
- Ver quais músculos são ativados em cada exercício (ex: supino → peito em vermelho)
- Clicar em músculos para obter informações detalhadas
- Assistir animações dos exercícios
- Navegar por diferentes exercícios e grupos musculares

---

## 2. Pipeline: Blender → App

```
Blender (.blend)
    │
    ├── Exportar modelo: File > Export > glTF 2.0 (.glb)
    │       ├── Include: Meshes, Materials, Animations
    │       ├── Transform: +Y Up
    │       └── Compression: Draco (reduz ~70% o tamanho)
    │
    └── Output: human_model.glb
            │
            └── React App (Three.js / React Three Fiber)
                    ├── Carrega o .glb
                    ├── Aplica highlight por músculo via material override
                    └── Exibe UI interativa
```

### 2.1 Configurações de Exportação no Blender

| Opção | Valor |
|---|---|
| Format | glTF Binary (.glb) |
| Include Selected Objects | Conforme necessário |
| Meshes | ✅ Ativado |
| Materials | ✅ Ativado |
| Animations | ✅ Ativado |
| Draco mesh compression | ✅ Recomendado |
| Y Up | ✅ Ativado |

### 2.2 Nomenclatura dos Objetos no Blender

Para que o app consiga identificar cada músculo programaticamente, **os objetos
no Blender devem seguir um padrão de nome consistente**:

```
Pectoralis_Major_Sternocostal
Pectoralis_Major_Clavicular
Deltoid_Anterior
Deltoid_Medial
Triceps_Brachii_Long
...
```

Esse nome vira o identificador no JSON de exercícios (ver Seção 4).

---

## 3. Stack Tecnológica Recomendada

### 3.1 Web App (Plataforma Principal)

```
Frontend
├── React 18+
├── React Three Fiber (wrapper Three.js para React)
├── @react-three/drei (helpers: OrbitControls, useGLTF, etc.)
├── Tailwind CSS (estilização)
└── Zustand (gerenciamento de estado global)

Build
└── Vite

Deploy
└── Vercel / Netlify
```

### 3.2 Mobile (Fase Futura)

```
React Native + Expo
└── expo-gl + three.js (renderização 3D)
    ou
└── React Native WebView (embute a versão web)
```

### 3.3 Instalação do Projeto

```bash
npm create vite@latest muscle-app -- --template react
cd muscle-app
npm install three @react-three/fiber @react-three/drei zustand
npm install tailwindcss @tailwindcss/vite
```

---

## 4. Estrutura de Dados — Exercícios e Músculos

Criar um arquivo `src/data/exercises.json` com o mapeamento de exercícios para músculos:

```json
{
  "exercises": [
    {
      "id": "bench_press",
      "name": "Supino Reto com Barra",
      "category": "Peito",
      "animationClip": "BenchPress",
      "muscles": {
        "primary": [
          "Pectoralis_Major_Sternocostal",
          "Pectoralis_Major_Clavicular"
        ],
        "secondary": [
          "Deltoid_Anterior",
          "Triceps_Brachii_Long",
          "Triceps_Brachii_Lateral"
        ],
        "stabilizer": [
          "Serratus_Anterior",
          "Biceps_Brachii_Short"
        ]
      },
      "description": "Exercício composto para desenvolvimento do peitoral maior.",
      "execution": [
        "Deite no banco com os pés apoiados no chão",
        "Segure a barra com pegada levemente mais larga que os ombros",
        "Desça a barra controladamente até o peito",
        "Empurre a barra para cima até extensão completa dos braços"
      ]
    },
    {
      "id": "incline_press",
      "name": "Supino Inclinado",
      "category": "Peito",
      "animationClip": "InclinePress",
      "muscles": {
        "primary": [
          "Pectoralis_Major_Clavicular"
        ],
        "secondary": [
          "Deltoid_Anterior",
          "Triceps_Brachii_Long"
        ],
        "stabilizer": []
      }
    }
  ]
}
```

### 4.1 Schema de Cores por Tipo de Ativação

```javascript
// src/constants/muscleColors.js
export const MUSCLE_COLORS = {
  primary:    { color: '#FF2222', emissive: '#AA0000', intensity: 1.0 },
  secondary:  { color: '#FF8800', emissive: '#884400', intensity: 0.7 },
  stabilizer: { color: '#FFDD00', emissive: '#886600', intensity: 0.4 },
  inactive:   { color: '#AAAAAA', emissive: '#000000', intensity: 0.0 },
};
```

---

## 5. Arquitetura de Componentes

```
src/
├── App.jsx
├── components/
│   ├── Scene/
│   │   ├── Scene.jsx           ← Canvas Three.js principal
│   │   ├── HumanModel.jsx      ← Carrega e renderiza o .glb
│   │   ├── MuscleHighlight.jsx ← Lógica de highlight por músculo
│   │   └── CameraControls.jsx  ← OrbitControls configurado
│   ├── UI/
│   │   ├── ExercisePanel.jsx   ← Lista de exercícios
│   │   ├── MuscleInfo.jsx      ← Painel de info ao clicar músculo
│   │   ├── LegendPanel.jsx     ← Legenda de cores (primário/secundário)
│   │   └── AnimationControls.jsx ← Play/pause da animação
│   └── Layout/
│       └── AppLayout.jsx
├── data/
│   └── exercises.json
├── stores/
│   └── exerciseStore.js        ← Estado global (Zustand)
├── constants/
│   └── muscleColors.js
└── assets/
    └── models/
        └── human_model.glb
```

---

## 6. Implementação — Componentes Principais

### 6.1 Store de Estado (Zustand)

```javascript
// src/stores/exerciseStore.js
import { create } from 'zustand';
import exercises from '../data/exercises.json';

export const useExerciseStore = create((set) => ({
  exercises: exercises.exercises,
  selectedExercise: null,
  selectedMuscle: null,
  isPlaying: false,

  selectExercise: (exerciseId) => set({
    selectedExercise: exercises.exercises.find(e => e.id === exerciseId),
    selectedMuscle: null,
  }),
  selectMuscle: (muscleName) => set({ selectedMuscle: muscleName }),
  toggleAnimation: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));
```

### 6.2 Componente HumanModel

```jsx
// src/components/Scene/HumanModel.jsx
import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useExerciseStore } from '../../stores/exerciseStore';
import { MUSCLE_COLORS } from '../../constants/muscleColors';
import * as THREE from 'three';

export function HumanModel({ url = '/models/human_model.glb' }) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);
  const { selectedExercise, isPlaying, selectMuscle } = useExerciseStore();

  // Aplicar highlight quando o exercício muda
  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (!child.isMesh) return;

      const muscleName = child.name;
      let colorConfig = MUSCLE_COLORS.inactive;

      if (selectedExercise) {
        const { muscles } = selectedExercise;
        if (muscles.primary.includes(muscleName)) {
          colorConfig = MUSCLE_COLORS.primary;
        } else if (muscles.secondary.includes(muscleName)) {
          colorConfig = MUSCLE_COLORS.secondary;
        } else if (muscles.stabilizer.includes(muscleName)) {
          colorConfig = MUSCLE_COLORS.stabilizer;
        }
      }

      // Aplicar material sem destruir o original
      if (!child.userData.originalMaterial) {
        child.userData.originalMaterial = child.material.clone();
      }
      child.material = child.userData.originalMaterial.clone();
      child.material.color = new THREE.Color(colorConfig.color);
      child.material.emissive = new THREE.Color(colorConfig.emissive);
      child.material.emissiveIntensity = colorConfig.intensity;
    });
  }, [selectedExercise, scene]);

  // Controle de animação
  useEffect(() => {
    if (!selectedExercise || !actions) return;
    const clip = actions[selectedExercise.animationClip];
    if (!clip) return;

    if (isPlaying) {
      clip.reset().play();
    } else {
      clip.stop();
    }
  }, [isPlaying, selectedExercise, actions]);

  // Click para selecionar músculo
  const handleClick = (e) => {
    e.stopPropagation();
    selectMuscle(e.object.name);
  };

  return (
    <group ref={group}>
      <primitive object={scene} onClick={handleClick} />
    </group>
  );
}

useGLTF.preload('/models/human_model.glb');
```

### 6.3 Cena Principal

```jsx
// src/components/Scene/Scene.jsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { HumanModel } from './HumanModel';
import { Suspense } from 'react';

export function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 1, 3], fov: 45 }}
      style={{ background: '#1a1a2e' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
        <Environment preset="studio" />
        <HumanModel />
        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.4}
          scale={4}
          blur={2}
        />
        <OrbitControls
          minDistance={1}
          maxDistance={6}
          enablePan={false}
          target={[0, 0.5, 0]}
        />
      </Suspense>
    </Canvas>
  );
}
```

### 6.4 Painel de Exercícios

```jsx
// src/components/UI/ExercisePanel.jsx
import { useExerciseStore } from '../../stores/exerciseStore';

export function ExercisePanel() {
  const { exercises, selectedExercise, selectExercise } = useExerciseStore();

  const grouped = exercises.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {});

  return (
    <div className="w-64 bg-gray-900 text-white p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Exercícios</h2>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mb-4">
          <h3 className="text-sm text-gray-400 uppercase mb-2">{category}</h3>
          {items.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => selectExercise(exercise.id)}
              className={`w-full text-left px-3 py-2 rounded mb-1 text-sm transition-colors
                ${selectedExercise?.id === exercise.id
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              {exercise.name}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

## 7. Estratégia de Highlight de Músculos (Origem: Blender)

### 7.1 Abordagem: Material Override por Mesh

Cada músculo é um **objeto/mesh separado** no modelo `.glb`, com seu próprio material.
O app sobrescreve a cor do material em runtime sem destruir o material original:

```
Músculo inativo    → cinza   (#AAAAAA)
Músculo primário   → vermelho (#FF2222) ← ex: peitoral no supino
Músculo secundário → laranja  (#FF8800) ← ex: deltóide anterior
Estabilizador      → amarelo  (#FFDD00) ← ex: serrátil anterior
```

### 7.2 Preservação do Material Original

O material original é salvo em `child.userData.originalMaterial` na primeira
renderização. Ao trocar de exercício, o app clona o original e aplica as novas cores,
nunca modificando o material base diretamente.

### 7.3 Transição Animada (Opcional — Fase 2)

```javascript
const lerpColor = (from, to, t) => new THREE.Color().lerpColors(
  new THREE.Color(from),
  new THREE.Color(to),
  t
);
```

---

## 8. Funcionalidades — Roadmap

### Fase 1 — MVP
- [ ] Modelo 3D carregando no browser
- [ ] Rotação/zoom do modelo
- [ ] Lista de exercícios (sidebar)
- [ ] Highlight de músculos primários ao selecionar exercício
- [ ] Nome do músculo ao passar o mouse (tooltip)

### Fase 2 — Interatividade
- [ ] Destaque de músculos secundários e estabilizadores (com cores diferentes)
- [ ] Painel de info ao clicar em músculo (nome, função, origem, inserção)
- [ ] Player de animação (play/pause/speed)
- [ ] Legenda de cores

### Fase 3 — Conteúdo
- [ ] Banco de dados de exercícios (20+ exercícios)
- [ ] Filtro por grupo muscular
- [ ] Comparação de exercícios lado a lado
- [ ] Modo "quiz": adivinhar o músculo destacado

### Fase 4 — Mobile/AR
- [ ] Versão PWA (funciona como app no celular)
- [ ] React Native com WebView
- [ ] Realidade Aumentada via WebXR (opcional)

---

## 9. Performance e Otimizações

### 9.1 Tamanho do Modelo

| Técnica | Redução Esperada |
|---|---|
| Draco Compression (no export) | ~60–70% |
| Reduzir polígonos no Blender (Decimate) | ~30–50% |
| LOD (Level of Detail) | ~40% em runtime |
| Lazy loading de texturas | Melhora tempo inicial |

### 9.2 Configurações Recomendadas no Blender antes do Export

- Aplicar `Decimate Modifier` nos músculos menores (ratio ~0.5)
- Limitar texturas a no máximo 1024×1024px
- Usar `Join` em músculos com mais de um objeto idêntico

### 9.3 No App

```javascript
// @react-three/drei já lida com Draco automaticamente no useGLTF
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
```

---

## 10. Estrutura de Pastas do Projeto Final

```
muscle-app/
├── public/
│   └── models/
│       └── human_model.glb       ← Modelo exportado do Blender
├── src/
│   ├── App.jsx
│   ├── components/
│   │   ├── Scene/
│   │   │   ├── Scene.jsx
│   │   │   ├── HumanModel.jsx
│   │   │   └── CameraControls.jsx
│   │   └── UI/
│   │       ├── ExercisePanel.jsx
│   │       ├── MuscleInfo.jsx
│   │       ├── LegendPanel.jsx
│   │       └── AnimationControls.jsx
│   ├── data/
│   │   └── exercises.json
│   ├── stores/
│   │   └── exerciseStore.js
│   └── constants/
│       └── muscleColors.js
├── package.json
└── vite.config.js
```

---

## 11. Dependências (package.json)

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "three": "^0.165.0",
    "@react-three/fiber": "^8.16.0",
    "@react-three/drei": "^9.105.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 12. Checklist para Repassar ao Claude Code

Quando for trabalhar com o Claude Code, forneça este contexto:

1. **Projeto existente:** App React com Vite já criado
2. **Modelo 3D:** arquivo `.glb` exportado do Blender (modelo anatômico humano)
3. **Cada músculo é um mesh separado** com nome padronizado (ex: `Pectoralis_Major_Sternocostal`)
4. **Objetivo:** ao selecionar um exercício, o mesh do músculo correspondente muda de cor (cinza → vermelho)
5. **Animações:** o `.glb` contém clips de animação nomeados por exercício
6. **Stack:** React + React Three Fiber + Zustand + Tailwind
7. **Dados:** arquivo `exercises.json` com mapeamento exercício → array de nomes de músculos

**Prompt sugerido para o Claude Code:**

> "Tenho um app React com Vite. Preciso implementar um visualizador 3D de anatomia muscular
> usando React Three Fiber. O modelo é um .glb com cada músculo como mesh separado.
> Ao selecionar um exercício de uma lista lateral, os músculos correspondentes devem
> mudar de cor (cinza para vermelho/laranja conforme ativação primária ou secundária).
> O modelo também tem animações. Usa Zustand para estado e Tailwind para UI.
> Segue a documentação do projeto: [colar este arquivo]"

---

*Documentação gerada em junho/2026 — Projeto: Supino Reto com Barra / Anatomia Muscular 3D*
