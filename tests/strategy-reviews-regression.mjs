/**
 * Isolated HTTP regression for 009 strategy, human backlink reviews and SEO gap.
 *
 * Start an isolated SearchPilot API server with migrations 001–009 already
 * applied to a disposable database, then run:
 *   BASE_URL=http://127.0.0.1:3137 \
 *   TEST_DATABASE_URL=postgresql://.../sp_strategy_reviews_test \
 *   node --test tests/strategy-reviews-regression.mjs
 *
 * TEST_DATABASE_URL must identify the SAME disposable DB as the API server.
 * This script never migrates databases, contacts external websites or runs a
 * build. Unique test users and project records are retained as QA fixtures.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';

const base=process.env.BASE_URL,connectionString=process.env.TEST_DATABASE_URL;
if(!base||!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(base))throw Error('BASE_URL must identify an isolated loopback API server.');
if(!connectionString)throw Error('TEST_DATABASE_URL is mandatory for verifying disposable DB ownership.');
const parsed=new URL(connectionString),database=decodeURIComponent(parsed.pathname.slice(1));
if(!/(test|qa|verify|scratch|regression|ephemeral)/i.test(database))throw Error('Refusing a non-disposable DB name.');
if(!/^(?:127\.0\.0\.1|localhost)$/.test(parsed.hostname))throw Error('Disposable PostgreSQL must be local.');
const origin=process.env.APP_ORIGIN||base;
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))throw Error('APP_ORIGIN must be a local API origin.');
const db=new pg.Client({connectionString});
const suffix=randomUUID().slice(0,12);
const accounts=[0,1].map(index=>({email:'strategy-'+index+'-'+suffix+'@example.test',cookie:'',workspace:'',project:'',comparison:''}));
const note='Human QA note '+suffix;
const iso='2026-10-01T10:00:00Z';
let passed=0,failed=0;

async function http(path,{account,method='GET',body,workspace,requestOrigin=origin,contentType='application/json'}={}){
 const headers={};
 if(account?.cookie)headers.cookie=account.cookie;
 if(workspace)headers['x-workspace-id']=workspace;
 if(method!=='GET'&&method!=='HEAD'&&requestOrigin)headers.origin=requestOrigin;
 if(body!==undefined)headers['content-type']=contentType;
 const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:contentType==='application/json'?JSON.stringify(body):String(body),redirect:'manual',signal:AbortSignal.timeout(10000)});
 const data=response.headers.get('content-type')?.includes('application/json')?await response.json():await response.text();
 return {status:response.status,data,headers:response.headers};
}
const expect=(result,status)=>{assert.equal(result.status,status,JSON.stringify(result.data).slice(0,350));return result.data;};
async function check(t,name,run){await t.test(name,async()=>{try{await run();passed++}catch(error){failed++;throw error}})}
const query=(path,params)=>path+'?'+new URLSearchParams(params);
const strategy='/api/seo/strategy',reviews='/api/seo/backlink-reviews',gap='/api/seo/gap';
let list='',cluster='',keyword='',backlink='';

test('009 strategy, manual backlink reviews, gap, tenants and CSRF', {timeout:120000},async t=>{
 try{
  await check(t,'safety: API and test DB refer to same disposable PostgreSQL instance',async()=>{
   await db.connect();
   const info=await db.query('SELECT current_database() AS name');
   assert.equal(info.rows[0].name,database);
   const installed=await db.query("SELECT version FROM schema_migrations WHERE version='009_strategy_reviews'");
   assert.equal(installed.rows.length,1,'Migration 009 must be applied before testing');
  });
  await check(t,'register two independent owners and create three projects',async()=>{
   for(const [i,a] of accounts.entries()){
    const reg=await http('/api/auth/register',{method:'POST',body:{email:a.email,displayName:'Strategy Regression',password:'long-passphrase-for-tests-'+suffix}});
    const body=expect(reg,201);a.cookie=reg.headers.get('set-cookie')?.split(';',1)[0];
    a.workspace=body.activeWorkspaceId;
    assert.ok(a.cookie?.startsWith('sp_session=')&&a.workspace);
    const project=await http('/api/projects',{account:a,method:'POST',body:{name:'Strategy QA '+i,domain:'strategy'+i+'.example.test'}});
    a.project=expect(project,201).project.id;
   }
   assert.notEqual(accounts[0].workspace,accounts[1].workspace);
   const comparison=await http('/api/projects',{account:accounts[0],method:'POST',body:{name:'Owned comparison',domain:'compare.example.test'}});
   accounts[0].comparison=expect(comparison,201).project.id;
  });
  await check(t,'anonymous requests cannot read strategy, reviews or gap',async()=>{
   for(const path of [query(strategy,{kind:'lists',projectId:accounts[0].project}),query(reviews,{projectId:accounts[0].project}),query(gap,{projectId:accounts[0].project,competitorId:accounts[0].comparison})]){
    expect(await http(path),401);
   }
  });
  await check(t,'strategy list creation and read use manual provenance',async()=>{
   const a=accounts[0];
   const created=await http(strategy,{account:a,method:'POST',body:{kind:'lists',projectId:a.project,title:'Human strategy',description:note}});
   const item=expect(created,201).item;list=item.id;
   assert.equal(item.sourceType,'user_manual');assert.equal(item.verified,false);assert.equal(item.sample,false);
   const found=expect(await http(query(strategy,{kind:'lists',projectId:a.project}),{account:a}),200);
   assert.ok(found.rows.some(r=>r.id===list));
  });
  await check(t,'clusters and keywords keep notes, priority and parent relationships',async()=>{
   const a=accounts[0];
   cluster=expect(await http(strategy,{account:a,method:'POST',body:{kind:'clusters',projectId:a.project,listId:list,title:'On-page cluster',notes:note}}),201).item.id;
   const result=await http(strategy,{account:a,method:'POST',body:{kind:'keywords',projectId:a.project,listId:list,clusterId:cluster,phrase:'search pilot product',priority:2,notes:note}});
   const entry=expect(result,201).item;keyword=entry.id;
   assert.equal(entry.priority,2);assert.equal(entry.clusterId,cluster);
   const rows=expect(await http(query(strategy,{kind:'keywords',projectId:a.project,listId:list}),{account:a}),200).rows;
   assert.ok(rows.some(row=>row.id===keyword&&row.notes===note));
  });
  await check(t,'strategy PATCH updates fields and DELETE removes only owned records',async()=>{
   const a=accounts[0];
   const updated=await http(strategy,{account:a,method:'PATCH',body:{kind:'keywords',id:keyword,projectId:a.project,priority:5,notes:'Edited by human'}});
   assert.equal(expect(updated,200).item.priority,5);
   const temporary=expect(await http(strategy,{account:a,method:'POST',body:{kind:'clusters',projectId:a.project,listId:list,title:'Removable cluster'}}),201).item.id;
   expect(await http(strategy,{account:a,method:'DELETE',body:{kind:'clusters',projectId:a.project,id:temporary}}),200);
   const rows=expect(await http(query(strategy,{kind:'clusters',projectId:a.project,listId:list}),{account:a}),200).rows;
   assert.ok(!rows.some(row=>row.id===temporary));
  });
  await check(t,'cross-tenant strategy reads and mutations are blocked',async()=>{
   const a=accounts[0],b=accounts[1];
   expect(await http(query(strategy,{kind:'lists',projectId:a.project}),{account:b}),404);
   expect(await http(query(strategy,{kind:'clusters',projectId:a.project,listId:list}),{account:b}),404);
   expect(await http(strategy,{account:b,method:'POST',body:{kind:'clusters',projectId:a.project,listId:list,title:'Foreign cluster'}}),404);
   expect(await http(strategy,{account:b,method:'PATCH',body:{kind:'lists',id:list,projectId:a.project,title:'Hijacked'}}),404);
   expect(await http(strategy,{account:b,method:'DELETE',body:{kind:'keywords',id:keyword,projectId:a.project}}),404);
   expect(await http(query(strategy,{kind:'lists',projectId:a.project}),{account:a}),200);
  });
  await check(t,'invalid strategy types, lengths and references are rejected',async()=>{
   const a=accounts[0];
   for(const body of [
    {kind:'keywords',projectId:a.project,listId:list,phrase:'',priority:2},
    {kind:'keywords',projectId:a.project,listId:list,phrase:'invalid priority',priority:9},
    {kind:'clusters',projectId:a.project,listId:list,title:'x'.repeat(121)},
    {kind:'keywords',projectId:a.project,listId:list,clusterId:accounts[1].project,phrase:'wrong cluster'},
    {kind:'invalid',projectId:a.project,title:'Unsupported'}
   ])assert.ok([400,404].includes((await http(strategy,{account:a,method:'POST',body})).status));
  });
  await check(t,'backlink fixtures are imported as unverified user-supplied data',async()=>{
   const a=accounts[0];
   expect(await http('/api/seo/import',{account:a,method:'POST',body:{
    projectId:a.project,kind:'backlinks',sourceLabel:'QA user export',
    items:[{sourceUrl:'https://source.example.test/link',targetUrl:'https://strategy0.example.test/',linkType:'follow',status:'unknown',observedAt:iso}]
   }}),201);
   const rows=expect(await http(query(reviews,{projectId:a.project}),{account:a}),200);
   backlink=rows.rows.find(r=>r.sourceUrl==='https://source.example.test/link')?.backlinkId;
   assert.ok(backlink);assert.equal(rows.provenance.automatedToxicity,false);
   assert.equal(rows.provenance.automaticDisavow,false);
  });
  await check(t,'human backlink label creation, upsert and note persistence',async()=>{
   const a=accounts[0];
   const first=expect(await http(reviews,{account:a,method:'POST',body:{projectId:a.project,backlinkId:backlink,label:'investigate',notes:note}}),200);
   assert.equal(first.reviewType,'human_only');assert.equal(first.review.label,'investigate');
   assert.equal(first.automaticDisavow,false);
   const changed=expect(await http(reviews,{account:a,method:'POST',body:{projectId:a.project,backlinkId:backlink,label:'keep',notes:'Reviewed manually'}}),200);
   assert.equal(changed.review.label,'keep');
   assert.equal(changed.review.id,first.review.id,'Upsert must retain review ID');
   const persisted=expect(await http(query(reviews,{projectId:a.project}),{account:a}),200).rows;
   assert.ok(persisted.some(r=>r.backlinkId===backlink&&r.label==='keep'&&r.notes==='Reviewed manually'));
  });
  await check(t,'other tenant cannot view, create or change a backlink review',async()=>{
   const a=accounts[0],b=accounts[1];
   expect(await http(query(reviews,{projectId:a.project}),{account:b}),404);
   expect(await http(reviews,{account:b,method:'POST',body:{projectId:a.project,backlinkId:backlink,label:'ignore'}}),404);
   expect(await http(reviews,{account:b,method:'POST',body:{projectId:b.project,backlinkId:backlink,label:'ignore'}}),404);
   const own=expect(await http(query(reviews,{projectId:a.project}),{account:a}),200);
   assert.equal(own.rows.find(r=>r.backlinkId===backlink).label,'keep');
  });
  await check(t,'backlink label, note length and IDs are validated',async()=>{
   const a=accounts[0];
   for(const body of [
    {projectId:a.project,backlinkId:backlink,label:'toxic'},
    {projectId:a.project,backlinkId:backlink,label:'keep',notes:'x'.repeat(2001)},
    {projectId:a.project,backlinkId:'invalid',label:'keep'}
   ])assert.equal((await http(reviews,{account:a,method:'POST',body})).status,400);
  });
  await check(t,'SEO gap uses only user imports, with shared/missing/unique semantics',async()=>{
   const a=accounts[0],competitorId=a.comparison;
   for(const [projectId,terms] of [[a.project,['shared phrase','our phrase']],[competitorId,['shared phrase','their phrase']]]){
    expect(await http('/api/seo/import',{account:a,method:'POST',body:{
     projectId,kind:'keywords',sourceLabel:'Manual regression source',
     items:terms.map(keyword=>({keyword,country:'US',locale:'en',observedAt:iso}))
    }}),201);
   }
   const result=expect(await http(query(gap,{projectId:a.project,competitorId,kind:'keywords'}),{account:a}),200);
   assert.ok(result.shared.includes('shared phrase'));
   assert.ok(result.missing.includes('their phrase'));
   assert.ok(result.unique.includes('our phrase'));
   assert.equal(result.provenance.verified,false);
   assert.equal(result.provenance.sourceType,'user_import');
  });
  await check(t,'SEO gap refuses cross-tenant competitors and invalid comparisons',async()=>{
   const a=accounts[0],b=accounts[1];
   expect(await http(query(gap,{projectId:a.project,competitorId:b.project}),{account:a}),404);
   expect(await http(query(gap,{projectId:a.project,competitorId:a.project}),{account:a}),400);
   expect(await http(query(gap,{projectId:a.project,competitorId:a.comparison,kind:'unknown'}),{account:a}),400);
  });
  await check(t,'CSRF rejects foreign Origin on every strategy and review mutation',async()=>{
   const a=accounts[0];
   for(const [path,method,body] of [
    [strategy,'POST',{kind:'lists',projectId:a.project,title:'Foreign origin'}],
    [strategy,'PATCH',{kind:'lists',projectId:a.project,id:list,title:'Foreign origin'}],
    [strategy,'DELETE',{kind:'keywords',projectId:a.project,id:keyword}],
    [reviews,'POST',{projectId:a.project,backlinkId:backlink,label:'ignore'}]
   ]){
    expect(await http(path,{account:a,method,body,requestOrigin:'https://cross-origin.example'}),403);
    expect(await http(path,{account:a,method,body,requestOrigin:''}),403);
   }
  });
  await check(t,'viewer can read but cannot edit strategy or reviews',async()=>{
   const a=accounts[0],b=accounts[1];
   await db.query("INSERT INTO local_workspace_members(workspace_id,user_id,role) SELECT $1,id,'viewer' FROM local_users WHERE email=$2 ON CONFLICT(workspace_id,user_id) DO UPDATE SET role='viewer'",[a.workspace,b.email]);
   expect(await http(query(strategy,{kind:'lists',projectId:a.project}),{account:b,workspace:a.workspace}),200);
   expect(await http(query(reviews,{projectId:a.project}),{account:b,workspace:a.workspace}),200);
   const changes=[
    await http(strategy,{account:b,workspace:a.workspace,method:'POST',body:{kind:'lists',projectId:a.project,title:'Viewer write'}}),
    await http(reviews,{account:b,workspace:a.workspace,method:'POST',body:{projectId:a.project,backlinkId:backlink,label:'ignore'}})
   ];
   assert.ok(changes.every(r=>r.status===403));
  });
 }finally{
  await db.end().catch(()=>{});
  console.log('Strategy/reviews/gap checks: '+passed+' passed, '+failed+' failed');
 }
});
