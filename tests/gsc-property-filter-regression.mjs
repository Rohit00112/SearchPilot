/** Verify GSC property filtering and tenant isolation without calling Google.
 * The API server must point at TEST_DATABASE_URL, a disposable database.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const base=process.env.BASE_URL,databaseUrl=process.env.TEST_DATABASE_URL;
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(base||''))throw Error('Use a loopback BASE_URL.');
if(!databaseUrl||!/(?:qa|test|scratch|verify|ephemeral)/i.test(new URL(databaseUrl).pathname))throw Error('Use a disposable TEST_DATABASE_URL.');
async function req(path,user,method='GET',payload){
  const headers={};if(user?.cookie)headers.cookie=user.cookie;if(method!=='GET')headers.origin=base;
  if(payload)headers['content-type']='application/json';
  const r=await fetch(base+path,{method,headers,body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(10000)});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};
}
function ok(r,n){assert.equal(r.status,n,JSON.stringify(r.data).slice(0,400));return r.data;}
test('GSC property-filtered stored observations preserve workspace boundaries',{timeout:30000},async t=>{
  const db=new pg.Client({connectionString:databaseUrl});await db.connect();
  const users=[0,1].map(x=>({email:`gsc-${x}-${randomUUID().slice(0,8)}@example.test`,cookie:'',workspace:''}));
  const day='2026-10-10';
  try{
    await t.test('register independent QA users',async()=>{
      for(const user of users){
        const r=await req('/api/auth/register',null,'POST',{email:user.email,password:'secure-qa-passphrase-12345',displayName:'GSC owner'});
        const info=ok(r,201);user.workspace=info.activeWorkspaceId;user.cookie=r.cookie.split(';')[0];
      }
    });
    await t.test('seed user-owned local records, not external Google measurements',async()=>{
      for(const [i,user] of users.entries()){
        const first=await db.query(`INSERT INTO gsc_connections(workspace_id,user_id,refresh_token_enc,property_uri) SELECT $1,id,'qa_not_a_real_oauth_token','sc-domain:a.example.test' FROM local_users WHERE email=$2 RETURNING id`,[user.workspace,user.email]);
        const connection=first.rows[0].id;
        await db.query(`INSERT INTO gsc_performance(workspace_id,connection_id,property_uri,metric_date,query,page,country,device,clicks,impressions,ctr,average_position)
          VALUES($1,$2,'sc-domain:a.example.test',$3,'query A','https://a.example.test/','us','DESKTOP',$4,50,0.2,7)`,[user.workspace,connection,day,10+i]);
        if(i===0)await db.query(`INSERT INTO gsc_performance(workspace_id,connection_id,property_uri,metric_date,query,page,country,device,clicks,impressions,ctr,average_position)
          VALUES($1,$2,'sc-domain:b.example.test',$3,'query B','https://b.example.test/','us','DESKTOP',8,30,0.26,4)`,[user.workspace,connection,day]);
      }
    });
    await t.test('filter restricts to selected property',async()=>{
      const path='/api/integrations/gsc/performance?from='+day+'&to='+day;
      const all=ok(await req(path,users[0]),200);
      assert.equal(all.rows.length,2);assert.equal(all.propertyFilter,null);
      const filter=ok(await req(path+'&property='+encodeURIComponent('sc-domain:a.example.test'),users[0]),200);
      assert.equal(filter.rows.length,1);assert.equal(filter.rows[0].query,'query A');
      assert.equal(filter.rows[0].averagePosition,7);assert.equal(filter.propertyFilter,'sc-domain:a.example.test');
      const empty=ok(await req(path+'&property='+encodeURIComponent('sc-domain:b.example.test'),users[1]),200);
      assert.equal(empty.rows.length,0);
      ok(await req(path+'&property=invalid',users[0]),400);
    });
    await t.test('query cannot cross workspace and requires session',async()=>{
      const path='/api/integrations/gsc/performance?from='+day+'&to='+day;
      assert.equal((await req(path,null)).status,401);
      const second=ok(await req(path,users[1]),200);
      assert.equal(second.rows.length,1);assert.equal(Number(second.rows[0].clicks),11);
    });
  }finally{await db.end()}
});
