export class SegmentoNotFoundError extends Error {
  constructor(id: string) {
    super(`Segmento com id "${id}" nao encontrado.`);
    this.name = 'SegmentoNotFoundError';
  }
}
