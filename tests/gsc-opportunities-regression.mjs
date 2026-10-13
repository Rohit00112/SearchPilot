/**
 * Regression for read-only opportunities computed solely from saved GSC rows.
 *
 * Run against an existing disposable, migrated local PostgreSQL instance and
 * a local app server pointed to the SAME database (no migrations are run here):
 *   BASE_URL=http://127.0.0.1:3137 \
 *   TEST_DATABASE_URL=postgresql://localhost/searchpilot_opportunities_test \
 *   node --test tests/gsc-opportunities-regression.mjs
 *
 * The test writes unique QA fixtures only to that isolated database.
 * No Google API, outbound requests, or live project data is involved.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';

const base=process.env.BASE_URL;
const databaseUrl=process.env.TEST_DATABASE_URL;
if(!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(base??''))
  throw Error('A loopback BASE_URL is mandatory.');
if(!databaseUrl)throw Error('TEST_DATABASE_URL must name a disposable local database.');
const parsed=new URL(databaseUrl);
const databaseName=decodeURIComponent(parsed.pathname.slice(1));
if(!/^(?:localhost|127\.0\.0\.1)$/.test(parsed.hostname)
  ||!/(test|qa|scratch|verify|regression|ephemeral)/i.test(databaseName))
  throw Error('Refusing a non-disposable or non-local PostgreSQL database.');
if(process.env.APP_ORIGIN&&process.env.APP_ORIGIN!==base)
  throw Error('APP_ORIGIN must match the isolated loopback API server.');

const db=new pg.Client({connectionString:databaseUrl});
const suffix=randomUUID().slice(0,12);
const owners=[0,1].map(index=>({
  email:`gsc-opportunity-${index}-${suffix}@example.test`,cookie:'',workspace:'',userId:'',connection:'',
}));
const propertyA=`sc-domain:alpha-${suffix}.example.test`;
const propertyB=`https://beta-${suffix}.example.test/blog/`;
const day1='2026-10-08',day2='2026-10-09';
const endpoint='/api/seo/gsc-opportunities';

async function api(path,{account,workspace,method='GET',body}={}){
  const headers={};
  if(account?.cookie)headers.cookie=account.cookie;
  if(workspace)headers['x-workspace-id']=workspace;
  if(method!=='GET')headers.origin=base;
  if(body!==undefined)headers['content-type']='application/json';
  const response=await fetch(base+path,{
    method,headers,body:body===undefined?undefined:JSON.stringify(body),
    redirect:'manual',signal:AbortSignal.timeout(10000),
  });
  const data=response.headers.get('content-type')?.includes('application/json')
    ?await response.json():await response.text();
  return {status:response.status,data,headers:response.headers};
}
function expect(response,status){
  assert.equal(response.status,status,JSON.stringify(response.data).slice(0,400));
  return response.data;
}
function url(params){return endpoint+'?'+new URLSearchParams(params).toString();}
function approx(actual,expected){assert.ok(typeof actual==='number'&&Math.abs(actual-expected)<1e-9,`${actual} vs ${expected}`);}
async function saveRow(owner,{property=propertyA,date=day1,query,page='/',country='us',device='DESKTOP',clicks,impressions,position}){
  await db.query(`INSERT INTO gsc_performance
    (workspace_id,connection_id,property_uri,metric_date,query,page,country,device,clicks,impressions,ctr,average_position)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[
      owner.workspace,owner.connection,property,date,query,page,country,device,
      clicks,impressions,impressions===0?0:clicks/impressions,position,
    ]);
}

test('GSC query opportunities use only saved, workspace-scoped observations',{timeout:100000},async t=>{
  try{
    await db.connect();
    await t.test('local disposable schema is prepared',async()=>{
      const database=await db.query('SELECT current_database() AS name');
      assert.equal(database.rows[0].name,databaseName);
      const tables=await db.query("SELECT to_regclass('public.gsc_performance') AS performance, to_regclass('public.gsc_connections') AS connections");
      assert.ok(tables.rows[0].performance&&tables.rows[0].connections);
      const migrations=await db.query("SELECT version FROM schema_migrations WHERE version='004_gsc'");
      assert.equal(migrations.rows.length,1,'Migration 004 must be installed in the disposable DB.');
    });
    await t.test('register isolated workspaces and seed only saved GSC fixtures',async()=>{
      for(const owner of owners){
        const created=await api('/api/auth/register',{method:'POST',body:{
          email:owner.email,displayName:'GSC Opportunity QA',password:'disposable-qa-strong-passphrase-12345',
        }});
        owner.workspace=expect(created,201).activeWorkspaceId;
        owner.cookie=created.headers.get('set-cookie')?.split(';',1)[0];
        assert.ok(owner.cookie?.startsWith('sp_session='));
        const {rows}=await db.query(`INSERT INTO gsc_connections
          (workspace_id,user_id,refresh_token_enc,property_uri)
          SELECT $1,id,'nonfunctional-QA-local-token',$2
          FROM local_users WHERE email=$3 RETURNING id,user_id`,[owner.workspace,propertyA,owner.email]);
        assert.equal(rows.length,1,'API app and disposable database must agree about registered users.');
        owner.connection=rows[0].id;
        owner.userId=rows[0].user_id;
      }
      assert.notEqual(owners[0].workspace,owners[1].workspace);
      const a=owners[0],b=owners[1];
      await saveRow(a,{query:'opportunity query',clicks:1,impressions:120,position:10});
      await saveRow(a,{query:'opportunity query',page:'/other',country:'ca',device:'MOBILE',date:day2,clicks:0,impressions:80,position:20});
      await saveRow(a,{query:'opportunity query',property:propertyB,date:day2,page:'/property-b',clicks:20,impressions:50,position:4});
      await saveRow(a,{query:'healthy ctr',clicks:15,impressions:100,position:5});
      await saveRow(a,{query:'low exposure',clicks:0,impressions:25,position:7});
      await saveRow(a,{query:'zero impressions',clicks:0,impressions:0,position:99});
      await saveRow(a,{query:'  ',clicks:0,impressions:300,position:1});
      await saveRow(b,{query:'private tenant query',clicks:0,impressions:1000,position:3});
      await saveRow(b,{query:'opportunity query',clicks:80,impressions:100,position:1});
    });
    await t.test('anonymous access blocked and no data leaks across tenants',async()=>{
      assert.equal((await api(url({from:day1,to:day2}))).status,401);
      const a=expect(await api(url({from:day1,to:day2,limit:100}),{account:owners[0]}),200);
      assert.equal(a.rows.some(row=>row.query==='private tenant query'),false);
      const b=expect(await api(url({from:day1,to:day2,limit:100}),{account:owners[1]}),200);
      assert.equal(b.rows.some(row=>row.query==='healthy ctr'),false);
      assert.equal(b.rows.length,2);
      assert.equal((await api(url({from:day1,to:day2,workspaceId:owners[0].workspace}),{account:owners[1]})).status,401);
      assert.equal((await api(url({from:day1,to:day2}),{account:owners[1],workspace:owners[0].workspace})).status,401);
    });
    await t.test('aggregates positions weighted by impressions; CTR from summed clicks',async()=>{
      const response=await api(url({from:day1,to:day2,property:propertyA,limit:100}),{account:owners[0]});
      const data=expect(response,200);
      assert.equal(response.headers.get('cache-control'),'private, no-store');
      assert.equal(data.filters.property,propertyA);
      assert.equal(data.rows.length,4);
      const opportunity=data.rows.find(row=>row.query==='opportunity query');
      assert.deepEqual({
        clicks:opportunity.clicks,impressions:opportunity.impressions,
        latestDate:opportunity.latestDate,
      },{clicks:1,impressions:200,latestDate:day2});
      approx(opportunity.ctr,1/200);
      approx(opportunity.averagePosition,(120*10+80*20)/200);
      assert.deepEqual(opportunity.opportunity,{flag:true,label:'High impressions, low CTR (heuristic)'});
      const healthy=data.rows.find(row=>row.query==='healthy ctr');
      approx(healthy.ctr,0.15);
      assert.equal(healthy.opportunity.flag,false);
      assert.equal(data.rows.find(row=>row.query==='low exposure').opportunity.flag,false);
      const zero=data.rows.find(row=>row.query==='zero impressions');
      assert.equal(zero.ctr,null);assert.equal(zero.averagePosition,null);assert.equal(zero.opportunity.flag,false);
      assert.equal(data.heuristic.minImpressions,100);
      assert.equal(data.heuristic.ctrBelow,0.02);
      assert.equal(data.provenance.sourceType,'saved_google_search_console');
      assert.equal(data.provenance.live,false);
      assert.equal(data.provenance.sample,false);
      assert.equal(JSON.stringify(data).includes('keywordDifficulty'),false);
    });
    await t.test('property filter prevents mixing two GSC properties',async()=>{
      const all=expect(await api(url({from:day1,to:day2,limit:100}),{account:owners[0]}),200);
      const combined=all.rows.find(row=>row.query==='opportunity query');
      assert.equal(combined.clicks,21);
      assert.equal(combined.impressions,250);
      approx(combined.averagePosition,(120*10+80*20+50*4)/250);
      assert.equal(combined.opportunity.flag,false);
      const onlyB=expect(await api(url({from:day1,to:day2,property:propertyB}),{account:owners[0]}),200);
      assert.equal(onlyB.rows.length,1);
      assert.equal(onlyB.rows[0].clicks,20);
      const empty=expect(await api(url({from:day1,to:day2,property:'sc-domain:absent.example.test'}),{account:owners[0]}),200);
      assert.deepEqual(empty.rows,[]);
      assert.equal(empty.page.hasMore,false);
    });
    await t.test('date selection and pagination bound results',async()=>{
      const first=expect(await api(url({from:day1,to:day2,limit:1}),{account:owners[0]}),200);
      assert.equal(first.rows.length,1);assert.equal(first.rows[0].query,'opportunity query');
      assert.equal(first.page.limit,1);assert.equal(first.page.hasMore,true);
      const single=expect(await api(url({from:day1,to:day1,property:propertyA}),{account:owners[0]}),200);
      assert.equal(single.rows.find(row=>row.query==='opportunity query').impressions,120);
      const thirtyOne=expect(await api(url({from:'2026-09-09',to:'2026-10-09'}),{account:owners[0]}),200);
      assert.equal(thirtyOne.filters.from,'2026-09-09');
      const defaults=expect(await api(endpoint,{account:owners[0]}),200);
      assert.equal(defaults.page.limit,25);
      assert.equal((Date.parse(defaults.filters.to)-Date.parse(defaults.filters.from))/86_400_000,30);
    });
    await t.test('reject invalid ranges, malformed properties, oversize and duplicate params',async()=>{
      const invalid=[
        '?from=2026-10-01',
        '?to=2026-10-09',
        '?from=2026-09-08&to=2026-10-09',
        '?from=2026-10-10&to=2026-10-09',
        '?from=2026-02-30&to=2026-03-01',
        '?from=2027-01-01&to=2027-01-02',
        '?from=2026-10-08&to=2026-10-09&limit=0',
        '?from=2026-10-08&to=2026-10-09&limit=101',
        '?from=2026-10-08&to=2026-10-09&limit=abc',
        '?from=2026-10-08&to=2026-10-09&property=javascript:bad',
        '?from=2026-10-08&to=2026-10-09&property=',
        '?from=2026-10-08&to=2026-10-09&property=sc-domain:',
        '?from=2026-10-08&to=2026-10-09&other=yes',
        '?from=2026-10-08&to=2026-10-09&to=2026-10-10',
        '?from=2026-10-08&to=2026-10-09&property='+encodeURIComponent('sc-domain:'+('a'.repeat(501))),
      ];
      for(const suffix of invalid){
        const response=await api(endpoint+suffix,{account:owners[0]});
        assert.equal(response.status,400,`expected 400 for ${suffix}: ${JSON.stringify(response.data)}`);
      }
    });
  }finally{await db.end().catch(()=>{});}
});
