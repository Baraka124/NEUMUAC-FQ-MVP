import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

const script=readFileSync(new URL('../../../../scripts/verify-expert-registry-staging.mjs',import.meta.url),'utf8');
describe('14H213 staging execution boundary',()=>{
 it('requires distinct explicit staging project identity',()=>{
  expect(script).toContain('NFQ_STAGING_PROJECT_REF');
  expect(script).toContain('NFQ_STAGING_DB_URL');
  expect(script).toContain("stagingRef===productionRef");
  expect(script).toContain("referenceInHost");
  expect(script).toContain("referenceInUser");
 });
 it('only executes rollback-only security tests, not proposed migrations',()=>{
  expect(script).toContain('14h202_expert_registry_security.sql');
  expect(script).toContain('14h208_expert_registry_negative_auth.sql');
  expect(script).not.toContain('apply_migration');
  expect(script).not.toContain('20261118124500_nfq_expert_reference_registry_v1.sql');
  expect(script).toContain('--set=ON_ERROR_STOP=1');
 });
 it('does not log a database connection URI',()=>{
  expect(script).toContain("PGDATABASE:dbUrl");
  expect(script).toContain("replaceAll(dbUrl,'[redacted]')");
  expect(script).not.toContain('console.log(dbUrl)');
 });
});
