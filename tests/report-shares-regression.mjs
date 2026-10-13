/**
 * Run only against a disposable local DB with migration 010 already applied:
 * BASE_URL=http://127.0.0.1:3137 TEST_DATABASE_URL=postgresql://localhost/sp_share_test node --test tests/report-shares-regression.mjs
 * This script never runs migrations or deletes existing data.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import pg from 'pg';

const base=process.env.BASE_URL,connectionString=process.env.TEST_DATABASE_URL;
if(!base||!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(base))throw Error('A loopback BASE_URL is required.');
if(!connectionString)throw Error('TEST_DATABASE_URL is required.');
const parsed=new URL(connectionString);
if(!/^(?:localhost|127\.0\.0\.1)$/.test(parsed.hostname)||!/(test|qa|scratch|regression)/i.test(parsed.pathname))
  throw Error('Refusing to run against a non-disposable local database.');
const db=new pg.Client({connectionString});
const suffix=randomUUID().slice(0,10);
const accounts=[0,1].map(index=>({email:`share-${index}-${suffix}@example.test`,cookie:'',workspace:'',project:'',report:''}));
async function http(path,{account,method='GET',body,origin=base,workspace}={}){
  const headers={};
  if(account?.cookie)headers.cookie=account.cookie;
  if(workspace)headers['x-workspace-id']=workspace;
  if(method!=='GET'&&origin)headers.origin=origin;
  if(body!==undefined)headers['content-type']='application/json';
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(10000)});
  const data=response.headers.get('content-type')?.includes('json')?await response.json():await response.text();
  return {status:response.status,data,headers:response.headers};
}
function ok(result,status){assert.equal(result.status,status,JSON.stringify(result.data).slice(0,300));return result.data;}

test('report shares enforce consent, restricted fields, tenants, and revocation',{timeout:100000},async t=>{
  try{
    await db.connect();
    const installed=await db.query("SELECT version FROM schema_migrations WHERE version='010_report_shares'");
    assert.equal(installed.rows.length,1,'Migration 010 must already be installed on test DB.');
    for(const account of accounts){
      const registered=await http('/api/auth/register',{method:'POST',body:{email:account.email,displayName:'Share QA',password:'example-safe-test-password-1234'}});
      account.workspace=ok(registered,201).activeWorkspaceId;
      account.cookie=registered.headers.get('set-cookie').split(';')[0];
      const project=ok(await http('/api/projects',{account,method:'POST',body:{name:'Share QA',domain:'safe-'+suffix+'.example.test'}}),201);
      account.project=project.project.id;
      const report=ok(await http('/api/report-definitions',{account,method:'POST',body:{projectId:account.project,title:'Limited QA share',blocks:['overview','keywords','audit','notes']}}),201);
      account.report=report.report.id;
    }
    const [a,b]=accounts;
    await t.test('private until explicit consent, rejects invalid TTL/CSRF',async()=>{
      ok(await http('/api/report-shares?reportId='+a.report,{account:a}),200);
      assert.equal((await http('/api/report-shares',{account:a,method:'POST',body:{reportId:a.report,ttlDays:7}})).status,400);
      assert.equal((await http('/api/report-shares',{account:a,method:'POST',body:{reportId:a.report,ttlDays:31,acknowledgeLimitedShare:true}})).status,400);
      assert.equal((await http('/api/report-shares',{account:a,method:'POST',origin:'https://evil.example',body:{reportId:a.report,ttlDays:7,acknowledgeLimitedShare:true}})).status,403);
      assert.equal((await http('/api/report-shares',{account:b,method:'POST',body:{reportId:a.report,ttlDays:7,acknowledgeLimitedShare:true}})).status,404);
    });
    let token='',id='';
    await t.test('generate one-time bearer and limited read-only payload',async()=>{
      const created=await http('/api/report-shares',{account:a,method:'POST',body:{reportId:a.report,ttlDays:7,acknowledgeLimitedShare:true}});
      const data=ok(created,201);
      token=data.token;id=data.share.id;
      assert.match(token,/^[A-Za-z0-9_-]{43}$/);
      assert.equal(created.headers.get('cache-control'),'private, no-store');
      const record=await db.query('SELECT token_hash,snapshot_sections FROM report_shares WHERE id=$1',[id]);
      assert.equal(record.rows[0].token_hash,createHash('sha256').update(token).digest('hex'));
      assert.equal(JSON.stringify(record.rows[0]).includes(token),false);
      const shared=await http('/api/report-shares/'+token);
      const publicData=ok(shared,200);
      assert.deepEqual(Object.keys(publicData.report).sort(),['domain','expiresAt','sections','title']);
      assert.deepEqual(publicData.report.sections,['Project overview','User-recorded keywords','Latest homepage audit','Editorial notes']);
      assert.equal(JSON.stringify(publicData).includes('checks'),false);
      assert.equal(shared.headers.get('cache-control'),'no-store, max-age=0');
      assert.equal((await http('/shared-report/'+token)).status,200);
      const own=ok(await http('/api/report-shares?reportId='+a.report,{account:a}),200);
      assert.equal(JSON.stringify(own).includes(token),false);
      assert.equal((await http('/api/report-shares?reportId='+a.report,{account:b})).status,404);
    });
    await t.test('viewer cannot mutate and links can be revoked',async()=>{
      await db.query(`INSERT INTO local_workspace_members(workspace_id,user_id,role)
        SELECT $1,id,'viewer' FROM local_users WHERE email=$2
        ON CONFLICT(workspace_id,user_id) DO UPDATE SET role='viewer'`,[a.workspace,b.email]);
      assert.equal((await http('/api/report-shares',{account:b,workspace:a.workspace,method:'POST',body:{reportId:a.report,ttlDays:1,acknowledgeLimitedShare:true}})).status,403);
      assert.equal((await http('/api/report-shares?id='+id,{account:b,workspace:a.workspace,method:'DELETE'})).status,403);
      assert.equal((await http('/api/report-shares?id='+id,{account:b,method:'DELETE'})).status,404);
      ok(await http('/api/report-shares?id='+id,{account:a,method:'DELETE'}),200);
      assert.equal((await http('/api/report-shares/'+token)).status,404);
      assert.equal((await http('/shared-report/'+token)).status,404);
    });
  }finally{await db.end().catch(()=>{});}
});
