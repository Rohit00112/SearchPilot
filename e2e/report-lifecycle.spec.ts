import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import pg from 'pg';

// This suite creates real records. It must never run against a persistent DB.
const localUrl=process.env.SEARCHPILOT_E2E_URL||'http://127.0.0.1:3122';
const qaDb=process.env.TEST_DATABASE_URL;
const dbTarget=qaDb?new URL(qaDb):null;
const safe=Boolean(
  process.env.SEARCHPILOT_REPORT_QA==='disposable'
  && /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(localUrl)
  && dbTarget
  && /^(localhost|127\.0\.1|127\.0\.0\.1)$/.test(dbTarget.hostname)
  && /(?:test|qa|scratch|regression|ephemeral)/i.test(dbTarget.pathname)
  && (!process.env.APP_ORIGIN||process.env.APP_ORIGIN===localUrl)
);

test('report lifecycle: authenticated create/edit, explicitly consented share, restricted public outline, revoke',async({page})=>{
  test.skip(!safe,'Requires SEARCHPILOT_REPORT_QA=disposable, isolated local server and TEST_DATABASE_URL.');
  test.setTimeout(100000);
  const db=new pg.Client({connectionString:qaDb!});
  try{
    await db.connect();
    const dbName=(await db.query('SELECT current_database() AS name')).rows[0].name as string;
    expect(dbName).toMatch(/test|qa|scratch|regression|ephemeral/i);
    const suffix=randomUUID().slice(0,10);
    const email=`report-browser-${suffix}@example.test`;
    const post=async(path:string,data:unknown)=>{
      const response=await page.request.post(path,{data,headers:{origin:localUrl}});
      expect(response.status(),await response.text()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(300);
      return response.json();
    };
    const account=await post('/api/auth/register',{email,password:'QA-browser-password-12345',displayName:'Report QA'});
    const accountFound=await db.query('SELECT id FROM local_users WHERE email=$1',[email]);
    expect(accountFound.rowCount).toBe(1); // Confirms browser server uses this disposable DB.
    expect(account.activeWorkspaceId).toBeTruthy();
    const projectName='Report lifecycle '+suffix,domain=`reports-${suffix}.example.test`;
    const project=await post('/api/projects',{name:projectName,domain});
    expect(project.project.id).toBeTruthy();

    await page.goto('/report-builder');
    await expect(page.getByRole('heading',{name:'SearchPilot report builder'})).toBeVisible();
    await page.getByLabel('Project',{exact:true}).selectOption(project.project.id);
    await expect(page.getByLabel('Saved layouts for this project')).toBeEnabled();
    await page.getByRole('button',{name:/Client update.*Use template/i}).click();
    const title=page.getByRole('textbox',{name:'Report title'});
    await title.fill('Client lifecycle '+suffix);
    await page.getByRole('textbox',{name:/Report author notes/}).fill('PRIVATE CLIENT NOTES '+suffix);
    await page.getByRole('button',{name:'Save layout'}).click();
    await expect(page.getByRole('status').filter({hasText:'Report layout saved'})).toBeVisible();
    await expect(page.getByLabel('Saved layouts for this project')).toHaveValue(/^[0-9a-f-]{36}$/);
    const reportId=await page.getByLabel('Saved layouts for this project').inputValue();
    await title.fill('Revised client lifecycle '+suffix);
    await page.getByRole('button',{name:'Update layout'}).click();
    await expect(page.getByRole('status').filter({hasText:'Report layout saved'})).toBeVisible();

    const create=page.getByRole('button',{name:'Create expiring share link'});
    await expect(create).toBeDisabled();
    await page.getByLabel('Expiry').selectOption('3');
    await page.getByRole('checkbox',{name:/I explicitly approve sharing/}).check();
    const createdShareResponse=page.waitForResponse(r=>r.url().endsWith('/api/report-shares')&&r.request().method()==='POST');
    await create.click();
    const shareResponse=await createdShareResponse;
    expect(shareResponse.status()).toBe(201);
    const share=await shareResponse.json();
    expect(share.share.reportId).toBe(reportId);
    expect(share.delivery).toBe('manual_copy_only');
    const days=(Date.parse(share.share.expiresAt)-Date.parse(share.share.createdAt))/86400000;
    expect(days).toBeGreaterThan(2.9);
    expect(days).toBeLessThanOrEqual(3.01);
    const shareUrl=await page.getByRole('textbox',{name:'New share URL'}).inputValue();
    expect(shareUrl).toContain('/shared-report/');
    await expect(page.getByRole('status').filter({hasText:'Limited read-only link created'})).toBeVisible();

    const publicContext=await page.context().browser()!.newContext();
    try{
      const publicPage=await publicContext.newPage();
      await publicPage.goto(shareUrl);
      await expect(publicPage.getByRole('heading',{name:'Revised client lifecycle '+suffix})).toBeVisible();
      await expect(publicPage.getByText(domain)).toBeVisible();
      await expect(publicPage.getByText(/Limited read-only share/)).toBeVisible();
      await expect(publicPage.getByRole('heading',{name:'Report outline'})).toBeVisible();
      await expect(publicPage.getByRole('listitem')).toHaveCount(5);
      await expect(publicPage.getByText('PRIVATE CLIENT NOTES '+suffix)).toHaveCount(0);
      const publicApi=await publicContext.request.get(localUrl+'/api/report-shares/'+share.token);
      expect(publicApi.status()).toBe(200);
      expect(publicApi.headers()['cache-control']).toMatch(/no-store/);
      const payload=await publicApi.json();
      expect(Object.keys(payload.report).sort()).toEqual(['domain','expiresAt','sections','title']);
      expect(payload.scope).toBe('title_domain_headings_only');
      expect(payload.report.title).toBe('Revised client lifecycle '+suffix);
      expect(JSON.stringify(payload)).not.toContain('PRIVATE CLIENT NOTES');
      expect(JSON.stringify(payload)).not.toMatch(/clicks|impressions|auditScore|workspaceId|refresh_token/i);

      await expect(page.getByRole('button',{name:'Revoke'})).toBeVisible();
      await page.getByRole('button',{name:'Revoke'}).click();
      await expect(page.getByRole('status').filter({hasText:'Share link revoked'})).toBeVisible();
      await expect(page.getByText('Revoked',{exact:false})).toBeVisible();
      const revoked=await publicContext.request.get(localUrl+'/api/report-shares/'+share.token);
      expect(revoked.status()).toBe(404);
      await publicPage.reload();
      await expect(publicPage.getByRole('heading',{name:'Revised client lifecycle '+suffix})).toHaveCount(0);
      expect((await publicContext.request.get(localUrl+'/shared-report/'+share.token)).status()).toBe(404);
    }finally{await publicContext.close();}
  }finally{await db.end().catch(()=>{});}
});

test('switching reports ignores a late share-list response and clears stale links',async({page})=>{
  test.skip(!safe,'Requires disposable QA DB; no persistent database may be used.');
  test.setTimeout(75000);
  const db=new pg.Client({connectionString:qaDb!});
  try{
    await db.connect();
    const suffix=randomUUID().slice(0,10),email=`report-switch-${suffix}@example.test`;
    const post=async(path:string,data:unknown)=>{
      const response=await page.request.post(path,{data,headers:{origin:localUrl}});
      expect(response.status()).toBeLessThan(300);
      return response.json();
    };
    const owner=await post('/api/auth/register',{email,password:'QA-browser-password-12345',displayName:'Report Switch QA'});
    expect((await db.query('SELECT id FROM local_users WHERE email=$1',[email])).rowCount).toBe(1);
    expect(owner.activeWorkspaceId).toBeTruthy();
    const firstProject=(await post('/api/projects',{name:'Alpha '+suffix,domain:`alpha-${suffix}.example.test`})).project.id;
    const secondProject=(await post('/api/projects',{name:'Beta '+suffix,domain:`beta-${suffix}.example.test`})).project.id;
    const first=(await post('/api/report-definitions',{projectId:firstProject,title:'First '+suffix,blocks:['overview']})).report.id;
    const second=(await post('/api/report-definitions',{projectId:firstProject,title:'Second '+suffix,blocks:['notes']})).report.id;
    await page.goto('/report-builder');
    await page.getByLabel('Project',{exact:true}).selectOption(firstProject);
    const saved=page.getByLabel('Saved layouts for this project');
    await expect(saved).toBeEnabled();
    let release!:()=>void;
    const blocked=new Promise<void>(resolve=>{release=resolve;});
    let intercept!:()=>void;
    const started=new Promise<void>(resolve=>{intercept=resolve;});
    await page.route('**/api/report-shares?reportId='+first,async route=>{
      intercept();
      await blocked;
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({shares:[{
        id:randomUUID(),reportId:first,createdAt:new Date().toISOString(),
        expiresAt:new Date(Date.now()+86400000).toISOString(),revokedAt:null,
      }]})});
    });
    await saved.selectOption(first);
    await started;
    await saved.selectOption(second);
    await expect(page.getByText('No share links for this saved layout.')).toBeVisible();
    release();
    await expect(page.getByRole('button',{name:'Revoke'})).toHaveCount(0);
    await saved.selectOption(first);
    await page.getByLabel('Project',{exact:true}).selectOption(secondProject);
    await expect(page.getByText('Save a report layout first to enable sharing.')).toBeVisible();
    await expect(page.getByRole('button',{name:'Revoke'})).toHaveCount(0);
  }finally{await db.end().catch(()=>{});}
});
