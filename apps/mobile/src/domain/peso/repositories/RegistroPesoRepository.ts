import type { RegistroPeso } from '../entities/RegistroPeso';

export interface RegistroPesoRepository {
  save(registro: RegistroPeso): Promise<void>;
  list(): Promise<RegistroPeso[]>;
  findById(id: string): Promise<RegistroPeso | null>;
  delete(id: string): Promise<void>;
}
