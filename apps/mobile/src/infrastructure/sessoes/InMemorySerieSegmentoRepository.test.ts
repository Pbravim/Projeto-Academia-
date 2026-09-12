import { describe, expect, it } from 'vitest';

import { SerieSegmento } from '../../domain/sessoes/entities/SerieSegmento';

import { InMemorySerieSegmentoRepository } from './InMemorySerieSegmentoRepository';

function make(id: string, serieId: string, ordem: number): SerieSegmento {
  return SerieSegmento.restore({ id, serieId, ordem, cargaKg: 40, repeticoes: 6, descansoSegundos: null });
}

describe('InMemorySerieSegmentoRepository — paridade de tombstone com o SQLite (achado #4, revisao 1)', () => {
  it('delete tombstona (nao remove fisicamente); findById e listBySerieId escondem o apagado', async () => {
    const repo = new InMemorySerieSegmentoRepository();
    await repo.save(make('seg1', 'sr1', 2));

    await repo.delete('seg1');

    expect(await repo.findById('seg1')).toBeNull();
    expect(await repo.listBySerieId('sr1')).toHaveLength(0);
  });

  it('maxOrdemBySerieId inclui os tombstonados: ordem nunca e reaproveitada', async () => {
    const repo = new InMemorySerieSegmentoRepository();
    await repo.save(make('seg1', 'sr1', 2));
    await repo.save(make('seg2', 'sr1', 3)); // maior ordem

    await repo.delete('seg2'); // apaga justamente o de maior ordem

    // Com delete fisico, maxOrdem cairia para 2 e reaproveitaria o numero 3.
    expect(await repo.maxOrdemBySerieId('sr1')).toBe(3);
  });

  it('deleteBySerieIds tombstona todos os segmentos das series informadas', async () => {
    const repo = new InMemorySerieSegmentoRepository();
    await repo.save(make('seg1', 'sr1', 2));
    await repo.save(make('seg2', 'sr1', 3));
    await repo.save(make('seg3', 'sr2', 2));

    await repo.deleteBySerieIds(['sr1']);

    expect(await repo.listBySerieId('sr1')).toHaveLength(0);
    expect(await repo.listBySerieId('sr2')).toHaveLength(1);
    expect(await repo.maxOrdemBySerieId('sr1')).toBe(3);
  });

  it('save() depois de um delete revive o segmento (reaproveita o id, nao a tombstone)', async () => {
    const repo = new InMemorySerieSegmentoRepository();
    await repo.save(make('seg1', 'sr1', 2));
    await repo.delete('seg1');

    await repo.save(make('seg1', 'sr1', 2));

    expect(await repo.findById('seg1')).not.toBeNull();
  });
});
