import {describe,it,expect} from 'vitest';
import {embedReleaseCommit,normalizeBuildCommit,RELEASE_COMMIT_META} from './releaseIdentity';
const sha='c617ce8b8ddd1504b7763b00c6fec3264d7b5c3c';
describe('14H23 public build identity is verified, inert provenance',()=>{
 it('embeds one public commit marker into the HTML head',()=>{
  const html=embedReleaseCommit('<html><head><title>neumuacFQ</title></head><body></body></html>',sha);
  expect(html).toContain(`<meta name="${RELEASE_COMMIT_META}" content="${sha}"/>`);
  expect(html.match(/nfq-release-commit/g)).toHaveLength(1);
 });
 it('normalizes full uppercase SHA without accepting branch names or abbreviated hashes',()=>{
  expect(normalizeBuildCommit(sha.toUpperCase())).toBe(sha);
  for(const bad of ['main','abc1234','',null,undefined,0,'a'.repeat(39),'f'.repeat(41),'<script>alert(1)</script>']){
   expect(normalizeBuildCommit(bad)).toBeNull();
   expect(embedReleaseCommit('<head></head>',bad)).toBe('<head></head>');
  }
 });
 it('does not add metadata when the page has no HTML head',()=>{
  expect(embedReleaseCommit('<body>plain</body>',sha)).toBe('<body>plain</body>');
 });
});
