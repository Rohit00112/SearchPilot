# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> F01-E2 register required fields, long password and error messaging
- Location: e2e/auth.spec.ts:11:5

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Create account' })
    - locator resolved to <button disabled type="submit" aria-busy="true" class="ui-button ui-button--primary ui-button--md auth-submit">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    19 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

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

# Page snapshot

```yaml
- main [ref=e2]:
  - region "About SearchPilot" [ref=e3]:
    - link "SearchPilot" [ref=e4] [cursor=pointer]:
      - /url: /
    - generic [ref=e8]:
      - generic [ref=e9]: SEARCH INTELLIGENCE
      - heading "Turn search data into better decisions." [level=1] [ref=e12]
      - paragraph [ref=e13]: One workspace for projects, keywords, technical audits and reporting.
      - generic [ref=e14]:
        - generic [ref=e15]:
          - strong [ref=e16]: SEO command center
          - text: Projects · Rankings · Audits
        - text: Transparent data sources and clear next steps
    - text: © 2026 SearchPilot
  - generic [ref=e18]:
    - link "SearchPilot" [ref=e19] [cursor=pointer]:
      - /url: /
    - paragraph [ref=e25]: LET’S GET STARTED
    - heading "Create your account" [level=2] [ref=e26]
    - paragraph [ref=e27]: Set up your workspace to organize your SEO workflow.
    - generic [ref=e28]:
      - generic [ref=e29]:
        - generic [ref=e30]: Full name *
        - textbox "Full namerequired" [ref=e31]:
          - /placeholder: Your name
          - text: A
      - generic [ref=e32]:
        - generic [ref=e33]: Email address *
        - textbox "Email addressrequired" [ref=e34]:
          - /placeholder: you@company.com
          - text: qa@example.test
      - generic [ref=e35]:
        - generic [ref=e36]:
          - generic [ref=e37]: Password *
          - textbox "Passwordrequired" [active] [ref=e38]:
            - /placeholder: At least 12 characters
            - text: long-enough-local-password
        - button "Show password" [ref=e39]
      - button "Create account" [disabled] [ref=e43]
    - paragraph [ref=e48]:
      - text: Already have an account?
      - link "Sign in" [ref=e49] [cursor=pointer]:
        - /url: /login
    - paragraph [ref=e50]: Your data belongs to your workspace. Sample insights are clearly labelled.
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