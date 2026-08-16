#!/usr/bin/env node
// Roda as suítes com coverage e concatena os lcov em coverage/lcov.info na
// raiz, com caminhos SF: relativos à raiz do repo — formato que o portão de
// cobertura do .orca-quality.json (orca-config quality/gates.py) consome.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
}

// jest/vitest emitem SF: relativos ao diretório do app (ou absolutos);
// reancora tudo na raiz do repo para casar com os caminhos do git diff.
function relocate(lcovPath, appDir) {
  const out = [];
  for (const line of readFileSync(lcovPath, 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('SF:')) {
      out.push(line);
      continue;
    }
    const sf = line.slice(3).replace(/\\/g, '/');
    let rel;
    if (path.isAbsolute(sf) || /^[A-Za-z]:\//.test(sf)) {
      rel = path.relative(root, sf).replace(/\\/g, '/');
    } else {
      const candidates = [path.join(appDir, sf), path.join(appDir, 'src', sf)];
      const hit = candidates.find((c) => existsSync(path.join(root, c)));
      rel = (hit ?? candidates[0]).replace(/\\/g, '/');
    }
    out.push('SF:' + rel);
  }
  return out.join('\n');
}

const parts = [];

run('npm --prefix apps/api test -- --coverage --coverageReporters=lcov');
parts.push(relocate(path.join(root, 'apps/api/coverage/lcov.info'), 'apps/api'));

const vitestCov = ['apps/mobile/node_modules/@vitest/coverage-v8', 'node_modules/@vitest/coverage-v8'].some(
  (p) => existsSync(path.join(root, p)),
);
if (vitestCov) {
  run('npm --prefix apps/mobile run test -- --coverage.enabled --coverage.reporter=lcov');
  parts.push(relocate(path.join(root, 'apps/mobile/coverage/lcov.info'), 'apps/mobile'));
} else {
  console.warn('AVISO: @vitest/coverage-v8 ausente — coverage do apps/mobile não medido nesta rodada.');
}

mkdirSync(path.join(root, 'coverage'), { recursive: true });
writeFileSync(path.join(root, 'coverage', 'lcov.info'), parts.join('\n'));
console.log(`coverage/lcov.info gerado (${parts.length} suíte(s) somada(s)).`);
