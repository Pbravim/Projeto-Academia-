import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportarBancoUseCase } from './ImportarBancoUseCase';

vi.mock('expo-file-system', () => {
  const join = (...parts: unknown[]) =>
    parts.map((p) => (typeof p === 'string' ? p : (p as { path: string }).path)).join('/');
  class File {
    static store = new Map<string, Uint8Array>();
    static failCopyFrom = new Set<string>();
    path: string;
    constructor(...parts: unknown[]) {
      this.path = join(...parts);
    }
    get exists() {
      return File.store.has(this.path);
    }
    async bytes() {
      return File.store.get(this.path)!;
    }
    copy(dest: File) {
      if (File.failCopyFrom.has(this.path)) throw new Error('copy failed');
      File.store.set(dest.path, File.store.get(this.path)!);
    }
    delete() {
      File.store.delete(this.path);
    }
  }
  class Directory {
    path: string;
    constructor(...parts: unknown[]) {
      this.path = join(...parts);
    }
    get exists() {
      return true;
    }
    create() {}
  }
  return { File, Directory, Paths: { document: 'DOC', cache: 'CACHE' } };
});

vi.mock('expo-document-picker', () => ({ getDocumentAsync: vi.fn() }));

const FakeFile = File as unknown as {
  store: Map<string, Uint8Array>;
  failCopyFrom: Set<string>;
};

const PICKED = 'PICKED/backup.db';
const DEST = 'DOC/SQLite/academia.db';
const SUPPORTED_VERSION = 19;

/** Um header SQLite válido de 512 bytes com o user_version pedido (offset 60, big-endian). */
const makeDbBytes = (userVersion: number, marker = 1) => {
  const bytes = new Uint8Array(512);
  const magic = 'SQLite format 3\0';
  for (let i = 0; i < 16; i++) bytes[i] = magic.charCodeAt(i);
  new DataView(bytes.buffer).setUint32(60, userVersion, false);
  bytes[511] = marker; // distingue conteúdos nos asserts
  return bytes;
};

const makeUseCase = () => {
  const databaseClient = {
    checkpointWal: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    databaseFileName: 'academia.db',
    supportedSchemaVersion: SUPPORTED_VERSION,
  };
  return new ImportarBancoUseCase({ databaseClient: databaseClient as never });
};

const pickFile = (bytes: Uint8Array | null) => {
  if (bytes) FakeFile.store.set(PICKED, bytes);
  vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue(
    (bytes === null
      ? { canceled: true, assets: [] }
      : { canceled: false, assets: [{ uri: PICKED }] }) as never,
  );
};

describe('ImportarBancoUseCase', () => {
  beforeEach(() => {
    FakeFile.store.clear();
    FakeFile.failCopyFrom.clear();
    vi.clearAllMocks();
  });

  it('returns cancelled when the user dismisses the picker', async () => {
    pickFile(null);
    await expect(makeUseCase().execute()).resolves.toEqual({ status: 'cancelled' });
  });

  it('rejects a file without the SQLite magic header', async () => {
    const bytes = makeDbBytes(10);
    bytes[0] = 0x50; // corrompe o magic
    pickFile(bytes);
    await expect(makeUseCase().execute()).rejects.toThrow(/nao parece ser um banco SQLite/);
  });

  it('rejects a SQLite file with user_version 0 (not a backup of this app)', async () => {
    pickFile(makeDbBytes(0));
    await expect(makeUseCase().execute()).rejects.toThrow(/backup deste app/);
  });

  it('rejects a backup created by a newer app version (user_version above supported)', async () => {
    pickFile(makeDbBytes(SUPPORTED_VERSION + 1));
    await expect(makeUseCase().execute()).rejects.toThrow(/versao mais nova/);
  });

  it('imports a valid backup, replacing the local database', async () => {
    FakeFile.store.set(DEST, makeDbBytes(SUPPORTED_VERSION, 7));
    const picked = makeDbBytes(10, 9);
    pickFile(picked);

    await expect(makeUseCase().execute()).resolves.toEqual({ status: 'imported' });
    expect(FakeFile.store.get(DEST)).toBe(picked);
  });

  it('keeps the pre-import safety copy in the durable document dir, not the purgable cache', async () => {
    FakeFile.store.set(DEST, makeDbBytes(SUPPORTED_VERSION, 7));
    pickFile(makeDbBytes(10, 9));

    await makeUseCase().execute();

    const paths = [...FakeFile.store.keys()];
    const backupPath = paths.find((p) => p.includes('pre-import'));
    expect(backupPath).toBeDefined();
    expect(backupPath!.startsWith('DOC/')).toBe(true);
    expect(paths.some((p) => p.startsWith('CACHE/'))).toBe(false);
  });

  it('restores the previous database when the final copy fails', async () => {
    const previous = makeDbBytes(SUPPORTED_VERSION, 7);
    FakeFile.store.set(DEST, previous);
    pickFile(makeDbBytes(10, 9));
    FakeFile.failCopyFrom.add(PICKED);

    await expect(makeUseCase().execute()).rejects.toThrow('copy failed');
    expect(FakeFile.store.get(DEST)).toBe(previous);
  });
});
