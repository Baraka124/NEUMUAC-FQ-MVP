import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import {embedReleaseCommit} from './src/domain/releaseIdentity';

// Vercel supplies the exact deployed Git revision in its build environment.
// Local/preview builds without a full revision expose no claim of provenance.
const buildCommit=process.env.VERCEL_GIT_COMMIT_SHA||process.env.GITHUB_SHA||'';
export default defineConfig({
 plugins:[
  vue(),
  {name:'nfq-public-release-identity',apply:'build',transformIndexHtml:(html:string)=>embedReleaseCommit(html,buildCommit)}
 ],
 base:'./',
 build:{outDir:'dist',emptyOutDir:true}
});
