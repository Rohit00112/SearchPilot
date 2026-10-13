import {test,expect,loginIfConfigured,axe} from './helpers';

test('First-party opportunities are explicitly GSC-sourced and can be empty',async({page})=>{
  test.skip(!process.env.SEARCHPILOT_E2E_EMAIL,'Requires isolated QA account');
  await loginIfConfigured(page);
  await page.goto('/opportunities');
  await expect(page.getByRole('heading',{name:'Search opportunities'})).toBeVisible();
  await expect(page.getByText(/not independently verified rankings or guaranteed traffic gains/i)).toBeVisible();
  await expect(page.getByRole('link',{name:'Manage Search Console'})).toBeVisible();
  await axe(page);
});

test('Manual rank history never displays demo trends in authenticated workspace',async({page})=>{
  test.skip(!process.env.SEARCHPILOT_E2E_EMAIL,'Requires isolated QA account with a project');
  await loginIfConfigured(page);
  await page.goto('/position-tracking');
  await expect(page.getByRole('heading',{name:'Recorded ranking history'})).toBeVisible();
  await expect(page.getByText('MANUAL · UNVERIFIED')).toBeVisible();
  await expect(page.getByText(/Sample ranking trend/)).toHaveCount(0);
  await axe(page);
});

test('Report builder documents limited sharing and consent',async({page})=>{
  test.skip(!process.env.SEARCHPILOT_E2E_EMAIL,'Requires isolated QA account with report');
  await loginIfConfigured(page);
  await page.goto('/report-builder');
  await expect(page.getByRole('heading',{name:'SearchPilot report builder'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Optional read-only share link'})).toBeVisible();
  await expect(page.getByText(/Reports are private by default/)).toBeVisible();
  await axe(page);
});
