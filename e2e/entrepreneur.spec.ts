import {test,expect,loginIfConfigured,axe} from './helpers';

test('Evidence P0: signed-in overview never masquerades example metrics as measured SEO',async({page})=>{
  test.skip(!process.env.SEARCHPILOT_E2E_EMAIL,'Requires isolated seeded workspace user');
  await loginIfConfigured(page);
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Verified workspace snapshot'})).toBeVisible();
  await expect(page.getByText('Workspace data · source-labelled')).toHaveCount(1);
  await expect(page.getByText('36.2K')).toHaveCount(0);
  await expect(page.getByText(/No synthetic measurements appear/)).toBeVisible();
  await axe(page);
});

test('Evidence P1: guided setup and usage are factual and navigable',async({page})=>{
  test.skip(!process.env.SEARCHPILOT_E2E_EMAIL,'Requires isolated seeded workspace user');
  await loginIfConfigured(page);
  await page.goto('/get-started');
  await expect(page.getByRole('heading',{name:/From your website to a useful SEO report/})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Your saved workspace usage'})).toBeVisible();
  await expect(page.getByText(/There are currently no paid plans/)).toBeVisible();
  await expect(page.getByText('Average position')).toBeVisible();
  await axe(page);
});

test('Evidence P0: client report builder offers editable templates without fake delivery',async({page})=>{
  test.skip(!process.env.SEARCHPILOT_E2E_EMAIL,'Requires isolated seeded workspace user');
  await loginIfConfigured(page);
  await page.goto('/report-builder');
  await expect(page.getByRole('heading',{name:'SearchPilot report builder'})).toBeVisible();
  await page.getByRole('button',{name:/Client update.*Use template/i}).click();
  await expect(page.getByRole('textbox',{name:'Report title'})).toHaveValue('Client SEO update');
  await expect(page.getByText(/No verified SERP, traffic, or backlink metrics/)).toBeVisible();
  await axe(page);
});
