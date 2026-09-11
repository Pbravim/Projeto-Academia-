import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import type { ExpoSQLiteDatabaseClient } from '../../../infrastructure/persistence/sqlite/ExpoSQLiteDatabaseClient';

interface ImportarBancoDependencies {
  databaseClient: ExpoSQLiteDatabaseClient;
}

export type ImportarBancoResult = { status: 'imported' } | { status: 'cancelled' };

const SQLITE_MAGIC = 'SQLite format 3\0';
// PRAGMA user_version fica nos bytes 60-63 (big-endian) do header de 100 bytes do SQLite.
const USER_VERSION_OFFSET = 60;
const SQLITE_HEADER_SIZE = 100;

/** Pede um .db ao usuário, valida o cabeçalho SQLite + user_version e substitui o banco local. */
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
    if (bytes.length < SQLITE_HEADER_SIZE) throw new Error('Arquivo invalido: muito pequeno.');
    const header = new TextDecoder().decode(bytes.slice(0, 16));
    if (header !== SQLITE_MAGIC) {
      throw new Error('Arquivo invalido: nao parece ser um banco SQLite.');
    }

    // Valida o user_version: 0 = SQLite qualquer (rodar as migrações em cima corromperia);
    // acima do suportado = backup de uma versão mais nova do app.
    const userVersion = new DataView(bytes.buffer, bytes.byteOffset).getUint32(
      USER_VERSION_OFFSET,
      false,
    );
    if (userVersion === 0) {
      throw new Error('Arquivo invalido: nao parece ser um backup deste app.');
    }
    if (userVersion > this.deps.databaseClient.supportedSchemaVersion) {
      throw new Error(
        'Backup criado por uma versao mais nova do app. Atualize o app antes de importar.',
      );
    }

    // Fecha conexao atual antes de sobrescrever.
    await this.deps.databaseClient.checkpointWal().catch(() => undefined);
    await this.deps.databaseClient.close();

    const sqliteDir = new Directory(Paths.document, 'SQLite');
    if (!sqliteDir.exists) sqliteDir.create({ intermediates: true });
    const dbName = this.deps.databaseClient.databaseFileName;
    const dest = new File(sqliteDir, dbName);

    // Cria backup de segurança antes de sobrescrever — no diretório de documentos
    // (durável), nunca no cache, que o sistema pode purgar a qualquer momento.
    let backupFile: InstanceType<typeof File> | null = null;
    if (dest.exists) {
      backupFile = new File(Paths.document, 'academia-pre-import.db');
      if (backupFile.exists) backupFile.delete();
      await dest.copy(backupFile);
      dest.delete();
    }

    // Remove restos de WAL/SHM do banco antigo para evitar corrupção.
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = new File(sqliteDir, `${dbName}${suffix}`);
      if (sidecar.exists) sidecar.delete();
    }

    try {
      await pickedFile.copy(dest);
    } catch (err) {
      if (backupFile?.exists) {
        await backupFile.copy(dest);
      }
      throw err;
    }

    return { status: 'imported' };
  }
}
