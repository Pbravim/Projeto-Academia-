import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { ExpoSQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient';

interface ExportarBancoDependencies {
  databaseClient: ExpoSQLiteDatabaseClient;
}

/** Copia o arquivo .db para a pasta de cache e abre o diálogo de compartilhamento. */
export class ExportarBancoUseCase {
  constructor(private readonly deps: ExportarBancoDependencies) {}

  async execute(): Promise<void> {
    // Garante que o WAL foi consolidado no .db antes de copiar.
    await this.deps.databaseClient.checkpointWal();

    const sourceDir = new Directory(Paths.document, 'SQLite');
    const source = new File(sourceDir, this.deps.databaseClient.databaseFileName);
    if (!source.exists) throw new Error('Banco de dados nao encontrado.');

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const destName = `academia-backup-${timestamp}.db`;
    const dest = new File(Paths.cache, destName);
    if (dest.exists) dest.delete();
    source.copy(dest);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) throw new Error('Compartilhamento nao disponivel neste dispositivo.');

    try {
      await Sharing.shareAsync(dest.uri, {
        mimeType: 'application/x-sqlite3',
        dialogTitle: 'Exportar backup do banco',
        UTI: 'public.database',
      });
    } finally {
      if (dest.exists) dest.delete();
    }
  }
}
