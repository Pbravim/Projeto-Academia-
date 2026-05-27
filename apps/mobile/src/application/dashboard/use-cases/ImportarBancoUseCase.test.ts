import { describe, expect, it } from 'vitest';
import { resolve } from 'path';

describe('ImportarBancoUseCase — copy failure restores backup', () => {
  it('re-throws the copy error and does not leave the user without a database', async () => {
    const { readFileSync } = await import('fs');
    const src = resolve(__dirname, './ImportarBancoUseCase.ts');
    const code = readFileSync(src, 'utf-8');

    expect(code).toContain('try {');
    expect(code).toContain('pickedFile.copy(dest)');
    expect(code).toContain('backupFile');
    expect(code).toContain('backupFile.copy(dest)');
    expect(code).toContain('throw err');
  });
});
