/**
 * Isolated HTTP coverage for SEO import/report definitions. Never use a live DB.
 * BASE_URL=http://127.0.0.1:3136 node --test tests/seo-features-regression.mjs
 * The server MUST point at a throwaway migrated PostgreSQL database.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.BASE_URL;
if(!base||!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(base))throw Error('BASE_URL must be an isolated loopback server.');
const origin=process.env.APP_ORIGIN||base;
const suffix=randomUUID().slice(0,8);
const users=[{email:`seo-a-${suffix}@example.test`,cookie:'',project:''},{email:`seo-b-${suffix}@example.test`,cookie:'',project:''}];
async function request(path,{user,method='GET',data,originHeader=origin}={}){
  const headers={};if(user?.cookie)headers.cookie=user.cookie;
  if(method!=='GET'&&method!=='HEAD')headers.origin=originHeader;
  if(data!==undefined)headers['content-type']='application/json';
  const res=await fetch(base+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data),redirect:'manual',signal:AbortSignal.timeout(10000)});
  const type=res.headers.get('content-type')||'';
  return {status:res.status,data:type.includes('application/json')?await res.json():await res.text(),headers:res.headers};
}
function status(result,want){assert.equal(result.status,want,JSON.stringify(result.data).slice(0,350));return result.data;}
test('tenant-scoped SEO imports, campaigns and saved report definitions', {timeout:45000}, async t=>{
  await t.test('register owners and projects',async()=>{
    for(const [index,user] of users.entries()){
      const account=await request('/api/auth/register',{method:'POST',data:{email:user.email,displayName:'Feature tester',password:'Testing-a-secure-password-12345'}});
      status(account,201);user.cookie=account.headers.get('set-cookie')?.split(';')[0];assert.ok(user.cookie);
      const project=await request('/api/projects',{user,method:'POST',data:{name:'QA project '+index,domain:index+'.example.test'}});
      user.project=status(project,201).project.id;
    }
  });
  let campaignId='',reportId='';
  await t.test('create tracking campaign and refuse foreign project',async()=>{
    const data={projectId:users[0].project,name:'US desktop',engine:'google',device:'desktop',country:'US',locale:'en-US'};
    const res=await request('/api/seo/campaigns',{user:users[0],method:'POST',data});
    campaignId=status(res,201).campaign.id;
    assert.equal((await request('/api/seo/campaigns?projectId='+users[0].project,{user:users[1]})).status,404);
    assert.equal((await request('/api/seo/campaigns',{user:users[1],method:'POST',data})).status,404);
  });
  await t.test('import ranked keyword observation with explicit unverified provenance',async()=>{
    const res=await request('/api/seo/import',{user:users[0],method:'POST',data:{
      projectId:users[0].project,kind:'organic',campaignId,sourceLabel:'User spreadsheet',
      items:[{keyword:'search pilot',position:5,observedAt:'2026-10-01T10:00:00Z'}]
    }});
    const batch=status(res,201).batch;assert.equal(batch.verified,false);
    const rows=status(await request('/api/seo/data?kind=organic&projectId='+users[0].project,{user:users[0]}),200);
    assert.equal(rows.rows.length,1);assert.equal(rows.rows[0].position,5);assert.equal(rows.rows[0].verified,false);
    assert.equal(rows.provenance.sourceType,'user_import');
    assert.equal((await request('/api/seo/data?kind=organic&projectId='+users[0].project,{user:users[1]})).status,404);
  });
  await t.test('keyword and backlink source imports remain user-supplied',async()=>{
    const keyword=await request('/api/seo/import',{user:users[0],method:'POST',data:{
      projectId:users[0].project,kind:'keywords',sourceLabel:'Permissioned CSV',
      items:[{keyword:'independent metrics',country:'US',locale:'en-US',volume:13,difficulty:22,intent:'informational',observedAt:'2026-10-01T10:00:00Z'}]
    }});
    status(keyword,201);
    const links=await request('/api/seo/import',{user:users[0],method:'POST',data:{
      projectId:users[0].project,kind:'backlinks',sourceLabel:'Own export',
      items:[{sourceUrl:'https://news.example/story',targetUrl:'https://0.example.test/',linkType:'follow',status:'unknown',observedAt:'2026-10-01T10:00:00Z'}]
    }});
    status(links,201);
    const rows=status(await request('/api/seo/data?kind=backlinks&projectId='+users[0].project,{user:users[0]}),200);
    assert.equal(rows.rows[0].sourceLabel,'Own export');
  });
  await t.test('bad input and cross-tenant imports cannot write',async()=>{
    const other=await request('/api/seo/import',{user:users[1],method:'POST',data:{
      projectId:users[0].project,kind:'keywords',sourceLabel:'not allowed',
      items:[{keyword:'hijack',country:'US',locale:'en-US',observedAt:'2026-10-01T10:00:00Z'}]
    }});
    status(other,404);
    const invalid=await request('/api/seo/import',{user:users[0],method:'POST',data:{
      projectId:users[0].project,kind:'backlinks',sourceLabel:'Own export',
      items:[{sourceUrl:'http://localhost/private',targetUrl:'https://0.example.test/',linkType:'follow',status:'live',observedAt:'2026-10-01T10:00:00Z'}]
    }});
    status(invalid,400);
  });
  await t.test('report definitions saved, reordered and private by workspace',async()=>{
    const report=await request('/api/report-definitions',{user:users[0],method:'POST',data:{
      projectId:users[0].project,title:'SEO QA report',blocks:['overview','keywords','audit']
    }});
    reportId=status(report,201).report.id;
    const updated=await request('/api/report-definitions?id='+reportId,{user:users[0],method:'PATCH',data:{blocks:['audit','overview'],title:'Revised report'}});
    assert.deepEqual(status(updated,200).report.blocks,['audit','overview']);
    const list=status(await request('/api/report-definitions?projectId='+users[0].project,{user:users[0]}),200);
    assert.equal(list.reports.length,1);
    assert.equal((await request('/api/report-definitions?id='+reportId,{user:users[1]})).status,404);
    assert.equal((await request('/api/report-definitions?id='+reportId,{user:users[1],method:'DELETE'})).status,404);
    status(await request('/api/report-definitions?id='+reportId,{user:users[0],method:'DELETE'}),200);
  });
  await t.test('no anonymous access and CSRF denial',async()=>{
    assert.equal((await request('/api/report-definitions?id='+reportId)).status,401);
    assert.equal((await request('/api/seo/data?projectId='+users[0].project+'&kind=keywords')).status,401);
    assert.equal((await request('/api/seo/campaigns',{user:users[0],method:'POST',originHeader:'https://malicious.example',data:{
      projectId:users[0].project,name:'forged',engine:'google',device:'desktop',country:'US',locale:'en-US'
    }})).status,403);
  });
});
