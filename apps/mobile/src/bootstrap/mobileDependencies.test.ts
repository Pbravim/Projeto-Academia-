import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';


/**
 * O grafo de injeção do app inteiro. Nada o executava — se um construtor
 * mudasse de assinatura ou um fio saísse do lugar, o app só quebrava em runtime.
 * Estes testes montam o grafo de verdade (use cases e repositórios reais) sobre
 * um SQLite e um keychain falsos, e exercitam a fiação que o app consome.
 */

const SEED_KEY = '@seed/catalog-signature';
const CURSOR_KEY = '@sync/cursor';
const ACCOUNT_KEY = '@sync/account';
const SCHEMA_VERSION = 12;

const TOKENS = {
  email: 'aluno@academia.app',
  accessToken: 'access-opaco', // sem pontos: AuthSession não tenta ler `exp`.
  refreshToken: 'refresh-opaco',
};

const state = vi.hoisted(() => ({
  settings: new Map<string, string>(),
  runs: [] as { sql: string; params: readonly unknown[] }[],
  secure: new Map<string, string>(),
  appStateHandlers: [] as { event: string; handler: (s: string) => void }[],
  schemaVersion: 12,
  /** Linhas devolvidas por `getAll` — os adaptadores inline leem daqui. */
  rows: [] as unknown[],
}));

const databaseClient = vi.hoisted(() => {
  const self = {
    databaseFileName: 'academia.db',
    supportedSchemaVersion: 99,
    exec: vi.fn(async () => {}),
    run: vi.fn(async (sql: string, params: readonly unknown[] = []) => {
      state.runs.push({ sql, params });
    }),
    runWithChanges: vi.fn(async () => 0),
    getFirst: vi.fn(async (sql: string, params: readonly unknown[] = []) => {
      if (sql.includes('PRAGMA user_version')) return { user_version: state.schemaVersion };
      if (sql.includes('FROM settings')) {
        const value = state.settings.get(String(params[0]));
        return value === undefined ? null : { value };
      }
      return null;
    }),
    getAll: vi.fn(async (sql: string, params: readonly unknown[] = []) => {
      state.runs.push({ sql, params });
      return state.rows;
    }),
    withTransaction: vi.fn(async (fn: () => Promise<unknown>) => fn()),
    getSetting: vi.fn(async (key: string) => state.settings.get(key) ?? null),
    setSetting: vi.fn(async (key: string, value: string) => {
      state.settings.set(key, value);
    }),
    close: vi.fn(async () => {}),
    checkpointWal: vi.fn(async () => {}),
  };
  return self;
});

vi.mock('./databaseClient', () => ({ databaseClient }));

vi.mock('react-native', () => ({
  AppState: {
    addEventListener: vi.fn((event: string, handler: (s: string) => void) => {
      state.appStateHandlers.push({ event, handler });
      return { remove: vi.fn() };
    }),
  },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => state.secure.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    state.secure.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    state.secure.delete(key);
  }),
}));

vi.mock('expo-sqlite', () => ({ openDatabaseAsync: vi.fn() }));
vi.mock('expo-sharing', () => ({ isAvailableAsync: vi.fn(async () => false), shareAsync: vi.fn() }));
vi.mock('expo-document-picker', () => ({ getDocumentAsync: vi.fn() }));
vi.mock('expo-video', () => ({ createVideoPlayer: vi.fn() }));
vi.mock('expo-image-manipulator', () => ({ ImageManipulator: { manipulate: vi.fn() }, SaveFormat: { JPEG: 'jpeg' } }));
vi.mock('expo-file-system', () => {
  class File {
    constructor(..._parts: unknown[]) {}
    get exists() { return false; }
    get uri() { return 'file:///fake'; }
    delete() {}
    copy() {}
  }
  class Directory extends File { create() {} }
  return { File, Directory, Paths: { document: 'file:///docs/', cache: 'file:///cache/' } };
});

/** Totais reais do catálogo, lidos do disco — a assinatura do seed é derivada deles. */
const seedTotals = (() => {
  const dir = join(__dirname, '../infrastructure/exercises/seeds');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  let exercises = 0;
  let versionSum = 0;
  for (const f of files) {
    const parsed = JSON.parse(readFileSync(join(dir, f), 'utf8')) as {
      exercises: unknown[];
      catalog_version: number;
    };
    exercises += parsed.exercises.length;
    versionSum += parsed.catalog_version;
  }
  return { files: files.length, exercises, versionSum };
})();

const expectedSignature = `${SCHEMA_VERSION}:${seedTotals.exercises}:${seedTotals.versionSum}`;

type Deps = typeof import('./mobileDependencies')['mobileDependencies'];

/**
 * `vi.resetModules()` reinstancia o registry de módulos: a classe importada
 * estaticamente por este arquivo deixa de ser a mesma que o grafo usa, então
 * `instanceof` não serve. O nome do construtor identifica a classe do mesmo jeito.
 */
function expectClass(value: unknown, className: string): void {
  expect((value as { constructor: { name: string } })?.constructor?.name).toBe(className);
}

/** Deixa o IIFE de seed e o `restore()` disparados no import terminarem. */
async function settle(): Promise<void> {
  for (let i = 0; i < 25; i += 1) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  for (let i = 0; i < 25; i += 1) await Promise.resolve();
}

async function loadDeps(): Promise<Deps> {
  vi.resetModules();
  const mod = await import('./mobileDependencies');
  await settle();
  return mod.mobileDependencies;
}

/** Por padrão pula o seed (assinatura já gravada) — cada teste opta por seedar. */
function skipSeeding(): void {
  state.settings.set(SEED_KEY, expectedSignature);
}

const fetchMock = vi.fn();

const syncResponse = (newCursor: string) => ({
  ok: true,
  status: 200,
  json: async () => ({
    newCursor,
    serverChanges: {
      exercises: [],
      treinos: [],
      treinoExercicios: [],
      sessaoTreinos: [],
      sessaoExercicios: [],
      seriesRegistradas: [],
      registrosPeso: [],
      userSettings: [],
      exerciseAlternatives: [],
    },
  }),
});

beforeEach(() => {
  state.settings.clear();
  state.runs.length = 0;
  state.secure.clear();
  state.appStateHandlers.length = 0;
  state.schemaVersion = SCHEMA_VERSION;
  state.rows = [];
  vi.clearAllMocks();
  fetchMock.mockReset().mockResolvedValue(syncResponse('cursor-novo'));
  vi.stubGlobal('fetch', fetchMock);
});

describe('mobileDependencies — montagem do grafo', () => {
  it('monta sem explodir e expõe exatamente os grupos que o app consome', async () => {
    skipSeeding();
    const deps = await loadDeps();

    expect(Object.keys(deps).sort()).toEqual([
      'backup',
      'baixarTodasMidias',
      'dashboard',
      'exerciseCatalog',
      'logger',
      'peso',
      'plano',
      'sessao',
      'treinos',
    ]);
    expectClass(deps.logger, 'ConsoleAppLogger');
    expectClass(deps.baixarTodasMidias, 'BaixarTodasMidiasUseCase');
  });

  it('exerciseCatalog sai com os use cases e o repositório do tipo certo', async () => {
    skipSeeding();
    const { exerciseCatalog } = await loadDeps();

    expectClass(exerciseCatalog.createExercise, 'CreateExerciseUseCase');
    expectClass(exerciseCatalog.updateExercise, 'UpdateExerciseUseCase');
    expectClass(exerciseCatalog.deleteExercise, 'DeleteExerciseUseCase');
    expectClass(exerciseCatalog.listExercises, 'ListExercisesUseCase');
    expectClass(exerciseCatalog.getUltimasExecucoesValidas, 'GetUltimasExecucoesValidasUseCase');
    expectClass(exerciseCatalog.getHistoricoExercicio, 'GetHistoricoExercicioUseCase');
    expectClass(exerciseCatalog.exerciseRepository, 'SQLiteExerciseRepository');
    expectClass(exerciseCatalog.logger, 'ConsoleAppLogger');
  });

  it('treinos (plano, lista e detalhe) sai com os use cases do tipo certo', async () => {
    skipSeeding();
    const { treinos, plano } = await loadDeps();

    expectClass(plano.getPlanoSemanal, 'GetPlanoSemanalUseCase');
    expectClass(plano.setDiaPlano, 'SetDiaPlanoUseCase');
    expectClass(treinos.plano.getPlanoSemanal, 'GetPlanoSemanalUseCase');
    expectClass(treinos.plano.setDiaPlano, 'SetDiaPlanoUseCase');

    expectClass(treinos.list.createTreino, 'CreateTreinoUseCase');
    expectClass(treinos.list.listTreinos, 'ListTreinosUseCase');
    expectClass(treinos.list.deleteTreino, 'DeleteTreinoUseCase');
    expectClass(treinos.list.duplicarTreino, 'DuplicarTreinoUseCase');
    expect(treinos.list.countExerciciosByTreino).toBeTypeOf('function');

    expectClass(treinos.detail.listTreinoExercicios, 'ListTreinoExerciciosUseCase');
    expectClass(treinos.detail.addExercicioAoTreino, 'AddExercicioAoTreinoUseCase');
    expectClass(treinos.detail.removeExercicioDoTreino, 'RemoveExercicioDoTreinoUseCase');
    expectClass(treinos.detail.reordenarExercicios, 'ReordenarExerciciosUseCase');
    expectClass(treinos.detail.updateTreino, 'UpdateTreinoUseCase');
    for (const fn of [
      treinos.detail.updateRecomendacoes,
      treinos.detail.updateMetodoGrupo,
      treinos.detail.listAlternativas,
      treinos.detail.addAlternativa,
      treinos.detail.removeAlternativa,
      treinos.detail.getSessaoAtiva,
      treinos.detail.cancelarSessao,
    ]) {
      expect(fn).toBeTypeOf('function');
    }
  });

  it('sessao (feature e ativa) sai com os use cases do tipo certo', async () => {
    skipSeeding();
    const { sessao } = await loadDeps();

    expectClass(sessao.feature.getSessaoAtiva, 'GetSessaoAtivaUseCase');
    expectClass(sessao.feature.sugerirTreino, 'SugerirTreinoUseCase');
    expectClass(sessao.feature.iniciarSessao, 'IniciarSessaoUseCase');
    expectClass(sessao.feature.listTreinoExercicios, 'ListTreinoExerciciosUseCase');

    expectClass(sessao.ativa.getSessaoDetalhe, 'GetSessaoDetalheUseCase');
    expectClass(sessao.ativa.registrarSerie, 'RegistrarSerieUseCase');
    expectClass(sessao.ativa.registrarSegmento, 'RegistrarSegmentoUseCase');
    expectClass(sessao.ativa.removerSegmento, 'RemoverSegmentoUseCase');
    expectClass(sessao.ativa.deleteSerie, 'DeleteSerieUseCase');
    expectClass(sessao.ativa.updateSerie, 'UpdateSerieUseCase');
    expectClass(sessao.ativa.toggleExercicioRealizado, 'ToggleExercicioRealizadoUseCase');
    expectClass(sessao.ativa.addExercicioASessao, 'AddExercicioASessaoUseCase');
    expectClass(sessao.ativa.finalizarSessao, 'FinalizarSessaoUseCase');
    expectClass(sessao.ativa.cancelarSessao, 'CancelarSessaoUseCase');
    expectClass(sessao.ativa.sugerirProgressao, 'SugerirProgressaoUseCase');
    expectClass(sessao.ativa.sugerirSubstitutos, 'SugerirSubstitutosUseCase');
    expectClass(sessao.ativa.substituirExercicio, 'SubstituirExercicioSessaoUseCase');
    expect(sessao.ativa.atualizarMetodoSessaoExercicio).toBeTypeOf('function');
  });

  it('peso e dashboard saem com os use cases do tipo certo', async () => {
    skipSeeding();
    const { peso, dashboard } = await loadDeps();

    expectClass(peso.registrarPeso, 'RegistrarPesoUseCase');
    expectClass(peso.listRegistrosPeso, 'ListRegistrosPesoUseCase');
    expectClass(peso.deleteRegistroPeso, 'DeleteRegistroPesoUseCase');

    expectClass(dashboard.getDashboardStats, 'GetDashboardStatsUseCase');
    expectClass(dashboard.getTreinoEvolucao, 'GetTreinoEvolucaoUseCase');
    expectClass(dashboard.resetHistorico, 'ResetHistoricoUseCase');
    expectClass(dashboard.exportarHistorico, 'ExportarHistoricoUseCase');
    expectClass(dashboard.exportarBanco, 'ExportarBancoUseCase');
    expectClass(dashboard.importarBanco, 'ImportarBancoUseCase');
    expectClass(dashboard.arquivarSessao, 'ArquivarSessaoUseCase');
    expectClass(dashboard.desarquivarSessao, 'DesarquivarSessaoUseCase');
    expectClass(dashboard.deletarSessao, 'DeletarSessaoUseCase');
  });

  it('reaproveita a MESMA instância de listExercises/listTreinos entre as telas', async () => {
    skipSeeding();
    const deps = await loadDeps();

    expect(deps.treinos.detail.listExercises).toBe(deps.exerciseCatalog.listExercises);
    expect(deps.sessao.ativa.listExercises).toBe(deps.exerciseCatalog.listExercises);
    expect(deps.sessao.feature.listTreinos).toBe(deps.treinos.list.listTreinos);
    // O logger é um singleton compartilhado por todos os grupos.
    for (const group of [
      deps.exerciseCatalog,
      deps.treinos.list,
      deps.treinos.detail,
      deps.sessao.feature,
      deps.sessao.ativa,
      deps.peso,
      deps.dashboard,
    ]) {
      expect(group.logger).toBe(deps.logger);
    }
  });
});

describe('mobileDependencies — seed do catálogo', () => {
  it('seeda o catálogo quando não há assinatura e grava a assinatura derivada dos seeds', async () => {
    await loadDeps();

    expect(state.settings.get(SEED_KEY)).toBe(expectedSignature);
    expect(expectedSignature).toBe(`12:${seedTotals.exercises}:${seedTotals.versionSum}`);
    expect(seedTotals.files).toBe(27);
    expect(databaseClient.withTransaction).toHaveBeenCalled();
    expect(state.runs.some((r) => r.sql.includes('exercises'))).toBe(true);
  });

  it('pula o seed inteiro quando a assinatura gravada bate', async () => {
    skipSeeding();
    await loadDeps();

    expect(databaseClient.withTransaction).not.toHaveBeenCalled();
    expect(state.runs).toHaveLength(0);
  });

  it('reseeda quando a versão de schema muda (migração recriou a tabela)', async () => {
    state.settings.set(SEED_KEY, expectedSignature);
    state.schemaVersion = SCHEMA_VERSION + 1;

    await loadDeps();

    expect(databaseClient.withTransaction).toHaveBeenCalled();
    expect(state.settings.get(SEED_KEY)).toBe(`13:${seedTotals.exercises}:${seedTotals.versionSum}`);
  });

  it('falha do seed não derruba a montagem do grafo', async () => {
    const boom = new Error('disk I/O error');
    databaseClient.withTransaction.mockRejectedValueOnce(boom);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const deps = await loadDeps();

    expectClass(deps.exerciseCatalog.listExercises, 'ListExercisesUseCase');
    expect(error).toHaveBeenCalledWith('[error] ExerciseSeedLoader failed', boom, {});
    // Assinatura NÃO gravada: o próximo boot tenta seedar de novo.
    expect(state.settings.get(SEED_KEY)).toBeUndefined();
    error.mockRestore();
  });
});

describe('mobileDependencies — backup & sync', () => {
  it('restaura a sessão gravada no keychain pela chave auth.session', async () => {
    skipSeeding();
    state.secure.set('auth.session', JSON.stringify(TOKENS));

    const deps = await loadDeps();
    await deps.backup.restore();

    expectClass(deps.backup.session, 'AuthSession');
    expect(deps.backup.session.isAuthenticated()).toBe(true);
    expect(deps.backup.session.email).toBe('aluno@academia.app');
  });

  it('migra a sessão legada da tabela settings para o keychain no primeiro restore', async () => {
    skipSeeding();
    state.settings.set('@auth/session', JSON.stringify(TOKENS));

    const deps = await loadDeps();
    await deps.backup.restore();

    expect(deps.backup.session.isAuthenticated()).toBe(true);
    expect(deps.backup.session.email).toBe('aluno@academia.app');
    // Migrada: some do settings (texto plano) e passa a viver no keychain.
    expect(state.secure.get('auth.session')).toBe(JSON.stringify(TOKENS));
    expect(state.settings.get('@auth/session')).toBe('');
  });

  it('sem sessão, syncNow é no-op ("skipped") e não toca a rede', async () => {
    skipSeeding();
    const deps = await loadDeps();

    const result = await deps.backup.syncNow();

    expect(result.status).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(deps.backup.getLastResult()).toBe(result);
  });

  it('syncNow autenticado bate na API configurada com o token do keychain', async () => {
    skipSeeding();
    state.secure.set('auth.session', JSON.stringify(TOKENS));
    const deps = await loadDeps();
    await deps.backup.restore();

    const result = await deps.backup.syncNow();

    expect(result.status).toBe('synced');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/v1/sync');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer access-opaco');
    expect(init.headers['Content-Type']).toBe('application/json');
    // Cursor persistido no settings do app, não em memória.
    expect(state.settings.get(CURSOR_KEY)).toBe('cursor-novo');
    expect(state.settings.get(ACCOUNT_KEY)).toBe('aluno@academia.app');
  });

  it('logout zera o cursor de sync para o histórico da conta seguinte não sumir', async () => {
    skipSeeding();
    state.secure.set('auth.session', JSON.stringify(TOKENS));
    state.settings.set(CURSOR_KEY, 'cursor-da-conta-antiga');
    const deps = await loadDeps();
    await deps.backup.restore();

    await deps.backup.session.logout();

    expect(deps.backup.session.isAuthenticated()).toBe(false);
    expect(state.settings.get(CURSOR_KEY)).toBe('');
    expect(state.secure.has('auth.session')).toBe(false);
  });

  it('troca de conta limpa o dirty das 9 tabelas que participam do push', async () => {
    skipSeeding();
    state.secure.set('auth.session', JSON.stringify(TOKENS));
    state.settings.set(ACCOUNT_KEY, 'outra-conta@academia.app');
    state.settings.set(CURSOR_KEY, 'cursor-da-conta-antiga');
    const deps = await loadDeps();
    await deps.backup.restore();

    await deps.backup.syncNow();

    const limpezas = state.runs
      .map((r) => /^UPDATE (\w+) SET dirty = 0 WHERE dirty = 1$/.exec(r.sql)?.[1])
      .filter((t): t is string => Boolean(t));
    expect(limpezas).toEqual([
      'exercises',
      'treinos',
      'treino_exercicios',
      'sessao_treinos',
      'sessao_exercicios',
      'series_registradas',
      'serie_segmentos',
      'registros_peso',
      'exercise_alternatives',
    ]);
    // Conta nova => pull do zero: o cursor herdado é descartado.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).since).toBeNull();
  });

  it('mesma conta não dispara a limpeza de dirty', async () => {
    skipSeeding();
    state.secure.set('auth.session', JSON.stringify(TOKENS));
    state.settings.set(ACCOUNT_KEY, 'aluno@academia.app');
    state.settings.set(CURSOR_KEY, 'cursor-vigente');
    const deps = await loadDeps();
    await deps.backup.restore();

    await deps.backup.syncNow();

    expect(state.runs.some((r) => r.sql.includes('SET dirty = 0'))).toBe(false);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).since).toBe('cursor-vigente');
  });
});

describe('mobileDependencies — auto-sync de foreground', () => {
  const appStateChange = () => {
    expect(state.appStateHandlers).toHaveLength(1);
    expect(state.appStateHandlers[0].event).toBe('change');
    return state.appStateHandlers[0].handler;
  };

  it('registra exatamente um listener de AppState no nível do app', async () => {
    skipSeeding();
    await loadDeps();

    expect(state.appStateHandlers).toHaveLength(1);
    expect(state.appStateHandlers[0].event).toBe('change');
  });

  it('voltar para foreground autenticado dispara o sync', async () => {
    skipSeeding();
    state.secure.set('auth.session', JSON.stringify(TOKENS));
    const deps = await loadDeps();
    await deps.backup.restore();

    appStateChange()('active');
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/api/v1/sync');
  });

  it.each(['background', 'inactive'])('ir para %s não dispara sync', async (next) => {
    skipSeeding();
    state.secure.set('auth.session', JSON.stringify(TOKENS));
    const deps = await loadDeps();
    await deps.backup.restore();

    appStateChange()(next);
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('foreground deslogado não dispara sync', async () => {
    skipSeeding();
    const deps = await loadDeps();
    await deps.backup.restore();

    appStateChange()('active');
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('mobileDependencies — adaptadores inline', () => {
  /** Último `run`/`getAll` cujo SQL casa com o trecho. */
  const ultimoSql = (trecho: string) => {
    const hit = [...state.runs].reverse().find((r) => r.sql.includes(trecho));
    expect(hit, `nenhum SQL com "${trecho}"`).toBeDefined();
    return hit!;
  };

  it('countExerciciosByTreino mapeia as linhas para {treinoId: total}', async () => {
    skipSeeding();
    const deps = await loadDeps();
    state.rows = [
      { treino_id: 'treino-a', count: 3 },
      { treino_id: 'treino-b', count: 1 },
    ];

    await expect(deps.treinos.list.countExerciciosByTreino()).resolves.toEqual({
      'treino-a': 3,
      'treino-b': 1,
    });
  });

  it('updateRecomendacoes repassa os 4 números na ordem certa (id por último)', async () => {
    skipSeeding();
    const deps = await loadDeps();

    await deps.treinos.detail.updateRecomendacoes('te-1', 4, 12, 60, 90);

    const { params } = ultimoSql('series_recomendadas = ?');
    expect(params.slice(0, 4)).toEqual([4, 12, 60, 90]);
    expect(params[params.length - 1]).toBe('te-1');
  });

  it('updateRecomendacoes preserva null (limpar recomendação ≠ zerar)', async () => {
    skipSeeding();
    const deps = await loadDeps();

    await deps.treinos.detail.updateRecomendacoes('te-1', null, null, null, null);

    const { params } = ultimoSql('series_recomendadas = ?');
    expect(params.slice(0, 4)).toEqual([null, null, null, null]);
  });

  it('updateMetodoGrupo repassa método e grupo', async () => {
    skipSeeding();
    const deps = await loadDeps();

    await deps.treinos.detail.updateMetodoGrupo('te-1', 'drop_set', 'grupo-9');

    const { params } = ultimoSql('metodo = ?');
    expect(params.slice(0, 2)).toEqual(['drop_set', 'grupo-9']);
    expect(params[params.length - 1]).toBe('te-1');
  });

  it('add/removeAlternativa não invertem exercício e alternativa', async () => {
    skipSeeding();
    const deps = await loadDeps();

    await deps.treinos.detail.addAlternativa('ex-origem', 'ex-alternativa');
    expect(ultimoSql('INSERT INTO exercise_alternatives').params.slice(0, 2)).toEqual([
      'ex-origem',
      'ex-alternativa',
    ]);

    await deps.treinos.detail.removeAlternativa('ex-origem', 'ex-alternativa');
    const remove = ultimoSql('UPDATE exercise_alternatives SET deleted_at');
    expect(remove.params.slice(2)).toEqual(['ex-origem', 'ex-alternativa']);
  });

  it('listAlternativas consulta pelo exercício e devolve primitives (não entidades)', async () => {
    skipSeeding();
    const deps = await loadDeps();

    await expect(deps.treinos.detail.listAlternativas('ex-origem')).resolves.toEqual([]);
    expect(ultimoSql('JOIN exercise_alternatives').params).toEqual(['ex-origem']);
  });

  it('getSessaoAtiva devolve null quando não há sessão em andamento', async () => {
    skipSeeding();
    const deps = await loadDeps();

    await expect(deps.treinos.detail.getSessaoAtiva()).resolves.toBeNull();
  });

  it('cancelarSessao do detalhe delega ao mesmo use case da sessão ativa', async () => {
    skipSeeding();
    const deps = await loadDeps();
    const execute = vi
      .spyOn(deps.sessao.ativa.cancelarSessao, 'execute')
      .mockResolvedValue(undefined);

    await deps.treinos.detail.cancelarSessao('sessao-7');

    expect(execute).toHaveBeenCalledWith('sessao-7');
  });

  it('atualizarMetodoSessaoExercicio não grava nada se o exercício não existe', async () => {
    skipSeeding();
    const deps = await loadDeps();

    await deps.sessao.ativa.atualizarMetodoSessaoExercicio('inexistente', 'drop_set');

    expect(state.runs.some((r) => r.sql.startsWith('UPDATE sessao_exercicios'))).toBe(false);
  });

  it('deleteExercise recebe a limpeza de mídia do Expo', async () => {
    skipSeeding();
    const deps = await loadDeps();

    expectClass(
      (deps.exerciseCatalog.deleteExercise as unknown as {
        dependencies: { mediaFileCleanup: unknown };
      }).dependencies.mediaFileCleanup,
      'ExpoMediaFileCleanup',
    );
  });

  it('getLastResult começa nulo e passa a refletir o último sync', async () => {
    skipSeeding();
    const deps = await loadDeps();

    expect(deps.backup.getLastResult()).toBeNull();
    const result = await deps.backup.syncNow();
    expect(deps.backup.getLastResult()).toBe(result);
  });
});
