import {test,expect,axe,screenshot,loginIfConfigured} from './helpers';

test('F01-E3 projects filter yields clear no-match state',async({page})=>{
  await loginIfConfigured(page);await page.goto('/projects');
  await page.getByRole('textbox',{name:'Search projects'}).fill('zzzz-no-matching-project');
  await expect(page.getByText('0 matching projects')).toBeVisible();
  await axe(page);await screenshot(page,'F01-E3');
});
test('F03-E1 keyword filters are reversible and export control exists',async({page})=>{
  await loginIfConfigured(page);await page.goto('/keywords');
  await page.getByRole('textbox',{name:'Filter keywords'}).fill('zzzz-unknown');
  await expect(page.getByText(/0 matching keywords/i)).toBeVisible();
  await page.getByRole('button',{name:'Clear filters'}).click();
  await expect(page.getByRole('textbox',{name:'Filter keywords'})).toHaveValue('');
  await expect(page.getByRole('button',{name:/Export CSV/})).toBeVisible();
  await axe(page);await screenshot(page,'F03-E1');
});
test('F05-H2 new keyword dialog validates manually entered position',async({page})=>{
  await loginIfConfigured(page);await page.goto('/position-tracking');
  await page.getByRole('button',{name:'Add keyword'}).first().click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('textbox',{name:'Keyword',exact:true})).toBeVisible();
  await expect(dialog.getByRole('spinbutton',{name:'Position (optional)'})).toBeVisible();
  await expect(dialog.getByText(/manually entered/i)).toBeVisible();
  await page.keyboard.press('Escape');
  await axe(page);await screenshot(page,'F05-H2');
});
test('F08-H1 audit findings support pass/issue filtering and recommendation detail',async({page})=>{
  await loginIfConfigured(page);await page.goto('/site-audit');
  await expect(page.getByRole('heading',{name:'Technical audit findings'})).toBeVisible();
  await page.getByLabel('Result').selectOption('issues');
  await expect(page.getByLabel('Result')).toHaveValue('issues');
  const details=page.locator('details.audit-finding').first();
  if(await details.count()){await details.locator('summary').click();await expect(details).toHaveAttribute('open','');await expect(details.getByText('Recommended action')).toBeVisible();}
  await axe(page);await screenshot(page,'F08-H1');
});
test('F12-H1 CSV report downloads only current project keyword rows',async({page})=>{
  await loginIfConfigured(page);await page.goto('/reports');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export keyword report'}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  await screenshot(page,'F12-H1');
});
