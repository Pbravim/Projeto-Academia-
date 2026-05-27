import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

import type { ExpoSQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient';

interface ImportarBancoDependencies {
  databaseClient: ExpoSQLiteDatabaseClient;
}

export type ImportarBancoResult = { status: 'imported' } | { status: 'cancelled' };

const SQLITE_MAGIC = 'SQLite format 3\0';

/** Pede um .db ao usuário, valida o cabeçalho SQLite e substitui o banco local. */
export class ImportarBancoUseCase {
  constructor(private readonly deps: ImportarBancoDependencies) {}

  async execute(): Promise<ImportarBancoResult> {
    const picked = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled || picked.assets.length === 0) return { status: 'cancelled' };

    const pickedUri = picked.assets[0].uri;
    const pickedFile = new File(pickedUri);
    if (!pickedFile.exists) throw new Error('Arquivo selecionado nao encontrado.');

    // Valida magic header SQLite.
    const bytes = await pickedFile.bytes();
    if (bytes.length < 16) throw new Error('Arquivo invalido: muito pequeno.');
    const header = new TextDecoder().decode(bytes.slice(0, 16));
    if (header !== SQLITE_MAGIC) {
      throw new Error('Arquivo invalido: nao parece ser um banco SQLite.');
    }

    // Fecha conexao atual antes de sobrescrever.
    await this.deps.databaseClient.checkpointWal().catch(() => undefined);
    await this.deps.databaseClient.close();

    const sqliteDir = new Directory(Paths.document, 'SQLite');
    if (!sqliteDir.exists) sqliteDir.create({ intermediates: true });
    const dbName = this.deps.databaseClient.databaseFileName;
    const dest = new File(sqliteDir, dbName);

    // Cria backup de segurança antes de sobrescrever.
    let backupFile: InstanceType<typeof File> | null = null;
    if (dest.exists) {
      const ts = Date.now();
      backupFile = new File(Paths.cache, `academia-pre-import-${ts}.db`);
      dest.copy(backupFile);
      dest.delete();
    }

    // Remove restos de WAL/SHM do banco antigo para evitar corrupção.
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = new File(sqliteDir, `${dbName}${suffix}`);
      if (sidecar.exists) sidecar.delete();
    }

    try {
      pickedFile.copy(dest);
    } catch (err) {
      if (backupFile?.exists) {
        backupFile.copy(dest);
      }
      throw err;
    }

    return { status: 'imported' };
  }
}
