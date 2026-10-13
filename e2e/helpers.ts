import {expect,test as base,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

export const test=base.extend<{page:Page}>({
  page:async({page},use,testInfo)=>{
    const violations:string[]=[];
    page.on('console',entry=>{
      if(entry.type()!=='error')return;
      // The public login/register pages intentionally probe session status.
      // A 401 from /api/auth/me is the expected anonymous response.
      if(entry.text().includes('401 (Unauthorized)') && /\/(login|register)(?:\?|$)/.test(page.url()))return;
      violations.push(`console: ${entry.text()}`);
    });
    page.on('pageerror',error=>violations.push(`pageerror: ${error.message}`));
    page.on('response',response=>{
      const url=new URL(response.url());
      if(url.origin===new URL(testInfo.project.use.baseURL as string).origin&&response.status()>=500)
        violations.push(`HTTP ${response.status()}: ${url.pathname}`);
    });
    await use(page);
    expect.soft(violations,'No uncaught console errors or local 5xx responses').toEqual([]);
  }
});
export {expect};
export async function screenshot(page:Page,testId:string){
  const folder=path.join(process.cwd(),'replica/clone-screens');
  await mkdir(folder,{recursive:true});
  await page.screenshot({path:path.join(folder,`${testId}-${page.viewportSize()?.width??'unknown'}.png`),fullPage:true,animations:'disabled'});
}
export async function axe(page:Page){
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect.soft(result.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})),'Axe accessibility violations').toEqual([]);
}
export async function expectSample(page:Page){
  await expect(page.getByText(/sample analytics|sample data|illustrative/i).first()).toBeVisible();
}
export async function loginIfConfigured(page:Page){
  const email=process.env.SEARCHPILOT_E2E_EMAIL;
  const password=process.env.SEARCHPILOT_E2E_PASSWORD;
  if(!email||!password)return false;
  await page.goto('/login');
  await page.getByRole('textbox',{name:'Email address'}).fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button',{name:'Sign in'}).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:3122\/$/);
  return true;
}
