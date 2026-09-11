import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseExportPort } from '../../../domain/dashboard/ports/DatabaseExportPort';

import { ExportarBancoUseCase } from './ExportarBancoUseCase';

// Tracks how many times File has been constructed within the current test.
let fileCallCount = 0;

const mockFiles = [
  // First File call → source (must exist so the use case proceeds)
  { exists: true, uri: 'file:///docs/SQLite/academia.db', copy: vi.fn(), delete: vi.fn() },
  // Second File call → dest (does not exist yet, so no pre-delete)
  { exists: false, uri: 'file:///cache/academia-backup-today.db', copy: vi.fn(), delete: vi.fn() },
];

const mockDirectory = { exists: true, uri: 'file:///docs/SQLite/' };

vi.mock('expo-file-system', () => ({
  File: vi.fn(function () {
    const idx = Math.min(fileCallCount, mockFiles.length - 1);
    fileCallCount += 1;
    return mockFiles[idx];
  }) as any,
  Directory: vi.fn(function () { return mockDirectory; }) as any,
  Paths: { document: 'file:///docs/', cache: 'file:///cache/' },
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn().mockResolvedValue(undefined),
}));

describe('ExportarBancoUseCase', () => {
  beforeEach(() => {
    fileCallCount = 0;
  });

  it('calls checkpointWal and shareAsync', async () => {
    const { shareAsync } = await import('expo-sharing');
    const databaseClient = {
      checkpointWal: vi.fn().mockResolvedValue(undefined),
      databaseFileName: 'academia.db',
    } as unknown as DatabaseExportPort;
    const useCase = new ExportarBancoUseCase({ databaseClient });
    await useCase.execute();
    expect(databaseClient.checkpointWal).toHaveBeenCalled();
    expect(shareAsync).toHaveBeenCalled();
  });

  it('throws when sharing is not available', async () => {
    const { isAvailableAsync } = await import('expo-sharing');
    vi.mocked(isAvailableAsync).mockResolvedValueOnce(false);
    const databaseClient = {
      checkpointWal: vi.fn().mockResolvedValue(undefined),
      databaseFileName: 'academia.db',
    } as unknown as DatabaseExportPort;
    const useCase = new ExportarBancoUseCase({ databaseClient });
    await expect(useCase.execute()).rejects.toThrow('Compartilhamento nao disponivel neste dispositivo.');
  });
});
