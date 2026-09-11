import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * O shell do app: abas keep-alive, botão de perfil, back de hardware e os dois
 * efeitos de boot. Nada o executava — regressões aqui só apareciam no device.
 * Os módulos nativos e as 5 features viram stubs; o que é exercitado é a lógica
 * do shell.
 */

const state = vi.hoisted(() => ({
  backHandlers: [] as { event: string; handler: () => boolean }[],
  removeBack: vi.fn(),
  storage: new Map<string, string>(),
  isDev: true,
}));

/**
 * Componente-host simples: vira um nó com `type === nome` na árvore de teste.
 * Hoisted porque as fábricas de `vi.mock` rodam antes do corpo do arquivo
 * (`createElement` só é lido no render, quando já está inicializado).
 */
const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Image: host('Image'),
  Pressable: host('Pressable'),
  StyleSheet: { create: (s: unknown) => s },
  BackHandler: {
    addEventListener: vi.fn((event: string, handler: () => boolean) => {
      state.backHandlers.push({ event, handler });
      return { remove: state.removeBack };
    }),
  },
  useColorScheme: () => 'dark',
}));

vi.mock('expo-status-bar', () => ({ StatusBar: host('StatusBar') }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 40, bottom: 24, left: 0, right: 0 }),
}));

vi.mock('expo-sqlite/kv-store', () => ({
  Storage: { getItem: vi.fn(async (key: string) => state.storage.get(key) ?? null) },
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: Object.assign(host('Ionicons'), { glyphMap: {} }),
}));

const logger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
const baixarTodasMidias = vi.hoisted(() => ({ execute: vi.fn(async () => {}) }));

vi.mock('../bootstrap/mobileDependencies', () => ({
  mobileDependencies: {
    logger,
    baixarTodasMidias,
    backup: {},
    exerciseCatalog: { logger },
    plano: {},
    treinos: { list: {}, detail: {}, plano: {} },
    sessao: { feature: {}, ativa: {} },
    peso: {},
    dashboard: {},
  },
}));

const registerGlobalErrorHandler = vi.hoisted(() => vi.fn(() => vi.fn()));
vi.mock('../infrastructure/logging/registerGlobalErrorHandler', () => ({ registerGlobalErrorHandler }));

vi.mock('../ui/exercises/ExerciseCatalogFeature', () => ({ ExerciseCatalogFeature: host('ExerciseCatalogFeature') }));
vi.mock('../ui/perfil/PerfilFeature', () => ({ PerfilFeature: host('PerfilFeature') }));
vi.mock('../ui/treinos/TreinoFeature', () => ({ TreinoFeature: host('TreinoFeature') }));
vi.mock('../ui/sessao/SessaoFeature', () => ({ SessaoFeature: host('SessaoFeature') }));
vi.mock('../ui/dashboard/DashboardFeature', () => ({ DashboardFeature: host('DashboardFeature') }));

vi.mock('../ui/perfil/hooks/usePerfilController', () => ({
  PERFIL_NOME_KEY: '@perfil/nome',
  PERFIL_FOTO_KEY: '@perfil/foto',
}));

vi.mock('../ui/shared/theme', async () => {
  const react = await import('react');
  // Qualquer cor pedida devolve o próprio nome do token — StyleSheet é identidade.
  const colors = new Proxy({}, { get: (_t, prop) => String(prop) });
  return {
    ThemeContext: react.createContext(colors),
    useTheme: () => colors,
    useThemeProvider: () => colors,
  };
});

vi.mock('../ui/shared/i18n', () => ({
  LocaleProvider: ({ children }: { children: ReactNode }) => children,
  useT: () => (key: string) => key,
}));

import { MobileApp } from './MobileApp';

const FEATURES = {
  sessao: 'SessaoFeature',
  treinos: 'TreinoFeature',
  exercicios: 'ExerciseCatalogFeature',
  evolucao: 'DashboardFeature',
  perfil: 'PerfilFeature',
} as const;

let renderer: ReactTestRenderer;

async function render(): Promise<void> {
  await act(async () => {
    renderer = TestRenderer.create(createElement(MobileApp));
  });
  await act(async () => {});
}

const pressableByLabel = (label: string) =>
  renderer.root.find((n) => n.type === 'Pressable' && n.props.accessibilityLabel === label);

const press = async (label: string) => {
  await act(async () => {
    pressableByLabel(label).props.onPress();
  });
};

const mountedFeatures = () =>
  (Object.keys(FEATURES) as (keyof typeof FEATURES)[]).filter(
    (k) => renderer.root.findAll((n) => n.type === FEATURES[k]).length > 0,
  );

/**
 * Aba visível = montada e sem nenhum wrapper `display: 'none'` acima dela.
 * (keep-alive: as demais continuam na árvore, apenas ocultas)
 */
const visibleFeatures = () =>
  (Object.keys(FEATURES) as (keyof typeof FEATURES)[]).filter((k) => {
    if (renderer.root.findAll((n) => n.type === FEATURES[k]).length === 0) return false;
    const ocultas = renderer.root.findAll(
      (n) =>
        n.type === 'View' &&
        Array.isArray(n.props.style) &&
        (n.props.style as { display?: string }[]).some((s) => s?.display === 'none') &&
        n.findAll((child) => child.type === FEATURES[k]).length > 0,
    );
    return ocultas.length === 0;
  });

beforeEach(() => {
  state.backHandlers.length = 0;
  state.storage.clear();
  vi.clearAllMocks();
  vi.stubGlobal('__DEV__', true);
});

afterEach(async () => {
  await act(async () => {
    renderer?.unmount();
  });
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('MobileApp — boot', () => {
  it('instala o handler global de erro com o logger do app', async () => {
    await render();

    expect(registerGlobalErrorHandler).toHaveBeenCalledTimes(1);
    expect(registerGlobalErrorHandler).toHaveBeenCalledWith(logger);
  });

  it('adia o download de mídias em 3500ms (não compete com o boot)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await render();

    await act(async () => {
      vi.advanceTimersByTime(3499);
    });
    expect(baixarTodasMidias.execute).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(baixarTodasMidias.execute).toHaveBeenCalledTimes(1);
  });

  it('cancela o download adiado se o app desmontar antes dos 3500ms', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await render();

    await act(async () => {
      renderer.unmount();
    });
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(baixarTodasMidias.execute).not.toHaveBeenCalled();
  });

  it('abre na aba de sessão e monta só ela', async () => {
    await render();

    expect(mountedFeatures()).toEqual(['sessao']);
    expect(visibleFeatures()).toEqual(['sessao']);
  });
});

describe('MobileApp — identidade no topo', () => {
  it.each([
    ['João Pedro Silva', 'JP'],
    ['  ana   maria  ', 'AM'],
    ['Ana', 'A'],
    ['', '?'],
    ['   ', '?'],
  ])('nome %j vira as iniciais %j', async (nome, iniciais) => {
    state.storage.set('@perfil/nome', nome);
    await render();

    const botao = pressableByLabel('shell.profileLabel');
    expect(botao.findByType('Text').props.children).toBe(iniciais);
  });

  it('com foto salva mostra a imagem no lugar das iniciais', async () => {
    state.storage.set('@perfil/nome', 'Ana');
    state.storage.set('@perfil/foto', 'file:///docs/perfil.jpg');
    await render();

    const botao = pressableByLabel('shell.profileLabel');
    expect(botao.findByType('Image').props.source).toEqual({ uri: 'file:///docs/perfil.jpg' });
    expect(botao.findAll((n) => n.type === 'Text')).toHaveLength(0);
  });

  it('sem nome salvo o saudação não mostra o bloco do nome', async () => {
    await render();

    const textos = renderer.root.findAll((n) => n.type === 'Text').map((n) => n.props.children);
    expect(textos).toContainEqual(['shell.greeting', '']);
  });
});

describe('MobileApp — abas keep-alive', () => {
  it('trocar de aba monta a nova e MANTÉM a anterior montada (só oculta)', async () => {
    await render();

    await press('tabs.treinos');
    expect(mountedFeatures()).toEqual(['sessao', 'treinos']);
    expect(visibleFeatures()).toEqual(['treinos']);

    await press('tabs.evolucao');
    expect(mountedFeatures()).toEqual(['sessao', 'treinos', 'evolucao']);
    expect(visibleFeatures()).toEqual(['evolucao']);

    await press('tabs.sessao');
    expect(mountedFeatures()).toEqual(['sessao', 'treinos', 'evolucao']);
    expect(visibleFeatures()).toEqual(['sessao']);
  });

  it('marca acessibilidade só na aba ativa', async () => {
    await render();
    await press('tabs.exercicios');

    const selecionadas = renderer.root
      .findAll((n) => n.type === 'Pressable' && n.props.accessibilityState?.selected === true)
      .map((n) => n.props.accessibilityLabel);
    expect(selecionadas).toEqual(['tabs.exercicios']);
  });

  it('o botão de perfil abre e fecha o perfil voltando para a última aba', async () => {
    await render();
    await press('tabs.treinos');

    await press('shell.profileLabel');
    expect(visibleFeatures()).toEqual(['perfil']);

    await press('shell.profileLabel');
    expect(visibleFeatures()).toEqual(['treinos']);
  });
});

describe('MobileApp — back de hardware', () => {
  const back = () => state.backHandlers[0].handler;

  it('registra um único handler no mount (LIFO: fica no fundo da pilha)', async () => {
    await render();
    await press('tabs.treinos');
    await press('tabs.exercicios');

    expect(state.backHandlers).toHaveLength(1);
    expect(state.backHandlers[0].event).toBe('hardwareBackPress');
  });

  it('no perfil, consome o back e volta para a última aba', async () => {
    await render();
    await press('tabs.evolucao');
    await press('shell.profileLabel');

    let consumiu: boolean | undefined;
    await act(async () => {
      consumiu = back()();
    });

    expect(consumiu).toBe(true);
    expect(visibleFeatures()).toEqual(['evolucao']);
  });

  it('em produção, back na raiz de uma aba é devolvido ao SO (minimiza o app)', async () => {
    vi.stubGlobal('__DEV__', false);
    await render();

    expect(back()()).toBe(false);
    expect(visibleFeatures()).toEqual(['sessao']);
  });

  it('em DEV, back na raiz é consumido para o launcher do Expo Go não aparecer', async () => {
    vi.stubGlobal('__DEV__', true);
    await render();

    expect(back()()).toBe(true);
  });

  it('remove o handler ao desmontar', async () => {
    await render();
    await act(async () => {
      renderer.unmount();
    });

    expect(state.removeBack).toHaveBeenCalledTimes(1);
  });
});
