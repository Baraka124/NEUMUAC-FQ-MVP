import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  gitBlobSha, inlineScripts, embeddedJwtTokens, jwtRole,
  checkNewCredentialLeaks, checkLegacyBaseline
} from './phase0b-baseline.mjs';

const token = role => [
  Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url'),
  Buffer.from(JSON.stringify({ iss: 'test', role })).toString('base64url'),
  'a'.repeat(43)
].join('.');

test('Git blob SHA follows Git object encoding', () => {
  assert.equal(gitBlobSha(Buffer.from('hello')), 'b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0');
});

test('script extraction excludes external tags but keeps two inline scripts', () => {
  const html = '<script src="client.js"></script>' +
    '<script>const x = 1;</script><script>function f(){ return 2; }</script>';
  assert.deepEqual(inlineScripts(html), ['const x = 1;', 'function f(){ return 2; }']);
});

test('JWT pattern scan detects role while withholding token text from error messages', () => {
  const pub = token('anon');
  const service = token('service_role');
  assert.deepEqual(embeddedJwtTokens('x ' + pub + ' y ' + service), [pub, service]);
  assert.equal(jwtRole(pub), 'anon');
  assert.equal(jwtRole(service), 'service_role');
  assert.equal(jwtRole('not-a-jwt'), null);
});

test('public anon token is grandfathered ONLY in frozen legacy entry point', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nfq-ci-'));
  try {
    mkdirSync(join(dir, 'tools'));
    writeFileSync(join(dir, 'index.html'), '<script>const pub = "' + token('anon') + '";</script>');
    writeFileSync(join(dir, 'tools', 'new.ts'), 'export const x = 1;');
    const first = checkNewCredentialLeaks(dir);
    assert.equal(first.errors.length, 0);
    assert.equal(first.legacyAnonTokenCount, 1);
    writeFileSync(join(dir, 'tools', 'new.ts'), 'const hidden = "' + token('service_role') + '";');
    const second = checkNewCredentialLeaks(dir);
    assert.equal(second.errors.length, 1);
    assert.match(second.errors[0], /Non-baselined JWT/);
    assert.ok(!second.errors[0].includes(token('service_role')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('production baseline has not changed since Phase 0 architecture audit', () => {
  const report = checkLegacyBaseline();
  assert.deepEqual(report.errors, []);
  assert.equal(report.scriptCount, 2);
  assert.equal(report.credentials.legacyAnonTokenCount, 1);
});
