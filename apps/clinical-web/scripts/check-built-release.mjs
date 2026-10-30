import {readFileSync} from 'node:fs';
import {comparePublishedCommit} from './check-public-release.mjs';

const expected=process.env.VERCEL_GIT_COMMIT_SHA||process.env.GITHUB_SHA;
let html='';
try{html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');}
catch{
 console.error('Release build audit: missing dist/index.html. Build the Vue application first.');
 process.exit(1);
}
const result=comparePublishedCommit(html,expected);
console.log(`Release build audit: ${result.code} — ${result.detail}`);
if(!result.ok)process.exitCode=1;
