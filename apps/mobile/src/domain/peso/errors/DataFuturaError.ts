export class DataFuturaError extends Error {
  constructor(message: string = 'Data não pode ser no futuro.') {
    super(message);
    this.name = 'DataFuturaError';
  }
}
