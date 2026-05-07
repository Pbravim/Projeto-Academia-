import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { SQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/SQLiteDatabaseClient';

interface ExportarHistoricoDependencies {
  database: SQLiteDatabaseClient;
}

/** Gera CSV com todo o histórico de sessões finalizadas e abre o diálogo de compartilhamento. */
export class ExportarHistoricoUseCase {
  constructor(private readonly deps: ExportarHistoricoDependencies) {}

  async execute(): Promise<void> {
    const rows = await this.deps.database.getAll<{
      data_hora_inicio: string;
      treino_nome: string;
      exercicio_nome: string;
      serie_ordem: number;
      tipo_serie: string;
      carga_kg: number;
      repeticoes: number;
      observacao: string | null;
    }>(
      `SELECT
         st.data_hora_inicio,
         st.treino_nome_snapshot  AS treino_nome,
         se.nome_snapshot         AS exercicio_nome,
         sr.ordem                 AS serie_ordem,
         sr.tipo_serie,
         sr.carga_kg,
         sr.repeticoes,
         sr.observacao
       FROM sessao_treinos st
       JOIN sessao_exercicios se ON se.sessao_treino_id = st.id
       JOIN series_registradas sr ON sr.sessao_exercicio_id = se.id
       WHERE st.status = 'finalizada'
       ORDER BY st.data_hora_inicio DESC, se.ordem ASC, sr.ordem ASC`
    );

    if (rows.length === 0) throw new Error('Nenhum historico para exportar.');

    function esc(v: string) { return `"${v.replace(/"/g, '""')}"`; }

    const lines: string[] = ['Data,Treino,Exercicio,Serie,Tipo,Carga (kg),Repeticoes,Observacao'];
    for (const r of rows) {
      const data = new Date(r.data_hora_inicio).toLocaleDateString('pt-BR');
      lines.push([
        data,
        esc(r.treino_nome),
        esc(r.exercicio_nome),
        r.serie_ordem,
        r.tipo_serie,
        r.carga_kg,
        r.repeticoes,
        r.observacao ? esc(r.observacao) : '',
      ].join(','));
    }

    const csv = lines.join('\n');
    const file = new File(Paths.document, 'historico_treinos.csv');
    file.write(csv);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) throw new Error('Compartilhamento nao disponivel neste dispositivo.');

    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Exportar historico de treinos',
      UTI: 'public.comma-separated-values-text',
    });
  }
}
