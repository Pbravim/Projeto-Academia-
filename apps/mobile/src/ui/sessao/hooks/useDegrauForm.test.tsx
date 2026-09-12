import { describe, expect, it, vi } from 'vitest';

import { act, renderHook } from '../../../test/renderHook';

import { parseDegrauInput, useDegrauForm } from './useDegrauForm';

vi.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'pt-BR' }] }));
vi.mock('expo-sqlite', () => ({}));

describe('parseDegrauInput', () => {
  it('input null, error null quando vazio (convite)', () => {
    expect(parseDegrauInput({ cargaText: '', repsText: '', descansoText: '' }, 'pt-BR')).toEqual({
      input: null,
      error: null,
    });
  });

  it('input válido a partir de carga e reps', () => {
    expect(parseDegrauInput({ cargaText: '50', repsText: '6', descansoText: '' }, 'pt-BR')).toEqual({
      input: { cargaKg: 50, repeticoes: 6, descansoSegundos: undefined },
      error: null,
    });
  });

  it('input null, error traduzido quando preenchido porém inválido (só carga)', () => {
    const result = parseDegrauInput({ cargaText: '50', repsText: '', descansoText: '' }, 'pt-BR');
    expect(result.input).toBeNull();
    expect(result.error).toBe('Carga e repetições do degrau inválidas');
  });

  it('input null, error traduzido quando reps é 0', () => {
    const result = parseDegrauInput({ cargaText: '50', repsText: '0', descansoText: '' }, 'pt-BR');
    expect(result.input).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it('descanso inválido também bloqueia', () => {
    const result = parseDegrauInput({ cargaText: '50', repsText: '6', descansoText: '-1' }, 'pt-BR');
    expect(result.input).toBeNull();
    expect(result.error).not.toBeNull();
  });
});

describe('useDegrauForm', () => {
  it('toInput returns null when the form is empty (convite, não obrigação)', async () => {
    const { result } = await renderHook(() => useDegrauForm('pt-BR'));
    expect(result.current.toInput()).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('toInput parses valid carga/reps and sets error to null', async () => {
    const { result } = await renderHook(() => useDegrauForm('pt-BR'));
    await act(async () => {
      result.current.setCargaText('50');
      result.current.setRepsText('6');
    });
    const input = result.current.toInput();
    expect(input).toEqual({ cargaKg: 50, repeticoes: 6, descansoSegundos: undefined });
  });

  it('toInput accepts a decimal carga with comma', async () => {
    const { result } = await renderHook(() => useDegrauForm('pt-BR'));
    await act(async () => {
      result.current.setCargaText('42,5');
      result.current.setRepsText('8');
    });
    expect(result.current.toInput()?.cargaKg).toBe(42.5);
  });

  it('toInput sets a translated error for invalid carga/reps', async () => {
    const { result } = await renderHook(() => useDegrauForm('pt-BR'));
    await act(async () => {
      result.current.setCargaText('abc');
      result.current.setRepsText('6');
    });
    let input: ReturnType<typeof result.current.toInput> = null;
    await act(async () => {
      input = result.current.toInput();
    });
    expect(input).toBeNull();
    expect(result.current.error).toBe('Carga e repetições do degrau inválidas');
  });

  it('toInput includes descansoSegundos when filled', async () => {
    const { result } = await renderHook(() => useDegrauForm('pt-BR'));
    await act(async () => {
      result.current.setCargaText('40');
      result.current.setRepsText('7');
      result.current.setDescansoText('15');
    });
    expect(result.current.toInput()).toEqual({ cargaKg: 40, repeticoes: 7, descansoSegundos: 15 });
  });

  it('prefillFrom sets reps from execucoesRecomendadas and leaves carga empty', async () => {
    const { result } = await renderHook(() => useDegrauForm('pt-BR'));
    await act(async () => {
      result.current.prefillFrom({ execucoesRecomendadas: 10 }, 'drop_set');
    });
    expect(result.current.cargaText).toBe('');
    expect(result.current.repsText).toBe('10');
    expect(result.current.descansoText).toBe('');
  });

  it('prefillFrom defaults reps to 8 and fills descanso 15s for rest_pause', async () => {
    const { result } = await renderHook(() => useDegrauForm('pt-BR'));
    await act(async () => {
      result.current.prefillFrom({ execucoesRecomendadas: null }, 'rest_pause');
    });
    expect(result.current.repsText).toBe('8');
    expect(result.current.descansoText).toBe('15');
  });

  it('reset clears the form back to defaults', async () => {
    const { result } = await renderHook(() => useDegrauForm('pt-BR'));
    await act(async () => {
      result.current.setCargaText('50');
      result.current.setRepsText('6');
    });
    await act(async () => {
      result.current.reset();
    });
    expect(result.current.cargaText).toBe('');
    expect(result.current.repsText).toBe('');
    expect(result.current.error).toBeNull();
  });
});
