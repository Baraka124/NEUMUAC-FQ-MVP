import {defineConfig,devices} from '@playwright/test';

// This suite runs against a locally served Vite build and intercepted,
// deterministic test-only API records. It never contacts production Supabase
// or writes patient/scientific data.
export default defineConfig({
 testDir:'./e2e',
 testMatch:'therapy-browser-contract.spec.ts',
 retries:process.env.CI?1:0,
 reporter:process.env.CI?'github':'list',
 use:{baseURL:'http://127.0.0.1:4175',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'contract-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1366,height:900}}},
  {name:'contract-phone',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844},isMobile:true,hasTouch:true}}
 ],
 webServer:{
  command:'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort',
  url:'http://127.0.0.1:4175',
  reuseExistingServer:false,
  timeout:30000,
  env:{
   VITE_NFQ_READ_ONLY_ENABLED:'true',
   VITE_NFQ_SUPABASE_URL:'https://cftr-contract.invalid',
   VITE_NFQ_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_contract_public_key',
   VITE_NFQ_VARIANT_SOURCE:'variants',
   VITE_NFQ_READ_ACCESS_MODE:'anonymous'
  }
 }
});
