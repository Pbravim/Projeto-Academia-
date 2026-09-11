#!/usr/bin/env node
/**
 * Runner do jest com `--experimental-vm-modules`.
 *
 * A partir do Nest 12 todos os pacotes `@nestjs/*` são ESM puros. O jest só
 * consegue `require()` um ESM (Node >= 24.9) com essa flag ligada; sem ela toda
 * suíte morre em "Must use import to load ES Module". Como a flag é de processo,
 * não dá para declará-la no jest.config — e `NODE_OPTIONS=...` inline no script
 * do package.json não é portável para o shell do Windows. Daí este wrapper.
 *
 * Repassa argv e propaga o exit code, então `node ../../scripts/api-jest.mjs --config X`
 * se comporta como `jest --config X`.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

// subpath sem extensão: é o único que o `exports` do jest 30 expõe.
const jestBin = createRequire(import.meta.url).resolve('jest/bin/jest');

const result = spawnSync(
  process.execPath,
  ['--experimental-vm-modules', jestBin, ...process.argv.slice(2)],
  { stdio: 'inherit' },
);

if (result.error) throw result.error;
// exitCode (e não process.exit) para propagar a falha sem cortar o flush do stdio.
process.exitCode = result.status ?? 1;
