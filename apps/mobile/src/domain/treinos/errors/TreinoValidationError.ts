export class TreinoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TreinoValidationError';
  }
}
