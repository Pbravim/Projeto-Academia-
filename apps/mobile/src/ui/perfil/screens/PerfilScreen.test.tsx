import { createElement, type ReactNode } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

import { buildPesoViewModel } from '../../peso/presenters/buildPesoViewModel';

import { PerfilScreen } from './PerfilScreen';

/**
 * Smoke test de render: esta tela nunca era executada por teste. Cobre o
 * estado padrão (config fechada) e a abertura do painel de configurações,
 * onde vive o botão "Exportar histórico" (fatia #28).
 */

const host = vi.hoisted(
  () => (name: string) => (props: Record<string, unknown>) =>
    createElement(name, props, props.children as ReactNode),
);

vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Pressable: host('Pressable'),
  ScrollView: host('ScrollView'),
  ActivityIndicator: host('ActivityIndicator'),
  Image: host('Image'),
  KeyboardAvoidingView: host('KeyboardAvoidingView'),
  TextInput: host('TextInput'),
  Platform: { OS: 'ios' },
  useColorScheme: () => 'light',
  useWindowDimensions: () => ({ width: 375, height: 812 }),
  StyleSheet: { create: (s: unknown) => s },
}));

vi.mock('@react-native-community/datetimepicker', () => ({
  default: host('DateTimePicker'),
}));

vi.mock('react-native-svg', () => ({
  default: host('Svg'),
  Circle: host('Circle'),
  Defs: host('Defs'),
  LinearGradient: host('LinearGradient'),
  Path: host('Path'),
  Stop: host('Stop'),
}));

vi.mock('../../shared/theme', () => ({
  useTheme: () => new Proxy({}, { get: (_t, prop) => String(prop) }),
  useThemePreference: () => ({ preference: 'light', setPreference: vi.fn() }),
}));

vi.mock('../../shared/i18n', () => ({
  useT: () => (key: string) => key,
  useLocale: () => 'pt-BR',
  useLocalePreference: () => ({ preference: 'system', setPreference: vi.fn() }),
}));

vi.mock('../../shared/components/ConfirmDialog', () => ({ ConfirmDialog: host('ConfirmDialog') }));
vi.mock('../../shared/components/LanguagePickerModal', () => ({ LanguagePickerModal: host('LanguagePickerModal') }));

function baseProps(): Parameters<typeof PerfilScreen>[0] {
  return {
    perfil: {
      displayName: 'Ana',
      photoUri: null,
      onSaveName: vi.fn(async () => {}),
      onPickPhoto: vi.fn(),
    },
    peso: {
      viewModel: buildPesoViewModel([]),
      pesoKgInput: '',
      observacaoInput: '',
      selectedDate: new Date('2026-09-12T10:00:00.000Z'),
      errorMessage: null,
      feedbackMessage: null,
      isLoading: false,
      isSubmitting: false,
      deletingId: null,
      onChangePesoKg: vi.fn(),
      onChangeObservacao: vi.fn(),
      onChangeDate: vi.fn(),
      onSubmit: vi.fn(async () => {}),
      onDelete: vi.fn(async () => {}),
    },
    statsState: { stats: null, isLoading: false },
    isExporting: false,
    isResetting: false,
    isBackingUp: false,
    isImporting: false,
    onExportar: vi.fn(async () => {}),
    onReset: vi.fn(async () => {}),
    onBackup: vi.fn(async () => {}),
    onImport: vi.fn(),
  };
}

async function render(props: Parameters<typeof PerfilScreen>[0]): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(createElement(PerfilScreen, props));
  });
  return renderer;
}

/** Finds the nearest ancestor `Pressable` of a `Text` node whose children equal `text`. */
function findPressableByText(renderer: ReactTestRenderer, text: string) {
  const textNode = renderer.root.findAll((n) => n.type === 'Text' && n.props.children === text)[0];
  let node = textNode?.parent ?? null;
  while (node && node.type !== 'Pressable') node = node.parent;
  return node;
}

describe('PerfilScreen', () => {
  it('renderiza o nome do perfil com a configuração fechada', async () => {
    const renderer = await render(baseProps());
    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('Ana');
  });

  it('abre o painel de configurações e mostra o botão exportar histórico', async () => {
    const renderer = await render(baseProps());

    const gear = renderer.root.find((n) => n.props.accessibilityLabel === 'perfil.config.title');
    await act(async () => {
      gear.props.onPress();
    });

    const texts = renderer.root.findAllByType('Text').map((n) => n.props.children);
    expect(texts).toContain('perfil.config.exportarHistorico');
  });

  it('toca em exportar histórico chama onExportar', async () => {
    const props = baseProps();
    const renderer = await render(props);

    const gear = renderer.root.find((n) => n.props.accessibilityLabel === 'perfil.config.title');
    await act(async () => {
      gear.props.onPress();
    });

    const exportBtn = renderer.root
      .findAllByType('Pressable')
      .find((n) => {
        const child = n.props.children;
        return Array.isArray(child)
          ? false
          : child?.props?.children === 'perfil.config.exportarHistorico';
      });
    expect(exportBtn).toBeDefined();

    await act(async () => {
      exportBtn?.props.onPress();
    });

    expect(props.onExportar).toHaveBeenCalledTimes(1);
  });

  it('editar nome: tocar no nome, digitar e sair do campo salva', async () => {
    const props = baseProps();
    const renderer = await render(props);

    const nameRow = findPressableByText(renderer, 'Ana');
    await act(async () => { nameRow?.props.onPress(); });

    const input = renderer.root.findByType('TextInput');
    await act(async () => { input.props.onBlur(); });

    expect(props.perfil.onSaveName).toHaveBeenCalledTimes(1);
  });

  it('abrir configurações: trocar tema, abrir idioma e confirmar reset', async () => {
    const props = baseProps();
    const renderer = await render(props);

    const gear = renderer.root.find((n) => n.props.accessibilityLabel === 'perfil.config.title');
    await act(async () => { gear.props.onPress(); });

    const themeOption = renderer.root.find((n) => n.props.accessibilityLabel === 'perfil.config.temaOptions.escuro');
    await act(async () => { themeOption.props.onPress(); });

    const langModal = renderer.root.findByType('LanguagePickerModal');
    await act(async () => { (langModal.props as { onSelect: (l: string) => void }).onSelect('en-US'); });

    const resetBtn = findPressableByText(renderer, 'perfil.config.apagarHistorico');
    await act(async () => { resetBtn?.props.onPress(); });

    const resetDialog = renderer.root.findAllByType('ConfirmDialog').find((n) => n.props.confirmLabel === 'perfil.config.confirmApagarLabel');
    expect(resetDialog?.props.visible).toBe(true);
    await act(async () => { await (resetDialog?.props as { onConfirm: () => Promise<void> }).onConfirm(); });

    expect(props.onReset).toHaveBeenCalledTimes(1);
  });

  it('form de peso: abrir seção, registrar e excluir um registro', async () => {
    const props = baseProps();
    props.peso.viewModel = buildPesoViewModel([
      { id: 'r1', pesoKg: 80, dataRegistro: '2026-09-01T10:00:00.000Z', observacao: null },
      { id: 'r2', pesoKg: 78, dataRegistro: '2026-09-05T10:00:00.000Z', observacao: 'em jejum' },
    ]);
    const renderer = await render(props);

    const medicaoRow = findPressableByText(renderer, 'perfil.medidas.peso');
    await act(async () => { medicaoRow?.props.onPress(); });

    const submitBtn = findPressableByText(renderer, 'peso.form.registrar');
    await act(async () => { submitBtn?.props.onPress(); });
    expect(props.peso.onSubmit).toHaveBeenCalledTimes(1);

    const deleteBtn = findPressableByText(renderer, 'common.delete');
    await act(async () => { deleteBtn?.props.onPress(); });

    const deleteDialog = renderer.root.findAllByType('ConfirmDialog').find((n) => n.props.confirmLabel === 'common.delete');
    expect(deleteDialog?.props.visible).toBe(true);
    await act(async () => { await (deleteDialog?.props as { onConfirm: () => Promise<void> }).onConfirm(); });

    expect(props.peso.onDelete).toHaveBeenCalledWith('r1');
  });

  it('abrir date picker e mudar a data', async () => {
    const props = baseProps();
    const renderer = await render(props);

    const medicaoRow = findPressableByText(renderer, 'perfil.medidas.peso');
    await act(async () => { medicaoRow?.props.onPress(); });

    const dateBtn = findPressableByText(renderer, '📅');
    await act(async () => { dateBtn?.props.onPress(); });

    const picker = renderer.root.findByType('DateTimePicker');
    await act(async () => { (picker.props as { onChange: (e: unknown, d: Date) => void }).onChange({}, new Date('2026-09-10T10:00:00.000Z')); });

    expect(props.peso.onChangeDate).toHaveBeenCalled();
  });

  it('callbacks de estilo `pressed` de todos os Pressable não lançam', async () => {
    const props = baseProps();
    props.peso.viewModel = buildPesoViewModel([
      { id: 'r1', pesoKg: 80, dataRegistro: '2026-09-01T10:00:00.000Z', observacao: null },
    ]);
    props.statsState = {
      isLoading: false,
      stats: {
        totalSessoes: 10,
        sessoesUltimoMes: 3,
        aderenciaSemanal: [],
        aderenciaMensal: [],
        aderenciaAnual: [],
        evolucaoPorTreino: [{
          treinoId: 't1',
          treinoNome: 'Treino A',
          sessoes: [{ id: 's1', dataHoraInicio: '2026-09-01', dataHoraFim: '2026-09-01', duracaoMin: 40, volumeTotal: 500, melhorOrm: 80, arquivado: false }],
          sessoesArquivadas: [],
        }],
        recordesPessoais: [{ exercicioNome: 'Supino', melhorOrmKg: 90 }],
      },
    };
    const renderer = await render(props);

    const gear = renderer.root.find((n) => n.props.accessibilityLabel === 'perfil.config.title');
    await act(async () => { gear.props.onPress(); });
    const medicaoRow = findPressableByText(renderer, 'perfil.medidas.peso');
    await act(async () => { medicaoRow?.props.onPress(); });

    for (const pressable of renderer.root.findAllByType('Pressable')) {
      if (typeof pressable.props.style === 'function') {
        expect(() => pressable.props.style({ pressed: true })).not.toThrow();
        expect(() => pressable.props.style({ pressed: false })).not.toThrow();
      }
    }
  });
});
