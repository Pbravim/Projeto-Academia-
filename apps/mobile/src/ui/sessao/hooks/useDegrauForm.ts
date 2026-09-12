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

/**
 * Parse puro de um degrau — compartilhado entre `useDegrauForm` (um form por vez,
 * ex. "+ degrau" inline) e telas que precisam de N forms em paralelo (BiSet: um
 * Degrau 2 por exercício do grupo, onde usar o hook em loop não é viável).
 */
export function parseDegrauInput(fields: DegrauFormFields, locale: AppLocale): DegrauParseResult {
  const { cargaText, repsText, descansoText } = fields;

  // Carga vazia = convite recusado, mesmo com reps pré-preenchido pelo template
  // (`prefillFrom` deixa reps com o valor recomendado e a carga em branco — é a
  // carga que sinaliza "quero um degrau", nunca inferida).
  if (cargaText.trim() === '') {
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
}

export function useDegrauForm(locale: AppLocale): DegrauFormState {
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

  const toInput = (): DegrauFormInput | null => {
    const result = parseDegrauInput({ cargaText, repsText, descansoText }, locale);
    setError(result.error);
    return result.input;
  };

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
  };
}
