export const ptBR = {
  common: {
    cancel: 'Cancelar', back: 'Voltar', confirm: 'Confirmar', save: 'Salvar',
    delete: 'Excluir', archive: 'Arquivar', restore: 'Restaurar', ok: 'OK',
    error: 'Erro', loading: 'Carregando...',
    seriesCount: { one: '%{count} série', other: '%{count} séries' },
    onlyInPt: 'só em pt',
  },
  tabs: { sessao: 'Sessão', treinos: 'Treinos', exercicios: 'Exercícios', evolucao: 'Evolução' },
  shell: { greeting: 'Bem-vindo', profileLabel: 'Perfil' },
  sessionSeriesTable: { emptyState: 'Sem séries válidas' },
  aderencia: {
    title: 'Aderência',
    subtitle: { semanal: 'Semana atual', mensal: 'Mês atual', anual: 'Ano atual' },
    mode: { semanal: 'Semanal', mensal: 'Mensal', anual: 'Anual' },
    footerUnit: { meses: 'meses ativos', dias: 'dias ativos' },
    footer: { treinos: 'treinos' },
    weekday: { mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sab', sun: 'Dom' },
  },
} as const;
