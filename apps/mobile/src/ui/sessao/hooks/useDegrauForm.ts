import { useState } from 'react';

import { parseDecimalInput } from '../../../shared/utils/parseDecimalInput';
import { type AppLocale, translate } from '../../shared/i18n/core';

export interface DegrauFormPrefill {
  cargaText?: string;
  repsText?: string;
  descansoText?: string;
}

export interface DegrauFormInput {
  cargaKg: number;
  repeticoes: number;
  descansoSegundos?: number;
}

export interface DegrauFormFields {
  cargaText: string;
  repsText: string;
  descansoText: string;
}

export interface DegrauParseResult {
  input: DegrauFormInput | null;
  /** Traduzido; `null` quando o formulário está vazio (convite, não erro). */
  error: string | null;
}

export interface DegrauParseOptions {
  /**
   * `true`: carga vazia sozinha já é convite, mesmo com reps preenchido — o Degrau 2
   * prescrito usa isso porque `prefillFrom` deixa reps com o valor do template e só a
   * carga em branco (é ela que sinaliza "quero o degrau", nunca inferida).
   * `false` (default): carga E reps vazios juntos são convite — o form inline "+ degrau"
   * abre sem prefill (`reset()`), então reps preenchido sozinho é entrada real do aluno
   * e deve reprovar (regressão do achado #1, r2: reps-só virava `null` sem `error`).
   */
  cargaVaziaEhConvite?: boolean;
}

/**
 * Parse puro de um degrau — compartilhado entre `useDegrauForm` (um form por vez,
 * ex. "+ degrau" inline) e telas que precisam de N forms em paralelo (BiSet: um
 * Degrau 2 por exercício do grupo, onde usar o hook em loop não é viável).
 */
export function parseDegrauInput(
  fields: DegrauFormFields,
  locale: AppLocale,
  options: DegrauParseOptions = {},
): DegrauParseResult {
  const { cargaText, repsText, descansoText } = fields;

  const vazio = options.cargaVaziaEhConvite
    ? cargaText.trim() === ''
    : cargaText.trim() === '' && repsText.trim() === '';
  if (vazio) {
    return { input: null, error: null };
  }

  const cargaKg = parseDecimalInput(cargaText);
  const repeticoes = parseInt(repsText, 10);
  if (!Number.isFinite(cargaKg) || cargaKg < 0 || !Number.isInteger(repeticoes) || repeticoes < 1) {
    return { input: null, error: translate(locale, 'sessao.degrau.erroInvalido') };
  }

  let descansoSegundos: number | undefined;
  if (descansoText.trim() !== '') {
    const descanso = parseInt(descansoText, 10);
    if (!Number.isInteger(descanso) || descanso < 0) {
      return { input: null, error: translate(locale, 'sessao.degrau.erroInvalido') };
    }
    descansoSegundos = descanso;
  }

  return { input: { cargaKg, repeticoes, descansoSegundos }, error: null };
}

export interface DegrauFormState {
  cargaText: string;
  repsText: string;
  descansoText: string;
  error: string | null;
  setCargaText: (value: string) => void;
  setRepsText: (value: string) => void;
  setDescansoText: (value: string) => void;
  /** Limpa o formulário, opcionalmente com valores pré-preenchidos. */
  reset: (prefill?: DegrauFormPrefill) => void;
  /** Pré-preenche o Degrau 2 prescrito: reps da sessão, carga vazia (sem inferir redução), descanso 15s se rest_pause. */
  prefillFrom: (sessaoExercicio: { execucoesRecomendadas: number | null }, metodo: string) => void;
  /** `null` quando o formulário está vazio (convite, não obrigação) ou inválido (seta `error`). */
  toInput: () => DegrauFormInput | null;
  /** Como `toInput`, mas devolve `{input, error}` inteiro — evita reparsear só para ler o erro (achado #3, r2). */
  parse: () => DegrauParseResult;
}

export function useDegrauForm(locale: AppLocale, options?: DegrauParseOptions): DegrauFormState {
  const [cargaText, setCargaText] = useState('');
  const [repsText, setRepsText] = useState('');
  const [descansoText, setDescansoText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = (prefill?: DegrauFormPrefill) => {
    setCargaText(prefill?.cargaText ?? '');
    setRepsText(prefill?.repsText ?? '');
    setDescansoText(prefill?.descansoText ?? '');
    setError(null);
  };

  const prefillFrom = (sessaoExercicio: { execucoesRecomendadas: number | null }, metodo: string) => {
    reset({
      repsText: String(sessaoExercicio.execucoesRecomendadas ?? 8),
      descansoText: metodo === 'rest_pause' ? '15' : '',
    });
  };

  const parse = (): DegrauParseResult => {
    const result = parseDegrauInput({ cargaText, repsText, descansoText }, locale, options);
    setError(result.error);
    return result;
  };

  const toInput = (): DegrauFormInput | null => parse().input;

  return {
    cargaText,
    repsText,
    descansoText,
    error,
    setCargaText,
    setRepsText,
    setDescansoText,
    reset,
    prefillFrom,
    toInput,
    parse,
  };
}
