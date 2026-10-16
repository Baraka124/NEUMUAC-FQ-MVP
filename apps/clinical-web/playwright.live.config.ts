import {defineConfig,devices} from '@playwright/test';
const url=process.env.NFQ_LIVE_BASE_URL||'https://fq.neumact.org';
if(url!=='https://fq.neumact.org')throw new Error('Live acceptance permits only the official public fq.neumact.org origin.');
if(process.env.NFQ_LIVE_ACCEPTANCE!=='1')throw new Error('Set NFQ_LIVE_ACCEPTANCE=1 to opt in to live public read-only checks.');
export default defineConfig({
 testDir:'./e2e',
 testMatch:'live-research-acceptance.spec.ts',
 retries:0,
 reporter:process.env.CI?'github':'list',
 use:{baseURL:url,trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'live-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1366,height:900}}},
  {name:'live-mobile',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844},isMobile:true,hasTouch:true}}
 ]
});
