export class SessaoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessaoValidationError';
  }
}
