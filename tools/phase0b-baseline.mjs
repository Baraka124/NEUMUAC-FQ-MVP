/**
 * Phase 0B legacy characterization and release-safety checks.
 *
 * This script intentionally does not connect to Supabase, Vercel or a network.
 * Passing does NOT mean that clinical logic, RLS, privacy or security is validated.
 *
 * To change the protected legacy entry point deliberately, update the SHA and
 * supporting parity evidence in a separate approved PR.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REFERENCE_BLOB_SHA = 'c18221fb6baf47782318ca3685b94b088c359a66';
export const PRODUCTION_DOMAIN = 'fq.neumact.org';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Before cutover the frozen app is index.html; after cutover it is index.1.html.
function legacyEntry(rootDir) {
  return existsSync(join(rootDir, 'index.1.html')) ? 'index.1.html' : 'index.html';
}

export function gitBlobSha(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return createHash('sha1')
    .update(Buffer.from('blob ' + bytes.byteLength + '\0'))
    .update(bytes)
    .digest('hex');
}

export function inlineScripts(html) {
  const all = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  return all.filter(match => !/\bsrc\s*=/.test(match[1])).map(match => match[2]);
}

export function embeddedJwtTokens(text) {
  return [...text.matchAll(/\beyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g)].map(m => m[0]);
}

export function jwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload?.role || null;
  } catch {
    return null;
  }
}

function filesUnder(dir, base = dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(path, base));
    else if (entry.isFile()) found.push(relative(base, path));
  }
  return found;
}

export function checkNewCredentialLeaks(rootDir) {
  const errors = [];
  let legacyAnonTokenCount = 0;
  const paths = filesUnder(rootDir);
  for (const filename of paths) {
    const normalized = filename.replaceAll('\\', '/');
    const base = normalized.split('/').at(-1);
    if (/^\.env(?:\.|$)/.test(base) && base !== '.env.example') {
      errors.push('Environment file is committed: ' + normalized);
      continue;
    }
    if (!/\.(?:html|js|mjs|cjs|ts|tsx|jsx|json|yaml|yml|toml)$/.test(normalized)) continue;
    const fullPath = join(rootDir, filename);
    if (statSync(fullPath).size > 8_000_000) {
      errors.push('Oversized file needs manual secret inspection: ' + normalized);
      continue;
    }
    const contents = readFileSync(fullPath, 'utf8');
    for (const token of embeddedJwtTokens(contents)) {
      if (normalized === legacyEntry(rootDir) && jwtRole(token) === 'anon') {
        legacyAnonTokenCount++;
      } else {
        errors.push('Non-baselined JWT-like credential in ' + normalized + ' (never print token)');
      }
    }
  }
  // This is an existing public anon key, NOT proof of safe RLS.
  if (legacyAnonTokenCount !== 1) {
    errors.push('Expected exactly one pre-existing public anon JWT in the frozen legacy HTML; found ' + legacyAnonTokenCount);
  }
  return { errors, legacyAnonTokenCount, inspectedFiles: paths.length };
}

export function checkLegacyBaseline(rootDir = ROOT) {
  const errors = [];
  const archiveName = legacyEntry(rootDir);
  const htmlPath = join(rootDir, archiveName);
  const domainPath = join(rootDir, 'CNAME');
  if (!existsSync(join(rootDir, 'index.html')) || !existsSync(htmlPath) || !existsSync(domainPath)) {
    return { errors: ['Production entry, frozen legacy entry or CNAME missing'], scriptCount: 0 };
  }
  const source = readFileSync(htmlPath);
  const actualSha = gitBlobSha(source);
  if (actualSha !== REFERENCE_BLOB_SHA) {
    errors.push('Frozen legacy entry changed (expected Git blob ' + REFERENCE_BLOB_SHA +
      ', got ' + actualSha + '). Review and update the baseline intentionally.');
  }
  if (readFileSync(domainPath, 'utf8').trim() !== PRODUCTION_DOMAIN) {
    errors.push('Production CNAME changed unexpectedly.');
  }
  if (archiveName === 'index.1.html') {
    const current = readFileSync(join(rootDir, 'index.html'), 'utf8');
    // The published Vite asset paths must point to files actually committed at the root.
    const assets = [...current.matchAll(/(?:src|href)=["']\.\/(assets\/[^"'?#]+)["']/g)]
      .map(match => match[1]);
    if (!/<div\s+id=["']app["']/.test(current) || !assets.length) {
      errors.push('Modern root must mount the Vue app and reference built local assets.');
    }
    for (const asset of assets) {
      if (!existsSync(join(rootDir, asset))) errors.push('Missing compiled Vue asset: ' + asset);
    }
  }
  const html = source.toString('utf8');
  for (const id of ['appSidebar', 'appMain', 'variantList', 'homeDashboard', 'variantDetail']) {
    if (!new RegExp('\\bid=["\\\']' + id + '["\\\']').test(html)) {
      errors.push('Missing legacy application anchor: ' + id);
    }
  }
  for (const fragment of [
    'function searchVariants(', 'function renderVariantDetail(', 'function renderVariantList(',
    'function computeCompoundGenotype(', 'function heliosClaimItem(', 'function openHelios(',
    'const STATE =', 'const AUTH ='
  ]) {
    if (!html.includes(fragment)) errors.push('Missing legacy application function: ' + fragment);
  }
  const scripts = inlineScripts(html);
  if (scripts.length !== 2) errors.push('Expected two legacy inline JavaScript blocks; found ' + scripts.length);
  for (const [i, body] of scripts.entries()) {
    const result = spawnSync(process.execPath, ['--check', '-'], {
      input: body, encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024
    });
    if (result.status !== 0) {
      errors.push('Inline script ' + (i + 1) + ' failed JavaScript syntax validation: ' +
        (result.stderr || result.error?.message || 'unknown error').slice(0, 1600));
    }
  }
  const scan = checkNewCredentialLeaks(rootDir);
  errors.push(...scan.errors);
  return { errors, scriptCount: scripts.length, gitBlobSha: actualSha, credentials: scan };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkLegacyBaseline();
  if (result.errors.length) {
    for (const error of result.errors) console.error('FAIL: ' + error);
    process.exitCode = 1;
  } else {
    console.log('PASS: frozen legacy application blob, CNAME, core anchors and JS syntax');
    console.log('PASS: baseline credential-pattern scan (known public anon JWT allowed only in legacy HTML)');
    console.log('NOT CHECKED: server RLS, clinical correctness, runtime journeys, deployment, backups');
  }
}
