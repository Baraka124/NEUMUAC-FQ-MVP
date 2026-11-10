import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',
 testMatch:['variant-curation-access.spec.ts','account-profile.spec.ts'],
 retries:0,
 reporter:process.env.CI?'github':'list',
 use:{baseURL:'http://127.0.0.1:4180',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'curation-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1280,height:840}}}],
 webServer:{
  command:'VITE_NFQ_READ_ONLY_ENABLED=true VITE_NFQ_VARIANT_SOURCE=variants VITE_NFQ_SUPABASE_URL=https://example.supabase.co VITE_NFQ_SUPABASE_PUBLISHABLE_KEY=sb_publishable_testkey npm run dev -- --host 127.0.0.1 --port 4180 --strictPort',
  url:'http://127.0.0.1:4180',
  reuseExistingServer:!process.env.CI,
  timeout:30000
 }
});
