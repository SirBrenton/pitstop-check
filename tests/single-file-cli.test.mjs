import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'dist', 'index.js');
const sampleFile = join(root, 'sample-bad-retry', 'src', 'retry.ts');

function expectTwoWarnings(target) {
  const result = spawnSync(process.execPath, [entry, target], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20_000,
    maxBuffer: 1024 * 1024,
  });

  assert.ifError(result.error);
  assert.equal(result.signal, null, `CLI terminated by ${result.signal}`);
  assert.equal(result.status, 0,
    `CLI exited ${result.status}: ${result.stderr || result.stdout}`);

  const warnings = result.stdout.match(/^\[WARN\] /gm) ?? [];
  assert.equal(warnings.length, 2, `Expected two warnings:\n${result.stdout}`);
  assert.match(result.stdout, /429 handled without Retry-After/);
  assert.match(result.stdout, /All 429s treated as retryable/);
  assert.match(result.stdout, /pitstop-check found 2 issues/);
  assert.doesNotMatch(result.stderr, /ENOTDIR/);
}

test('directory scan: original two retry warnings are preserved', () => {
  expectTwoWarnings(dirname(sampleFile));
});

test('direct single-file scan: same two warnings without ENOTDIR', () => {
  expectTwoWarnings(sampleFile);
});
