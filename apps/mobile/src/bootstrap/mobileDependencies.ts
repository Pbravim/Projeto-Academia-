import { AppState } from 'react-native';

import { AuthSession } from '../application/auth/AuthSession';
import { ArquivarSessaoUseCase } from '../application/dashboard/use-cases/ArquivarSessaoUseCase';
import { DeletarSessaoUseCase } from '../application/dashboard/use-cases/DeletarSessaoUseCase';
import { DesarquivarSessaoUseCase } from '../application/dashboard/use-cases/DesarquivarSessaoUseCase';
import { ExportarBancoUseCase } from '../application/dashboard/use-cases/ExportarBancoUseCase';
import { ExportarHistoricoUseCase } from '../application/dashboard/use-cases/ExportarHistoricoUseCase';
import { GetDashboardStatsUseCase } from '../application/dashboard/use-cases/GetDashboardStatsUseCase';
import { GetTreinoEvolucaoUseCase } from '../application/dashboard/use-cases/GetTreinoEvolucaoUseCase';
import { ImportarBancoUseCase } from '../application/dashboard/use-cases/ImportarBancoUseCase';
import { ResetHistoricoUseCase } from '../application/dashboard/use-cases/ResetHistoricoUseCase';
import { BaixarMidiaExercicioUseCase } from '../application/exercises/use-cases/BaixarMidiaExercicioUseCase';
import { BaixarMidiasTreinoUseCase } from '../application/exercises/use-cases/BaixarMidiasTreinoUseCase';
import { BaixarTodasMidiasUseCase } from '../application/exercises/use-cases/BaixarTodasMidiasUseCase';
import { CreateExerciseUseCase } from '../application/exercises/use-cases/CreateExerciseUseCase';
import { DeleteExerciseUseCase } from '../application/exercises/use-cases/DeleteExerciseUseCase';
import { ListExercisesUseCase } from '../application/exercises/use-cases/ListExercisesUseCase';
import { UpdateExerciseUseCase } from '../application/exercises/use-cases/UpdateExerciseUseCase';
import { GetHistoricoExercicioUseCase } from '../application/historico/use-cases/GetHistoricoExercicioUseCase';
import { GetUltimaExecucaoValidaUseCase } from '../application/historico/use-cases/GetUltimaExecucaoValidaUseCase';
import { GetUltimasExecucoesValidasUseCase } from '../application/historico/use-cases/GetUltimasExecucoesValidasUseCase';
import { DeleteRegistroPesoUseCase } from '../application/peso/use-cases/DeleteRegistroPesoUseCase';
import { ListRegistrosPesoUseCase } from '../application/peso/use-cases/ListRegistrosPesoUseCase';
import { RegistrarPesoUseCase } from '../application/peso/use-cases/RegistrarPesoUseCase';
import { GetPlanoSemanalUseCase } from '../application/plano/use-cases/GetPlanoSemanalUseCase';
import { SetDiaPlanoUseCase } from '../application/plano/use-cases/SetDiaPlanoUseCase';
import { AddExercicioASessaoUseCase } from '../application/sessoes/use-cases/AddExercicioASessaoUseCase';
import { CancelarSessaoUseCase } from '../application/sessoes/use-cases/CancelarSessaoUseCase';
import { DeleteSerieUseCase } from '../application/sessoes/use-cases/DeleteSerieUseCase';
import { FinalizarSessaoUseCase } from '../application/sessoes/use-cases/FinalizarSessaoUseCase';
import { GetSessaoAtivaUseCase } from '../application/sessoes/use-cases/GetSessaoAtivaUseCase';
import { GetSessaoDetalheUseCase } from '../application/sessoes/use-cases/GetSessaoDetalheUseCase';
import { IniciarSessaoUseCase } from '../application/sessoes/use-cases/IniciarSessaoUseCase';
import { RegistrarSerieUseCase } from '../application/sessoes/use-cases/RegistrarSerieUseCase';
import { SubstituirExercicioSessaoUseCase } from '../application/sessoes/use-cases/SubstituirExercicioSessaoUseCase';
import { SugerirProgressaoUseCase } from '../application/sessoes/use-cases/SugerirProgressaoUseCase';
import { SugerirSubstitutosUseCase } from '../application/sessoes/use-cases/SugerirSubstitutosUseCase';
import { SugerirTreinoUseCase } from '../application/sessoes/use-cases/SugerirTreinoUseCase';
import { ToggleExercicioRealizadoUseCase } from '../application/sessoes/use-cases/ToggleExercicioRealizadoUseCase';
import { UpdateSerieUseCase } from '../application/sessoes/use-cases/UpdateSerieUseCase';
import { BackupSyncService } from '../application/sync/BackupSyncService';
import { AddExercicioAoTreinoUseCase } from '../application/treinos/use-cases/AddExercicioAoTreinoUseCase';
import { CreateTreinoUseCase } from '../application/treinos/use-cases/CreateTreinoUseCase';
import { DeleteTreinoUseCase } from '../application/treinos/use-cases/DeleteTreinoUseCase';
import { DuplicarTreinoUseCase } from '../application/treinos/use-cases/DuplicarTreinoUseCase';
import { ListTreinoExerciciosUseCase } from '../application/treinos/use-cases/ListTreinoExerciciosUseCase';
import { ListTreinosUseCase } from '../application/treinos/use-cases/ListTreinosUseCase';
import { RemoveExercicioDoTreinoUseCase } from '../application/treinos/use-cases/RemoveExercicioDoTreinoUseCase';
import { ReordenarExerciciosUseCase } from '../application/treinos/use-cases/ReordenarExerciciosUseCase';
import { UpdateTreinoUseCase } from '../application/treinos/use-cases/UpdateTreinoUseCase';
import { API_BASE_URL } from '../config/apiConfig';
import type { SessaoExercicioPrimitives } from '../domain/sessoes/entities/SessaoExercicio';
import type { MetodoExercicio } from '../domain/treinos/entities/TreinoExercicio';
import { AuthApiClient } from '../infrastructure/auth/AuthApiClient';
import { SecureTokenStore } from '../infrastructure/auth/SecureTokenStore';
import { SqliteDashboardRepository } from '../infrastructure/dashboard/SqliteDashboardRepository';
import { ExerciseSeedLoader, type SeedFile } from '../infrastructure/exercises/ExerciseSeedLoader';
import { ExpoMediaFileCleanup } from '../infrastructure/exercises/ExpoMediaFileCleanup';
import { gerarThumbMidia } from '../infrastructure/exercises/gerarThumbMidia';
import abdomeJson from '../infrastructure/exercises/seeds/abdome.json';
import alongamentoEstaticoJson from '../infrastructure/exercises/seeds/alongamento_estatico.json';
import aquecimentoDinamicoJson from '../infrastructure/exercises/seeds/aquecimento_dinamico.json';
import bicepsJson from '../infrastructure/exercises/seeds/biceps.json';
import cardioHiitFuncionalJson from '../infrastructure/exercises/seeds/cardio_hiit_funcional.json';
import cardioSteadyStateJson from '../infrastructure/exercises/seeds/cardio_steady_state.json';
import costasPullHorizontalJson from '../infrastructure/exercises/seeds/costas_pull_horizontal.json';
import costasPullVerticalJson from '../infrastructure/exercises/seeds/costas_pull_vertical.json';
import forcaElasticoFuncionalJson from '../infrastructure/exercises/seeds/forca_elastico_funcional.json';
import forcaKettlebellJson from '../infrastructure/exercises/seeds/forca_kettlebell.json';
import forcaLandmineJson from '../infrastructure/exercises/seeds/forca_landmine.json';
import forcaMaquinasEspecializadasJson from '../infrastructure/exercises/seeds/forca_maquinas_especializadas.json';
import forcaSuspensionTrainerJson from '../infrastructure/exercises/seeds/forca_suspension_trainer.json';
import mobilidadeInferiorJson from '../infrastructure/exercises/seeds/mobilidade_inferior.json';
import mobilidadeSuperiorColunaJson from '../infrastructure/exercises/seeds/mobilidade_superior_coluna.json';
import ombrosLateralJson from '../infrastructure/exercises/seeds/ombros_lateral.json';
import ombrosPressJson from '../infrastructure/exercises/seeds/ombros_press.json';
import panturrilhaJson from '../infrastructure/exercises/seeds/panturrilha.json';
import peitoFlyJson from '../infrastructure/exercises/seeds/peito_fly.json';
import peitoPressJson from '../infrastructure/exercises/seeds/peito_press.json';
import posteriorGluteosJson from '../infrastructure/exercises/seeds/posterior_gluteos.json';
import quadricepsJson from '../infrastructure/exercises/seeds/quadriceps.json';
import reabilitacaoLombarCoreJson from '../infrastructure/exercises/seeds/reabilitacao_lombar_core.json';
import reabilitacaoOmbroCotoveloJson from '../infrastructure/exercises/seeds/reabilitacao_ombro_cotovelo.json';
import reabilitacaoQuadrilJoelhoJson from '../infrastructure/exercises/seeds/reabilitacao_quadril_joelho.json';
import tricepsOverheadJson from '../infrastructure/exercises/seeds/triceps_overhead.json';
import tricepsPushDownJson from '../infrastructure/exercises/seeds/triceps_push_down.json';
import { SQLiteExerciseAlternativeSyncRepository } from '../infrastructure/exercises/SQLiteExerciseAlternativeSyncRepository';
import { SQLiteExerciseRepository } from '../infrastructure/exercises/SQLiteExerciseRepository';
import { SQLiteHistoricoRepository } from '../infrastructure/historico/SQLiteHistoricoRepository';
import { ConsoleAppLogger } from '../infrastructure/logging/AppLogger';
import { SQLiteRegistroPesoRepository } from '../infrastructure/peso/SQLiteRegistroPesoRepository';
import { SQLitePlanoSemanalRepository } from '../infrastructure/plano/SQLitePlanoSemanalRepository';
import { SQLiteSerieRegistradaRepository } from '../infrastructure/sessoes/SQLiteSerieRegistradaRepository';
import { SQLiteSessaoExercicioRepository } from '../infrastructure/sessoes/SQLiteSessaoExercicioRepository';
import { SQLiteSessaoTreinoRepository } from '../infrastructure/sessoes/SQLiteSessaoTreinoRepository';
import { SettingsStorageAdapter } from '../infrastructure/sync/SettingsStorageAdapter';
import { SyncApiClient } from '../infrastructure/sync/SyncApiClient';
import { SYNC_CURSOR_KEY,SyncEngine } from '../infrastructure/sync/SyncEngine';
import { SQLiteTreinoExercicioRepository } from '../infrastructure/treinos/SQLiteTreinoExercicioRepository';
import { SQLiteTreinoRepository } from '../infrastructure/treinos/SQLiteTreinoRepository';
import { generateId } from '../shared/utils/generateId';

import { databaseClient } from './databaseClient';

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
const forcaLandmine = forcaLandmineJson as SeedFile;
const cardioSteadyState = cardioSteadyStateJson as SeedFile;
const cardioHiitFuncional = cardioHiitFuncionalJson as SeedFile;
const alongamentoEstatico = alongamentoEstaticoJson as SeedFile;
const aquecimentoDinamico = aquecimentoDinamicoJson as SeedFile;
const mobilidadeInferior = mobilidadeInferiorJson as SeedFile;
const mobilidadeSuperiorColuna = mobilidadeSuperiorColunaJson as SeedFile;
const reabilitacaoOmbroCotovelo = reabilitacaoOmbroCotoveloJson as SeedFile;
const reabilitacaoQuadrilJoelho = reabilitacaoQuadrilJoelhoJson as SeedFile;
const reabilitacaoLombarCore = reabilitacaoLombarCoreJson as SeedFile;
const forcaMaquinasEspecializadas = forcaMaquinasEspecializadasJson as SeedFile;
const forcaSuspensionTrainer = forcaSuspensionTrainerJson as SeedFile;
const forcaElasticoFuncional = forcaElasticoFuncionalJson as SeedFile;

const logger = new ConsoleAppLogger();

const exerciseRepository = new SQLiteExerciseRepository(databaseClient);

const seedFiles: SeedFile[] = [
  peitoPress, peitoFly, costasPullVertical, costasPullHorizontal,
  ombrosPress, ombrosLateral, biceps, tricepsPushDown, tricepsOverhead,
  quadriceps, posteriorGluteos, abdome, panturrilha, forcaKettlebell, forcaLandmine,
  cardioSteadyState, cardioHiitFuncional, alongamentoEstatico,
  aquecimentoDinamico, mobilidadeInferior, mobilidadeSuperiorColuna,
  reabilitacaoOmbroCotovelo,
  reabilitacaoQuadrilJoelho,
  reabilitacaoLombarCore,
  forcaMaquinasEspecializadas,
  forcaSuspensionTrainer,
  forcaElasticoFuncional,
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
    // Duas fases (exercícios, depois alternativas): as alternativas têm FK para
    // exercises(id) e cruzam arquivos — carregar arquivo a arquivo viola o FK.
    // Transação única: sem ela são ~1500 auto-commits que estrangulam as
    // leituras das telas de exercício durante o seeding.
    await databaseClient.withTransaction(() => seedLoader.loadSeedFiles(seedFiles));
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
const syncStorage = new SettingsStorageAdapter(databaseClient);
// Tabelas com flag dirty que participam do push (userSettings não pusha do mobile).
const SYNC_DIRTY_TABLES = [
  'exercises', 'treinos', 'treino_exercicios', 'sessao_treinos',
  'sessao_exercicios', 'series_registradas', 'registros_peso', 'exercise_alternatives',
] as const;
const authSession = new AuthSession(
  new AuthApiClient(API_BASE_URL),
  // Keychain/keystore; migra a sessão legada da tabela settings na 1ª leitura.
  new SecureTokenStore(databaseClient),
  undefined,
  undefined,
  // Logout: cursor de sync não pode sobreviver à sessão — stale, esconderia o
  // histórico da próxima conta no primeiro pull ('' = ausente, convenção settings).
  () => syncStorage.setItem(SYNC_CURSOR_KEY, ''),
);
const syncEngine = new SyncEngine(
  new SyncApiClient(API_BASE_URL, () => authSession.getAccessToken()),
  syncStorage,
  exerciseRepository,
  treinoRepository,
  treinoExercicioRepository,
  sessaoTreinoRepository,
  sessaoExercicioRepository,
  serieRegistradaRepository,
  registroPesoRepository,
  new SQLiteExerciseAlternativeSyncRepository(databaseClient),
  databaseClient,
  undefined,
  {
    current: () => authSession.email,
    // Conta trocou neste device: zera os dirty herdados para nunca pushar os
    // dados da conta anterior para a conta nova.
    onSwitch: () =>
      databaseClient.withTransaction(async () => {
        for (const table of SYNC_DIRTY_TABLES) {
          await databaseClient.run(`UPDATE ${table} SET dirty = 0 WHERE dirty = 1`);
        }
      }),
  },
);
const backupSync = new BackupSyncService(authSession, syncEngine);
// Rehydrate any saved session at startup (fire-and-forget; UI also awaits via restore()).
void authSession.restore().catch((e) =>
  logger.error('AuthSession.restore failed', e instanceof Error ? e : new Error(String(e))),
);

// Auto-sync de foreground no nível do APP (P3 rodada 3): quando o listener
// vivia só no hook do Perfil, uma semana de treino sem abrir o Perfil = nada
// sincava. syncNow() coalesce chamadas concorrentes com o listener do hook.
AppState.addEventListener('change', (next) => {
  if (next === 'active' && authSession.isAuthenticated()) {
    void backupSync.syncNow();
  }
});

const listExercises = new ListExercisesUseCase(exerciseRepository);
const cancelarSessaoUC = new CancelarSessaoUseCase({
  sessaoTreinoRepository,
  sessaoExercicioRepository,
  serieRegistradaRepository,
});
const baixarMidiaExercicio = new BaixarMidiaExercicioUseCase({ exerciseRepository, gerarThumb: gerarThumbMidia });
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
      deleteTreino: new DeleteTreinoUseCase({
        treinoRepository,
        treinoExercicioRepository,
        sessaoTreinoRepository,
        sessaoExercicioRepository,
        serieRegistradaRepository,
        planoSemanalRepository,
        database: databaseClient,
      }),
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
      reordenarExercicios: new ReordenarExerciciosUseCase({ treinoRepository, treinoExercicioRepository, database: databaseClient }),
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
        database: databaseClient,
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
