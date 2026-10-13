# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> F01-H2 login screen keyboard controls and a11y
- Location: e2e/auth.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Hide password' })
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: 'Hide password' }) with timeout 8000ms
  - waiting for getByRole('button', { name: 'Hide password' })

```

```yaml
- main:
  - region "About SearchPilot":
    - link "SearchPilot":
      - /url: /
      - img
      - text: SearchPilot
    - img
    - text: SEARCH INTELLIGENCE
    - heading "Turn search data into better decisions." [level=1]
    - paragraph: One workspace for projects, keywords, technical audits and reporting.
    - strong: SEO command center
    - text: Projects · Rankings · Audits Transparent data sources and clear next steps © 2026 SearchPilot
  - link "SearchPilot":
    - /url: /
  - img
  - paragraph: WELCOME BACK
  - heading "Sign in to SearchPilot" [level=2]
  - paragraph: Access your SEO workspace and continue where you left off.
  - text: Email address *
  - textbox "Email addressrequired":
    - /placeholder: you@company.com
  - text: Password *
  - textbox "Passwordrequired":
    - /placeholder: Your password
  - button "Show password":
    - img
  - button "Sign in" [disabled]:
    - text: Sign in
    - img
  - paragraph:
    - text: New to SearchPilot?
    - link "Create an account":
      - /url: /register
  - paragraph: Your data belongs to your workspace. Sample insights are clearly labelled.
```

```
Error: No uncaught console errors or local 5xx responses

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 10

- Array []
+ Array [
+   "console: Failed to load resource: the server responded with a status of 400 (Bad Request)",
+   "console: Failed to load resource: the server responded with a status of 400 (Bad Request)",
+   "console: Failed to load resource: the server responded with a status of 400 (Bad Request)",
+   "console: Failed to load resource: the server responded with a status of 400 (Bad Request)",
+   "console: Failed to load resource: the server responded with a status of 400 (Bad Request)",
+   "console: Failed to load resource: the server responded with a status of 400 (Bad Request)",
+   "console: Failed to load resource: the server responded with a status of 400 (Bad Request)",
+   "console: Failed to load resource: the server responded with a status of 400 (Bad Request)",
+ ]
```

# Test source

```ts
  1  | import {expect,test as base,type Page} from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | import {mkdir} from 'node:fs/promises';
  4  | import path from 'node:path';
  5  | 
  6  | export const test=base.extend<{page:Page}>({
  7  |   page:async({page},use,testInfo)=>{
  8  |     const violations:string[]=[];
  9  |     page.on('console',entry=>{
  10 |       if(entry.type()!=='error')return;
  11 |       // The public login/register pages intentionally probe session status.
  12 |       // A 401 from /api/auth/me is the expected anonymous response.
  13 |       if(entry.text().includes('401 (Unauthorized)') && /\/(login|register)(?:\?|$)/.test(page.url()))return;
  14 |       violations.push(`console: ${entry.text()}`);
  15 |     });
  16 |     page.on('pageerror',error=>violations.push(`pageerror: ${error.message}`));
  17 |     page.on('response',response=>{
  18 |       const url=new URL(response.url());
  19 |       if(url.origin===new URL(testInfo.project.use.baseURL as string).origin&&response.status()>=500)
  20 |         violations.push(`HTTP ${response.status()}: ${url.pathname}`);
  21 |     });
  22 |     await use(page);
> 23 |     expect.soft(violations,'No uncaught console errors or local 5xx responses').toEqual([]);
     |                                                                                 ^ Error: No uncaught console errors or local 5xx responses
  24 |   }
  25 | });
  26 | export {expect};
  27 | export async function screenshot(page:Page,testId:string){
  28 |   const folder=path.join(process.cwd(),'replica/clone-screens');
  29 |   await mkdir(folder,{recursive:true});
  30 |   await page.screenshot({path:path.join(folder,`${testId}-${page.viewportSize()?.width??'unknown'}.png`),fullPage:true,animations:'disabled'});
  31 | }
  32 | export async function axe(page:Page){
  33 |   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  34 |   expect.soft(result.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})),'Axe accessibility violations').toEqual([]);
  35 | }
  36 | export async function expectSample(page:Page){
  37 |   await expect(page.getByText(/sample analytics|sample data|illustrative/i).first()).toBeVisible();
  38 | }
  39 | export async function loginIfConfigured(page:Page){
  40 |   const email=process.env.SEARCHPILOT_E2E_EMAIL;
  41 |   const password=process.env.SEARCHPILOT_E2E_PASSWORD;
  42 |   if(!email||!password)return false;
  43 |   await page.goto('/login');
  44 |   await page.getByRole('textbox',{name:'Email address'}).fill(email);
  45 |   await page.locator('input[autocomplete="current-password"]').fill(password);
  46 |   await page.getByRole('button',{name:'Sign in'}).click();
  47 |   await expect(page).toHaveURL(/127\.0\.0\.1:3122\/$/);
  48 |   return true;
  49 | }
  50 | 
```