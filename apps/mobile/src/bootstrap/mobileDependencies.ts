import { CreateExerciseUseCase } from '../application/exercises/use-cases/CreateExerciseUseCase';
import { DeleteExerciseUseCase } from '../application/exercises/use-cases/DeleteExerciseUseCase';
import { ExpoMediaFileCleanup } from '../infrastructure/exercises/ExpoMediaFileCleanup';
import { ListExercisesUseCase } from '../application/exercises/use-cases/ListExercisesUseCase';
import { UpdateExerciseUseCase } from '../application/exercises/use-cases/UpdateExerciseUseCase';
import { GetHistoricoExercicioUseCase } from '../application/historico/use-cases/GetHistoricoExercicioUseCase';
import { GetUltimaExecucaoValidaUseCase } from '../application/historico/use-cases/GetUltimaExecucaoValidaUseCase';
import { GetUltimasExecucoesValidasUseCase } from '../application/historico/use-cases/GetUltimasExecucoesValidasUseCase';
import { DeleteRegistroPesoUseCase } from '../application/peso/use-cases/DeleteRegistroPesoUseCase';
import { ListRegistrosPesoUseCase } from '../application/peso/use-cases/ListRegistrosPesoUseCase';
import { RegistrarPesoUseCase } from '../application/peso/use-cases/RegistrarPesoUseCase';
import { BaixarMidiaExercicioUseCase } from '../application/exercises/use-cases/BaixarMidiaExercicioUseCase';
import { BaixarMidiasTreinoUseCase } from '../application/exercises/use-cases/BaixarMidiasTreinoUseCase';
import { BaixarTodasMidiasUseCase } from '../application/exercises/use-cases/BaixarTodasMidiasUseCase';
import type { MetodoExercicio } from '../domain/treinos/entities/TreinoExercicio';
import type { SessaoExercicioPrimitives } from '../domain/sessoes/entities/SessaoExercicio';
import { AddExercicioAoTreinoUseCase } from '../application/treinos/use-cases/AddExercicioAoTreinoUseCase';
import { CreateTreinoUseCase } from '../application/treinos/use-cases/CreateTreinoUseCase';
import { DeleteTreinoUseCase } from '../application/treinos/use-cases/DeleteTreinoUseCase';
import { DuplicarTreinoUseCase } from '../application/treinos/use-cases/DuplicarTreinoUseCase';
import { ListTreinoExerciciosUseCase } from '../application/treinos/use-cases/ListTreinoExerciciosUseCase';
import { ListTreinosUseCase } from '../application/treinos/use-cases/ListTreinosUseCase';
import { RemoveExercicioDoTreinoUseCase } from '../application/treinos/use-cases/RemoveExercicioDoTreinoUseCase';
import { ReordenarExerciciosUseCase } from '../application/treinos/use-cases/ReordenarExerciciosUseCase';
import { UpdateTreinoUseCase } from '../application/treinos/use-cases/UpdateTreinoUseCase';
import { ArquivarSessaoUseCase } from '../application/dashboard/use-cases/ArquivarSessaoUseCase';
import { DesarquivarSessaoUseCase } from '../application/dashboard/use-cases/DesarquivarSessaoUseCase';
import { DeletarSessaoUseCase } from '../application/dashboard/use-cases/DeletarSessaoUseCase';
import { ExportarBancoUseCase } from '../application/dashboard/use-cases/ExportarBancoUseCase';
import { ExportarHistoricoUseCase } from '../application/dashboard/use-cases/ExportarHistoricoUseCase';
import { ImportarBancoUseCase } from '../application/dashboard/use-cases/ImportarBancoUseCase';
import { GetDashboardStatsUseCase } from '../application/dashboard/use-cases/GetDashboardStatsUseCase';
import { GetTreinoEvolucaoUseCase } from '../application/dashboard/use-cases/GetTreinoEvolucaoUseCase';
import { ResetHistoricoUseCase } from '../application/dashboard/use-cases/ResetHistoricoUseCase';
import { AddExercicioASessaoUseCase } from '../application/sessoes/use-cases/AddExercicioASessaoUseCase';
import { CancelarSessaoUseCase } from '../application/sessoes/use-cases/CancelarSessaoUseCase';
import { DeleteSerieUseCase } from '../application/sessoes/use-cases/DeleteSerieUseCase';
import { UpdateSerieUseCase } from '../application/sessoes/use-cases/UpdateSerieUseCase';
import { FinalizarSessaoUseCase } from '../application/sessoes/use-cases/FinalizarSessaoUseCase';
import { GetSessaoAtivaUseCase } from '../application/sessoes/use-cases/GetSessaoAtivaUseCase';
import { GetSessaoDetalheUseCase } from '../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import { IniciarSessaoUseCase } from '../application/sessoes/use-cases/IniciarSessaoUseCase';
import { RegistrarSerieUseCase } from '../application/sessoes/use-cases/RegistrarSerieUseCase';
import { SugerirProgressaoUseCase } from '../application/sessoes/use-cases/SugerirProgressaoUseCase';
import { SugerirSubstitutosUseCase } from '../application/sessoes/use-cases/SugerirSubstitutosUseCase';
import { SubstituirExercicioSessaoUseCase } from '../application/sessoes/use-cases/SubstituirExercicioSessaoUseCase';
import { SugerirTreinoUseCase } from '../application/sessoes/use-cases/SugerirTreinoUseCase';
import { ToggleExercicioRealizadoUseCase } from '../application/sessoes/use-cases/ToggleExercicioRealizadoUseCase';
import { GetPlanoSemanalUseCase } from '../application/plano/use-cases/GetPlanoSemanalUseCase';
import { SetDiaPlanoUseCase } from '../application/plano/use-cases/SetDiaPlanoUseCase';
import { SQLitePlanoSemanalRepository } from '../infrastructure/plano/SQLitePlanoSemanalRepository';
import { SQLiteHistoricoRepository } from '../infrastructure/historico/SQLiteHistoricoRepository';
import { SQLiteRegistroPesoRepository } from '../infrastructure/peso/SQLiteRegistroPesoRepository';
import { SQLiteExerciseRepository } from '../infrastructure/exercises/SQLiteExerciseRepository';
import { ExerciseSeedLoader, type SeedFile } from '../infrastructure/exercises/ExerciseSeedLoader';
import peitoPressJson from '../infrastructure/exercises/seeds/peito_press.json';
import peitoFlyJson from '../infrastructure/exercises/seeds/peito_fly.json';
import costasPullVerticalJson from '../infrastructure/exercises/seeds/costas_pull_vertical.json';
import costasPullHorizontalJson from '../infrastructure/exercises/seeds/costas_pull_horizontal.json';
import ombrosPressJson from '../infrastructure/exercises/seeds/ombros_press.json';
import ombrosLateralJson from '../infrastructure/exercises/seeds/ombros_lateral.json';
import bicepsJson from '../infrastructure/exercises/seeds/biceps.json';
import tricepsPushDownJson from '../infrastructure/exercises/seeds/triceps_push_down.json';
import tricepsOverheadJson from '../infrastructure/exercises/seeds/triceps_overhead.json';
import quadricepsJson from '../infrastructure/exercises/seeds/quadriceps.json';
import posteriorGluteosJson from '../infrastructure/exercises/seeds/posterior_gluteos.json';
import abdomeJson from '../infrastructure/exercises/seeds/abdome.json';
import panturrilhaJson from '../infrastructure/exercises/seeds/panturrilha.json';
import forcaKettlebellJson from '../infrastructure/exercises/seeds/forca_kettlebell.json';
import cardioSteadyStateJson from '../infrastructure/exercises/seeds/cardio_steady_state.json';
import cardioHiitFuncionalJson from '../infrastructure/exercises/seeds/cardio_hiit_funcional.json';
import alongamentoEstaticoJson from '../infrastructure/exercises/seeds/alongamento_estatico.json';
import aquecimentoDinamicoJson from '../infrastructure/exercises/seeds/aquecimento_dinamico.json';
import mobilidadeInferiorJson from '../infrastructure/exercises/seeds/mobilidade_inferior.json';
import mobilidadeSuperiorColunaJson from '../infrastructure/exercises/seeds/mobilidade_superior_coluna.json';
import reabilitacaoOmbroCotoveloJson from '../infrastructure/exercises/seeds/reabilitacao_ombro_cotovelo.json';
import reabilitacaoQuadrilJoelhoJson from '../infrastructure/exercises/seeds/reabilitacao_quadril_joelho.json';

const peitoPress = peitoPressJson as SeedFile;
const peitoFly = peitoFlyJson as SeedFile;
const costasPullVertical = costasPullVerticalJson as SeedFile;
const costasPullHorizontal = costasPullHorizontalJson as SeedFile;
const ombrosPress = ombrosPressJson as SeedFile;
const ombrosLateral = ombrosLateralJson as SeedFile;
const biceps = bicepsJson as SeedFile;
const tricepsPushDown = tricepsPushDownJson as SeedFile;
const tricepsOverhead = tricepsOverheadJson as SeedFile;
const quadriceps = quadricepsJson as SeedFile;
const posteriorGluteos = posteriorGluteosJson as SeedFile;
const abdome = abdomeJson as SeedFile;
const panturrilha = panturrilhaJson as SeedFile;
const forcaKettlebell = forcaKettlebellJson as SeedFile;
const cardioSteadyState = cardioSteadyStateJson as SeedFile;
const cardioHiitFuncional = cardioHiitFuncionalJson as SeedFile;
const alongamentoEstatico = alongamentoEstaticoJson as SeedFile;
const aquecimentoDinamico = aquecimentoDinamicoJson as SeedFile;
const mobilidadeInferior = mobilidadeInferiorJson as SeedFile;
const mobilidadeSuperiorColuna = mobilidadeSuperiorColunaJson as SeedFile;
const reabilitacaoOmbroCotovelo = reabilitacaoOmbroCotoveloJson as SeedFile;
const reabilitacaoQuadrilJoelho = reabilitacaoQuadrilJoelhoJson as SeedFile;
import { SqliteDashboardRepository } from '../infrastructure/dashboard/SqliteDashboardRepository';
import { SQLiteTreinoExercicioRepository } from '../infrastructure/treinos/SQLiteTreinoExercicioRepository';
import { SQLiteTreinoRepository } from '../infrastructure/treinos/SQLiteTreinoRepository';
import { SQLiteSessaoTreinoRepository } from '../infrastructure/sessoes/SQLiteSessaoTreinoRepository';
import { SQLiteSessaoExercicioRepository } from '../infrastructure/sessoes/SQLiteSessaoExercicioRepository';
import { SQLiteSerieRegistradaRepository } from '../infrastructure/sessoes/SQLiteSerieRegistradaRepository';
import { ConsoleAppLogger } from '../infrastructure/logging/AppLogger';
import { generateId } from '../shared/utils/generateId';
import { databaseClient } from './databaseClient';
import { API_BASE_URL } from '../config/apiConfig';
import { AuthApiClient } from '../infrastructure/auth/AuthApiClient';
import { SettingsTokenStore } from '../infrastructure/auth/SettingsTokenStore';
import { AuthSession } from '../application/auth/AuthSession';
import { SyncApiClient } from '../infrastructure/sync/SyncApiClient';
import { SyncEngine } from '../infrastructure/sync/SyncEngine';
import { SettingsStorageAdapter } from '../infrastructure/sync/SettingsStorageAdapter';
import { BackupSyncService } from '../application/sync/BackupSyncService';

const logger = new ConsoleAppLogger();

const exerciseRepository = new SQLiteExerciseRepository(databaseClient);

const seedFiles: SeedFile[] = [
  peitoPress, peitoFly, costasPullVertical, costasPullHorizontal,
  ombrosPress, ombrosLateral, biceps, tricepsPushDown, tricepsOverhead,
  quadriceps, posteriorGluteos, abdome, panturrilha, forcaKettlebell,
  cardioSteadyState, cardioHiitFuncional, alongamentoEstatico,
  aquecimentoDinamico, mobilidadeInferior, mobilidadeSuperiorColuna,
  reabilitacaoOmbroCotovelo,
  reabilitacaoQuadrilJoelho,
];

// Seeding the catalog upserts ~250 exercises + their alternatives — ~1500 writes serialized
// through the single SQLite connection. Doing it on EVERY launch starves the exercise screens'
// reads, making them slow to load. Skip the whole pass when nothing changed, keyed by a cheap
// signature of (schema version + total exercise count + sum of catalog_version). The schema
// version is included so a migration that rebuilds the exercises table forces a re-seed.
const SEED_SIGNATURE_KEY = '@seed/catalog-signature';

void (async () => {
  try {
    const totalExercises = seedFiles.reduce((n, f) => n + f.exercises.length, 0);
    const versionSum = seedFiles.reduce((n, f) => n + f.catalog_version, 0);
    const schemaRow = await databaseClient.getFirst<{ user_version: number }>('PRAGMA user_version');
    const signature = `${schemaRow?.user_version ?? 0}:${totalExercises}:${versionSum}`;

    if (await databaseClient.getSetting(SEED_SIGNATURE_KEY) === signature) return;

    const seedLoader = new ExerciseSeedLoader(exerciseRepository);
    await Promise.all(seedFiles.map((file) => seedLoader.loadSeedFile(file)));
    await databaseClient.setSetting(SEED_SIGNATURE_KEY, signature);
  } catch (e) {
    logger.error('ExerciseSeedLoader failed', e instanceof Error ? e : new Error(String(e)));
  }
})();

const treinoRepository = new SQLiteTreinoRepository(databaseClient);
const treinoExercicioRepository = new SQLiteTreinoExercicioRepository(databaseClient);
const sessaoTreinoRepository = new SQLiteSessaoTreinoRepository(databaseClient);
const sessaoExercicioRepository = new SQLiteSessaoExercicioRepository(databaseClient);
const serieRegistradaRepository = new SQLiteSerieRegistradaRepository(databaseClient);
const historicoRepository = new SQLiteHistoricoRepository(databaseClient);
const registroPesoRepository = new SQLiteRegistroPesoRepository(databaseClient);
const dashboardRepository = new SqliteDashboardRepository(databaseClient);

// --- Backup & sync (opt-in, offline-first) ---
const authSession = new AuthSession(
  new AuthApiClient(API_BASE_URL),
  new SettingsTokenStore(databaseClient),
);
const syncEngine = new SyncEngine(
  new SyncApiClient(API_BASE_URL, () => authSession.getAccessToken()),
  new SettingsStorageAdapter(databaseClient),
  exerciseRepository,
  treinoRepository,
  treinoExercicioRepository,
  sessaoTreinoRepository,
  sessaoExercicioRepository,
  serieRegistradaRepository,
  registroPesoRepository,
);
const backupSync = new BackupSyncService(authSession, syncEngine);
// Rehydrate any saved session at startup (fire-and-forget; UI also awaits via restore()).
void authSession.restore().catch((e) =>
  logger.error('AuthSession.restore failed', e instanceof Error ? e : new Error(String(e))),
);

const listExercises = new ListExercisesUseCase(exerciseRepository);
const cancelarSessaoUC = new CancelarSessaoUseCase({
  sessaoTreinoRepository,
  sessaoExercicioRepository,
  serieRegistradaRepository,
});
const baixarMidiaExercicio = new BaixarMidiaExercicioUseCase({ exerciseRepository });
const baixarMidiasTreino = new BaixarMidiasTreinoUseCase({
  exerciseRepository,
  treinoExercicioRepository,
  baixarMidia: baixarMidiaExercicio,
});
const baixarTodasMidias = new BaixarTodasMidiasUseCase({
  exerciseRepository,
  baixarMidia: baixarMidiaExercicio,
});
const listTreinos = new ListTreinosUseCase(treinoRepository);
const planoSemanalRepository = new SQLitePlanoSemanalRepository(databaseClient);

export const mobileDependencies = {
  logger,
  baixarTodasMidias,

  backup: {
    session: authSession,
    syncNow: () => backupSync.syncNow(),
    getLastResult: () => backupSync.getLastResult(),
    restore: () => authSession.restore(),
  },

  exerciseCatalog: {
    createExercise: new CreateExerciseUseCase({
      exerciseRepository,
      idGenerator: () => generateId('exercise'),
      now: () => new Date(),
    }),
    updateExercise: new UpdateExerciseUseCase({
      exerciseRepository,
      now: () => new Date(),
    }),
    deleteExercise: new DeleteExerciseUseCase({
      exerciseRepository,
      treinoExercicioRepository,
      sessaoExercicioRepository,
      serieRegistradaRepository,
      mediaFileCleanup: new ExpoMediaFileCleanup(),
    }),
    listExercises,
    getUltimasExecucoesValidas: new GetUltimasExecucoesValidasUseCase({ historicoRepository }),
    getHistoricoExercicio: new GetHistoricoExercicioUseCase({ historicoRepository }),
    exerciseRepository,
    logger,
  },

  plano: {
    getPlanoSemanal: new GetPlanoSemanalUseCase(planoSemanalRepository),
    setDiaPlano: new SetDiaPlanoUseCase(planoSemanalRepository),
  },

  treinos: {
    plano: {
      getPlanoSemanal: new GetPlanoSemanalUseCase(planoSemanalRepository),
      setDiaPlano: new SetDiaPlanoUseCase(planoSemanalRepository),
    },
    list: {
      createTreino: new CreateTreinoUseCase({
        treinoRepository,
        idGenerator: () => generateId('treino'),
        now: () => new Date(),
      }),
      listTreinos,
      deleteTreino: new DeleteTreinoUseCase({ treinoRepository, treinoExercicioRepository, sessaoTreinoRepository }),
      duplicarTreino: new DuplicarTreinoUseCase({
        treinoRepository,
        treinoExercicioRepository,
        idGenerator: () => generateId('treino'),
        now: () => new Date(),
      }),
      countExerciciosByTreino: () => treinoExercicioRepository.countAllByTreino(),
      logger,
    },
    detail: {
      listTreinoExercicios: new ListTreinoExerciciosUseCase(treinoExercicioRepository),
      addExercicioAoTreino: new AddExercicioAoTreinoUseCase({
        treinoRepository,
        treinoExercicioRepository,
        exerciseRepository,
        idGenerator: () => generateId('treino_exercicio'),
        database: databaseClient,
      }),
      removeExercicioDoTreino: new RemoveExercicioDoTreinoUseCase({ treinoExercicioRepository }),
      reordenarExercicios: new ReordenarExerciciosUseCase({ treinoRepository, treinoExercicioRepository }),
      updateTreino: new UpdateTreinoUseCase({ treinoRepository, now: () => new Date() }),
      listExercises,
      updateRecomendacoes: (id: string, series: number | null, execucoes: number | null, cargaPadrao: number | null, tempoDescansoSegundos: number | null) =>
        treinoExercicioRepository.updateRecomendacoes(id, series, execucoes, cargaPadrao, tempoDescansoSegundos),
      updateMetodoGrupo: (id: string, metodo: MetodoExercicio, grupoId: string | null) =>
        treinoExercicioRepository.updateMetodoGrupo(id, metodo, grupoId),
      listAlternativas: async (exercicioId: string) => {
        const exercises = await exerciseRepository.listAlternativas(exercicioId);
        return exercises.map((e) => e.toPrimitives());
      },
      addAlternativa: (exercicioId: string, alternativaId: string) =>
        exerciseRepository.addAlternativa(exercicioId, alternativaId),
      removeAlternativa: (exercicioId: string, alternativaId: string) =>
        exerciseRepository.removeAlternativa(exercicioId, alternativaId),
      getSessaoAtiva: async () => {
        const s = await sessaoTreinoRepository.findAtiva();
        if (!s) return null;
        const p = s.toPrimitives();
        return { id: p.id, treinoNomeSnapshot: p.treinoNomeSnapshot };
      },
      cancelarSessao: (sessaoId: string) => cancelarSessaoUC.execute(sessaoId),
      logger,
    },
  },

  sessao: {
    feature: {
      getSessaoAtiva: new GetSessaoAtivaUseCase(sessaoTreinoRepository),
      sugerirTreino: new SugerirTreinoUseCase({ dashboardRepository: dashboardRepository, planoRepository: planoSemanalRepository }),
      iniciarSessao: new IniciarSessaoUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
        treinoRepository,
        treinoExercicioRepository,
        exerciseRepository,
        idGenerator: () => generateId('sessao'),
        now: () => new Date(),
        database: databaseClient,
      }),
      listTreinos,
      listTreinoExercicios: new ListTreinoExerciciosUseCase(treinoExercicioRepository),
      logger,
    },
    ativa: {
      getSessaoDetalhe: new GetSessaoDetalheUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
        serieRegistradaRepository,
        exerciseRepository,
      }),
      registrarSerie: new RegistrarSerieUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
        serieRegistradaRepository,
        treinoExercicioRepository,
        idGenerator: () => generateId('serie'),
        database: databaseClient,
      }),
      deleteSerie: new DeleteSerieUseCase({ serieRegistradaRepository }),
      updateSerie: new UpdateSerieUseCase({
        serieRegistradaRepository,
        sessaoExercicioRepository,
        sessaoTreinoRepository,
      }),
      toggleExercicioRealizado: new ToggleExercicioRealizadoUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
      }),
      addExercicioASessao: new AddExercicioASessaoUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
        exerciseRepository,
        idGenerator: () => generateId('sessao_exercicio'),
        database: databaseClient,
      }),
      finalizarSessao: new FinalizarSessaoUseCase({
        sessaoTreinoRepository,
        now: () => new Date(),
      }),
      cancelarSessao: cancelarSessaoUC,
      atualizarMetodoSessaoExercicio: async (id: string, metodo: SessaoExercicioPrimitives['metodo']) => {
        const se = await sessaoExercicioRepository.findById(id);
        if (!se) return;
        await sessaoExercicioRepository.save(se.withMetodo(metodo));
      },
      sugerirProgressao: new SugerirProgressaoUseCase({ historicoRepository }),
      sugerirSubstitutos: new SugerirSubstitutosUseCase({
        sessaoExercicioRepository,
        exerciseRepository,
        historicoRepository,
      }),
      substituirExercicio: new SubstituirExercicioSessaoUseCase({
        sessaoTreinoRepository,
        sessaoExercicioRepository,
        exerciseRepository,
        serieRegistradaRepository,
      }),
      listExercises,
      logger,
    },
  },

  peso: {
    registrarPeso: new RegistrarPesoUseCase({
      registroPesoRepository,
      idGenerator: () => generateId('peso'),
      now: () => new Date(),
    }),
    listRegistrosPeso: new ListRegistrosPesoUseCase(registroPesoRepository),
    deleteRegistroPeso: new DeleteRegistroPesoUseCase(registroPesoRepository),
    logger,
  },

  dashboard: {
    getDashboardStats: new GetDashboardStatsUseCase({ dashboardRepository }),
    getTreinoEvolucao: new GetTreinoEvolucaoUseCase({ dashboardRepository }),
    resetHistorico: new ResetHistoricoUseCase({ database: databaseClient }),
    exportarHistorico: new ExportarHistoricoUseCase({ database: databaseClient }),
    exportarBanco: new ExportarBancoUseCase({ databaseClient }),
    importarBanco: new ImportarBancoUseCase({ databaseClient }),
    arquivarSessao: new ArquivarSessaoUseCase({ dashboardRepository }),
    desarquivarSessao: new DesarquivarSessaoUseCase({ dashboardRepository }),
    deletarSessao: new DeletarSessaoUseCase({ dashboardRepository }),
    logger,
  },
};
