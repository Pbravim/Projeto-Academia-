import type {
  ExercicioExport,
  HistoricoExportTree,
  SegmentoExport,
  SegmentoExportRow,
  SerieExport,
  SerieExportRow,
  SessaoExport,
  SubstituicaoExport,
} from './HistoricoExportTypes';

/** Agrupa as linhas flat (série + degraus) na árvore hierárquica sessão → exercício → série → segmentos. */
export function buildHistoricoExportTree(
  series: SerieExportRow[],
  segmentos: SegmentoExportRow[]
): HistoricoExportTree {
  const segmentosPorSerie = indexSegmentos(segmentos);

  const sessoes = new Map<string, SessaoExport>();
  const exerciciosPorSessao = new Map<string, Map<string, ExercicioExport>>();

  for (const row of series) {
    const sessao = sessoes.get(row.sessao_id) ?? toSessao(row);
    sessoes.set(row.sessao_id, sessao);

    const exerciciosDaSessao = exerciciosPorSessao.get(row.sessao_id) ?? new Map<string, ExercicioExport>();
    exerciciosPorSessao.set(row.sessao_id, exerciciosDaSessao);

    const exercicio = exerciciosDaSessao.get(row.sessao_exercicio_id) ?? toExercicio(row);
    exerciciosDaSessao.set(row.sessao_exercicio_id, exercicio);
    if (!sessao.exercicios.includes(exercicio)) sessao.exercicios.push(exercicio);

    exercicio.series.push(toSerie(row, segmentosPorSerie.get(row.serie_id) ?? []));
  }

  return { sessoes: [...sessoes.values()] };
}

function indexSegmentos(segmentos: SegmentoExportRow[]): Map<string, SegmentoExport[]> {
  const porSerie = new Map<string, SegmentoExport[]>();
  for (const s of segmentos) {
    const lista = porSerie.get(s.serie_id) ?? [];
    porSerie.set(s.serie_id, lista);
    lista.push({
      id: s.id,
      ordem: s.ordem,
      carga_kg: s.carga_kg,
      repeticoes: s.repeticoes,
      descanso_segundos: s.descanso_segundos,
    });
  }
  return porSerie;
}

function toSessao(row: SerieExportRow): SessaoExport {
  return {
    id: row.sessao_id,
    treino_id: row.treino_id,
    treino: row.treino_nome_snapshot,
    data_inicio: row.data_hora_inicio,
    data_fim: row.data_hora_fim,
    exercicios: [],
  };
}

function toExercicio(row: SerieExportRow): ExercicioExport {
  return {
    id: row.sessao_exercicio_id,
    ordem: row.exercicio_ordem,
    exercicio_id: row.exercicio_id,
    nome: row.nome_snapshot,
    grupo_muscular: row.grupo_muscular_snapshot,
    equipamento: row.equipamento_snapshot,
    tracking_type: row.tracking_type_snapshot,
    metodo: row.metodo,
    grupo_id: row.grupo_id,
    substituicao: toSubstituicao(row),
    series: [],
  };
}

function toSubstituicao(row: SerieExportRow): SubstituicaoExport | null {
  if (row.substituido_por_exercicio_id == null) return null;
  return {
    exercicio_id: row.substituido_por_exercicio_id,
    nome: row.nome_original_snapshot ?? '',
    motivo: row.substituicao_motivo,
  };
}

function toSerie(row: SerieExportRow, segmentos: SegmentoExport[]): SerieExport {
  return {
    id: row.serie_id,
    ordem: row.serie_ordem,
    carga_kg: row.carga_kg,
    repeticoes: row.repeticoes,
    duracao_s: row.duracao_segundos,
    distancia_m: row.distancia_metros,
    intensidade: row.intensidade,
    observacao: row.observacao,
    segmentos,
  };
}
