import {test,expect,loginIfConfigured,axe,screenshot} from './helpers';

test('F01-P0 project deletion requires confirmation and updates list',async({page})=>{
  test.skip(!process.env.SEARCHPILOT_E2E_EMAIL,'Requires isolated seeded workspace owner');
  await loginIfConfigured(page);
  await page.goto('/projects');
  await page.getByRole('button',{name:'Create new project'}).click();
  const dialog=page.getByRole('dialog');
  const label='Deletion QA '+Date.now();
  await dialog.getByRole('textbox',{name:'Project name'}).fill(label);
  await dialog.getByRole('textbox',{name:'Website domain'}).fill('delete-qa.example.test');
  await dialog.getByRole('button',{name:/Create project/}).click();
  const card=page.locator('.project-card').filter({hasText:label});
  await expect(card).toBeVisible();
  page.once('dialog',dialog=>dialog.accept());
  await card.getByRole('button',{name:'Delete'}).click();
  await expect(card).toHaveCount(0);
  await screenshot(page,'F01-P0-delete');
});

test('F16 new SEO tool and report navigation shows sourced content states',async({page})=>{
  test.skip(!process.env.SEARCHPILOT_E2E_EMAIL,'Requires isolated seeded workspace owner');
  await loginIfConfigured(page);
  await page.goto('/seo-tools');
  await expect(page.getByRole('heading',{name:'SEO research tools'})).toBeVisible();
  await expect(page.getByRole('link',{name:/Open tool/}).first()).toBeVisible();
  await page.goto('/report-builder');
  await expect(page.getByRole('heading',{name:'SearchPilot report builder'})).toBeVisible();
  await expect(page.getByText('Project records and user-entered measurements only.')).toBeVisible();
  await page.goto('/search-console');
  await expect(page.getByRole('heading',{name:'Google Search Console'})).toBeVisible();
  await axe(page);
  await screenshot(page,'F16-provider-aware');
});
