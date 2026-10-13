/**
 * SearchPilot isolated two-user API regression suite.
 *
 * Setup (performed by test coordinator, outside this script):
 *   - Start a server with APP_ORIGIN=<BASE_URL>, AUTH_SECRET, and DATABASE_URL
 *     pointing ONLY to a disposable database with migrations 001, 002, 003.
 *   - BASE_URL=http://127.0.0.1:<port>
 *   - TEST_DATABASE_URL=<same disposable database> (required for audit history).
 *   - Run: node --test tests/api-regression.mjs
 *
 * All identities are generated per run; the script NEVER contacts an external
 * audit target. Site audits are inserted directly into the disposable DB as
 * labelled fixtures so the API history filter is exercised without DNS/HTTP.
 * Cross-tenant audit POSTs fail ownership checks before outbound fetch.
 * The suite refuses a DB name without a test/qa/verify/scratch marker.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';

const BASE_URL=process.env.BASE_URL;
const TEST_DATABASE_URL=process.env.TEST_DATABASE_URL;
const TEST_ORIGIN=process.env.APP_ORIGIN||BASE_URL;
if(!BASE_URL||!/^https?:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(BASE_URL))
  throw new Error('Specify BASE_URL=http://127.0.0.1:<isolated test-server port>.');
if(!TEST_DATABASE_URL)throw new Error('TEST_DATABASE_URL is required for isolated audit history fixtures.');
const dbUrl=new URL(TEST_DATABASE_URL);
const dbName=decodeURIComponent(dbUrl.pathname.slice(1));
if(!/(test|qa|verify|scratch|regression|ephemeral)/i.test(dbName))
  throw new Error('Refusing to use database without a test/qa/verify/scratch/regression marker.');
if(!/^https?:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(TEST_ORIGIN))
  throw new Error('APP_ORIGIN must be a local isolated server origin.');

const pool=new Pool({connectionString:TEST_DATABASE_URL,max:2});
const suffix=randomUUID().replace(/-/g,'').slice(0,14);
const users={
  a:{email:"api-a-"+suffix+"@example.test",password:"A-very-long-password-"+suffix,name:'Workspace A',cookie:'',workspace:'',userId:'',project:'',keyword:''},
  b:{email:"api-b-"+suffix+"@example.test",password:"B-very-long-password-"+suffix,name:'Workspace B',cookie:'',workspace:'',userId:'',project:'',keyword:''}
};
const cases={passed:0,failed:0};
const jsonHeaders={'content-type':'application/json'};
const fixtureMarker='[API REGRESSION FIXTURE '+suffix+']';

async function api(path,{method='GET',user,workspace,body,origin=TEST_ORIGIN,headers={}}={}){
  const requestHeaders={...headers};
  if(user?.cookie)requestHeaders.cookie=user.cookie;
  if(workspace)requestHeaders['x-workspace-id']=workspace;
  if(method!=='GET'&&method!=='HEAD'){
    if(origin)requestHeaders.origin=origin;
    if(body!==undefined){
      requestHeaders['content-type']='application/json';
    }
  }
  const response=await fetch(new URL(path,BASE_URL),{
    method,headers:requestHeaders,body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(10_000)
  });
  const contentType=response.headers.get('content-type')||'';
  const value=contentType.includes('application/json')?await response.json():await response.text();
  return {status:response.status,body:value,headers:response.headers};
}
function status(response,expected,description='Unexpected HTTP status'){
  assert.equal(response.status,expected,description+': '+JSON.stringify(response.body).slice(0,300));
  return response.body;
}
function cookie(response){
  const header=response.headers.get('set-cookie');
  assert.ok(header?.includes('sp_session='),'Registration/login must issue session cookie');
  assert.match(header,/httponly/i,'Session must be HttpOnly');
  assert.match(header,/samesite=lax/i,'Session must have SameSite=Lax');
  return header.split(';',1)[0];
}
async function register(user){
  const response=await api('/api/auth/register',{method:'POST',body:{email:user.email,password:user.password,displayName:user.name}});
  const body=status(response,201,'Registration failed');
  user.cookie=cookie(response);
  user.workspace=body.activeWorkspaceId;
  user.userId=body.user?.id;
  assert.ok(user.workspace&&user.userId,'Registration must provide workspace and user IDs');
}
async function recordTest(t,name,fn){
  await t.test(name,async()=>{
    try{await fn();cases.passed++}
    catch(error){cases.failed++;throw error}
  });
}

test('SearchPilot API: authenticated workspace isolation and validation', {timeout:120_000}, async t=>{
  try{
    // Register once only; default auth register rate bucket is 5 requests/hour.
    await recordTest(t,'setup: register two independent local accounts',async()=>{
      await register(users.a);
      await register(users.b);
      assert.notEqual(users.a.workspace,users.b.workspace);
    });
    await recordTest(t,'S1: anonymous projects, keywords, audits and rankings cannot expose DB rows',async()=>{
      for(const path of ['/api/projects','/api/keywords','/api/audit','/api/rankings?projectId='+users.a.workspace]){
        const response=await api(path);
        assert.equal(response.status,401,'Anonymous '+path+' must return 401');
      }
    });
    await recordTest(t,'S1: authenticated workspace selection rejects the other account',async()=>{
      const denied=await api('/api/projects',{user:users.a,workspace:users.b.workspace});
      assert.ok([401,403,404].includes(denied.status));
      const own=await api('/api/projects',{user:users.a,workspace:users.a.workspace});
      status(own,200);
      assert.deepEqual(own.body.projects,[]);
    });
    await recordTest(t,'setup: each owner creates and lists only its own project',async()=>{
      for(const [key,user] of Object.entries(users)){
        const created=await api('/api/projects',{method:'POST',user,body:{name:'Private '+key,domain:key+'.example.test'}});
        user.project=status(created,201).project.id;
        assert.ok(user.project);
      }
      const [a,b]=await Promise.all([api('/api/projects',{user:users.a}),api('/api/projects',{user:users.b})]);
      assert.deepEqual(a.body.projects.map(p=>p.id),[users.a.project]);
      assert.deepEqual(b.body.projects.map(p=>p.id),[users.b.project]);
    });
    await recordTest(t,'S1: other tenant cannot PATCH or DELETE a private project',async()=>{
      const patched=await api('/api/projects?id='+users.b.project,{
        method:'PATCH',user:users.a,body:{name:'Unauthorised rename'}
      });
      status(patched,404);
      const deleted=await api('/api/projects?id='+users.b.project,{method:'DELETE',user:users.a});
      status(deleted,404);
      const ownerView=await api('/api/projects',{user:users.b});
      assert.equal(ownerView.body.projects[0].name,'Private b');
    });
    await recordTest(t,'setup: each tenant creates keywords with manual provenance',async()=>{
      for(const [key,user] of Object.entries(users)){
        const created=await api('/api/keywords',{method:'POST',user,body:{
          projectId:user.project,keyword:'private '+key+' keyword',position:7,volume:15,difficulty:34
        }});
        user.keyword=status(created,201).keyword.id;
      }
    });
    await recordTest(t,'S1: keyword search/export and keyword deletion isolate tenants',async()=>{
      const a=await api('/api/keywords',{user:users.a});
      status(a,200);
      assert.deepEqual(a.body.keywords.map(item=>item.id),[users.a.keyword]);
      const filtered=await api('/api/keywords?projectId='+users.b.project,{user:users.a});
      status(filtered,200);assert.deepEqual(filtered.body.keywords,[]);
      const deniedCreate=await api('/api/keywords',{method:'POST',user:users.a,body:{projectId:users.b.project,keyword:'injected'}});
      status(deniedCreate,404);
      const deniedDelete=await api('/api/keywords?id='+users.b.keyword,{method:'DELETE',user:users.a});
      status(deniedDelete,200);assert.equal(deniedDelete.body.deleted,false);
      const exportDenied=await api('/api/reports?projectId='+users.b.project+'&kind=keywords',{user:users.a});
      status(exportDenied,404);
    });
    await recordTest(t,'S1: manual rank creation and history are tenant-scoped',async()=>{
      const created=await api('/api/rankings',{method:'POST',user:users.a,body:{
        projectId:users.a.project,keywordId:users.a.keyword,position:5,note:'manually observed',observedAt:'2026-09-01T12:00:00Z'
      }});
      const rank=status(created,201).ranking;
      assert.equal(rank.provenance?.source,'manual');
      const history=await api('/api/rankings?projectId='+users.a.project,{user:users.a});
      status(history,200);assert.ok(history.body.rankings.some(r=>r.id===rank.id));
      assert.equal(history.body.provenance.source,'manual');
      const unauthorized=await api('/api/rankings?projectId='+users.a.project,{user:users.b});
      status(unauthorized,404);
      const insertDenied=await api('/api/rankings',{method:'POST',user:users.b,body:{
        projectId:users.a.project,keywordId:users.a.keyword,position:1
      }});
      status(insertDenied,404);
      const crossProject=await api('/api/rankings',{method:'POST',user:users.a,body:{
        projectId:users.a.project,keywordId:users.b.keyword,position:1
      }});
      status(crossProject,404);
    });
    await recordTest(t,'S1: private audit history fixture stays within its workspace',async()=>{
      // Direct DB fixture: no outside URL is fetched. It is not represented as live.
      const fixture=await pool.query(
        "INSERT INTO audits(workspace_id,project_id,domain,score,checks) VALUES($1,$2,$3,42,$4::jsonb) RETURNING id",
        [users.b.workspace,users.b.project,'b.example.test',JSON.stringify([{name:fixtureMarker,status:'warning',details:'Synthetic test only',recommendation:'No external crawl'}])]
      );
      const own=await api('/api/audit?projectId='+users.b.project,{user:users.b});
      status(own,200);assert.ok(own.body.audits.some(a=>a.id===fixture.rows[0].id));
      const other=await api('/api/audit?projectId='+users.b.project,{user:users.a});
      status(other,200);assert.deepEqual(other.body.audits,[]);
      const all=await api('/api/audit',{user:users.a});
      status(all,200);assert.ok(all.body.audits.every(a=>a.id!==fixture.rows[0].id));
    });
    await recordTest(t,'S1: audit POST rejects another tenant before any DNS fetch',async()=>{
      const response=await api('/api/audit',{method:'POST',user:users.a,body:{
        projectId:users.b.project,domain:'no-external-audit.example.test'
      }});
      status(response,404);
      assert.ok(!response.body.audit,'Failed audit must not fabricate an audit result');
    });
    await recordTest(t,'S2: malformed audit project ID is a 400, never SQL error leakage',async()=>{
      // Write failing test first: earlier code passed this directly to ::uuid.
      const response=await api('/api/audit?projectId=not-a-uuid',{user:users.a});
      status(response,400);
      assert.ok(!/invalid input syntax|postgres|sqlstate|syntax error/i.test(response.body.error||''));
    });
    await recordTest(t,'S2: invalid input returns 400/415 without false successful writes',async()=>{
      const cases=[
        ['/api/projects',{name:'',domain:'a.example.test'},400],
        ['/api/projects',{name:'invalid',domain:'127.0.0.1'},400],
        ['/api/keywords',{projectId:users.a.project,keyword:'',position:2},400],
        ['/api/keywords',{projectId:users.a.project,keyword:'invalid',position:0},400],
        ['/api/rankings',{projectId:users.a.project,keywordId:users.a.keyword,position:1001},400],
      ];
      for(const [path,body,code] of cases){
        const response=await api(path,{method:'POST',user:users.a,body});
        status(response,code,'Invalid mutation must fail at '+path);
      }
      const wrongContent=await api('/api/keywords',{method:'POST',user:users.a,headers:{'content-type':'text/plain'},body:undefined});
      status(wrongContent,415);
    });
    await recordTest(t,'S1: request-origin protection prevents cross-site state mutation',async()=>{
      for(const [path,body] of [
        ['/api/projects',{name:'evil',domain:'evil.example.test'}],
        ['/api/keywords',{projectId:users.a.project,keyword:'evil'}],
        ['/api/rankings',{projectId:users.a.project,keywordId:users.a.keyword,position:1}],
        ['/api/audit',{projectId:users.a.project,domain:'no-external-audit.example.test'}]
      ]){
        const bad=await api(path,{method:'POST',user:users.a,body,origin:'https://cross-origin.example'});
        status(bad,403);
      }
      const noOrigin=await api('/api/projects',{method:'POST',user:users.a,body:{name:'evil',domain:'evil.example.test'},origin:''});
      status(noOrigin,403);
    });
    await recordTest(t,'S1: workspace viewer may read but cannot write',async()=>{
      await pool.query("INSERT INTO local_workspace_members(workspace_id,user_id,role) VALUES($1,$2,'viewer') ON CONFLICT(workspace_id,user_id) DO UPDATE SET role='viewer'",[users.a.workspace,users.b.userId]);
      const readable=await api('/api/projects',{user:users.b,workspace:users.a.workspace});
      status(readable,200);
      assert.ok(readable.body.projects.some(p=>p.id===users.a.project));
      const forbidden=await api('/api/projects',{method:'POST',user:users.b,workspace:users.a.workspace,body:{name:'viewer write',domain:'viewer.example.test'}});
      assert.ok([401,403].includes(forbidden.status),JSON.stringify(forbidden.body));
    });
    await recordTest(t,'S2: audit rate limit returns 429 without outbound requests',async()=>{
      // All attempts fail ownership before runAudit: this never calls external DNS.
      let limited=false;
      for(let i=0;i<8;i++){
        const response=await api('/api/audit',{method:'POST',user:users.b,body:{projectId:users.a.project,domain:'no-external-audit.example.test'}});
        if(response.status===429){
          assert.ok(Number(response.headers.get('retry-after'))>0);
          limited=true;break;
        }
        status(response,404);
      }
      assert.ok(limited,'Audit must apply per-user rate limit');
    });
    await recordTest(t,'S2: auth login rate limit rejects repeated failures',async()=>{
      let limited=false;
      for(let i=0;i<12;i++){
        const response=await api('/api/auth/login',{method:'POST',body:{email:'missing-'+suffix+'@example.test',password:'some-invalid-password'}});
        if(response.status===429){
          assert.ok(Number(response.headers.get('retry-after'))>0);
          limited=true;break;
        }
        status(response,401);
      }
      assert.ok(limited,'Login must apply auth rate limit');
    });
    await recordTest(t,'S1: session logout revokes cookie and blocks further reads',async()=>{
      const oldCookie=users.a.cookie;
      const out=await api('/api/auth/logout',{method:'POST',user:users.a});
      status(out,200);
      const revoked=await api('/api/auth/me',{user:{cookie:oldCookie}});
      status(revoked,401);
      const noRows=await api('/api/projects',{user:{cookie:oldCookie}});
      status(noRows,401);
    });
  }finally{
    await pool.end();
    process.stdout.write('API regression checks: '+cases.passed+' passed, '+cases.failed+' failed\n');
  }
});
