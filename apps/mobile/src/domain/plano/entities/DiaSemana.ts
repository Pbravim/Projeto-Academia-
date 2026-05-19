export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export const DIAS_SEMANA: DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

export const DIA_LABEL: Record<DiaSemana, string> = {
  seg: 'SEG', ter: 'TER', qua: 'QUA', qui: 'QUI',
  sex: 'SEX', sab: 'SAB', dom: 'DOM',
};

export function diaSemanaHoje(): DiaSemana {
  const map: DiaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  return map[new Date().getDay()];
}
