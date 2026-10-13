import {defineConfig,devices} from '@playwright/test';

const baseURL=process.env.SEARCHPILOT_E2E_URL || 'http://127.0.0.1:3122';
if(!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(baseURL))throw new Error('E2E is restricted to the local SearchPilot server.');

export default defineConfig({
  testDir:'./e2e',
  testMatch:/.*\.spec\.ts/,
  timeout:30000,
  expect:{timeout:8000},
  fullyParallel:false,
  workers:1,
  forbidOnly:!!process.env.CI,
  retries:process.env.CI?1:0,
  reporter:[['list'],['html',{open:'never',outputFolder:'replica/playwright-report'}]],
  outputDir:'replica/test-results',
  use:{baseURL,trace:'retain-on-failure',screenshot:'only-on-failure',video:'retain-on-failure',actionTimeout:10000},
  projects:[
    {name:'desktop-1440',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
    {name:'mobile-390',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  ],
});
