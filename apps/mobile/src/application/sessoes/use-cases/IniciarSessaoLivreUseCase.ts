import { SessaoTreino, type SessaoTreinoPrimitives } from '../../../domain/sessoes/entities/SessaoTreino';
import { SessaoValidationError } from '../../../domain/sessoes/errors/SessaoValidationError';
import type { SessaoTreinoRepository } from '../../../domain/sessoes/repositories/SessaoTreinoRepository';
import type { TransactionPort } from '../../../domain/shared/ports/TransactionPort';
import { SessaoJaAtivaError } from '../errors/SessaoJaAtivaError';

export interface IniciarSessaoLivreInput {
  nome: string;
}

interface IniciarSessaoLivreUseCaseDependencies {
  sessaoTreinoRepository: SessaoTreinoRepository;
  idGenerator: () => string;
  now: () => Date;
  database?: TransactionPort;
}

/**
 * Inicia uma sessao sem treino template (D5). O aluno adiciona exercicios avulsos
 * pelo AddExercicioASessaoUseCase ja existente, que aceita qualquer sessao ativa.
 */
export class IniciarSessaoLivreUseCase {
  constructor(private readonly dependencies: IniciarSessaoLivreUseCaseDependencies) {}

  /**
   * @throws {SessaoJaAtivaError} ja existe uma sessao em andamento
   * @throws {SessaoValidationError} nome vazio ou com menos de 2 caracteres
   */
  async execute(input: IniciarSessaoLivreInput): Promise<SessaoTreinoPrimitives> {
    const sessaoAtiva = await this.dependencies.sessaoTreinoRepository.findAtiva();
    if (sessaoAtiva) throw new SessaoJaAtivaError();

    const nome = input.nome.trim().replace(/\s+/g, ' ');
    if (nome.length < 2) throw new SessaoValidationError('Nome precisa ter pelo menos 2 caracteres.');

    const sessao = SessaoTreino.create({
      id: this.dependencies.idGenerator(),
      treinoId: null,
      treinoNomeSnapshot: nome,
      dataHoraInicio: this.dependencies.now(),
    });

    const salvar = async () => {
      await this.dependencies.sessaoTreinoRepository.save(sessao);
    };

    if (this.dependencies.database) {
      await this.dependencies.database.withTransaction(salvar);
    } else {
      await salvar();
    }

    return sessao.toPrimitives();
  }
}
