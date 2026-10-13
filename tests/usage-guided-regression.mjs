/** Loopback-only first-party usage and guided setup regression.
 * Must run against a disposable DB and API server pointed at that SAME DB.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const base=process.env.BASE_URL;
const databaseUrl=process.env.TEST_DATABASE_URL;
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(base||''))throw Error('BASE_URL must be local loopback');
if(!databaseUrl||!/(?:test|qa|verify|scratch|regression|ephemeral)/i.test(new URL(databaseUrl).pathname))throw Error('A disposable TEST_DATABASE_URL is mandatory.');
const users=[0,1].map(n=>({email:'guided-'+n+'-'+randomUUID().slice(0,8)+'@example.test',cookie:'',project:''}));
async function req(path,{user,method='GET',body}={}){
 const headers={};if(user?.cookie)headers.cookie=user.cookie;if(method!=='GET')headers.origin=base;
 if(body!==undefined)headers['content-type']='application/json';
 const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(10000)});
 return {status:response.status,body:await response.json().catch(()=>({})),cookie:response.headers.get('set-cookie')};
}
function check(response,status){assert.equal(response.status,status,JSON.stringify(response.body).slice(0,400));return response.body;}
test('guided workspace usage is first-party, private, honest and updates after edits',{timeout:30000},async t=>{
 const client=new pg.Client({connectionString:databaseUrl});await client.connect();
 try{
 await t.test('usage endpoint rejects unauthenticated requests',async()=>{check(await req('/api/usage'),401);});
 await t.test('register independent workspaces',async()=>{
  for(const u of users){
   const r=await req('/api/auth/register',{method:'POST',body:{email:u.email,displayName:'Guided QA',password:'qa-long-password-123456'}});
   check(r,201);u.cookie=r.cookie?.split(';')[0]||'';assert.ok(u.cookie);
  }
 });
 await t.test('usage initializes with real zeroes and no imaginary paid plan',async()=>{
  for(const u of users){
   const data=check(await req('/api/usage',{user:u}),200);
   assert.equal(data.source,'first_party_postgresql');assert.equal(data.sample,false);
   assert.equal(data.usage.projects,0);assert.equal(data.usage.keywords,0);
   assert.equal(data.limits.enforcedPlanLimits,false);
   assert.equal(data.limits.overageBilling,false);
   assert.equal(data.limits.projectCap,null);
  }
 });
 await t.test('saved records update only the correct workspace counts',async()=>{
  const a=users[0];
  const project=check(await req('/api/projects',{user:a,method:'POST',body:{name:'Guided project',domain:'guided.example.test'}}),201);
  a.project=project.project.id;
  check(await req('/api/keywords',{user:a,method:'POST',body:{projectId:a.project,keyword:'guided seo'}}),201);
  const first=check(await req('/api/usage',{user:a}),200).usage;
  const second=check(await req('/api/usage',{user:users[1]}),200).usage;
  assert.equal(first.projects,1);assert.equal(first.keywords,1);
  assert.equal(second.projects,0);assert.equal(second.keywords,0);
 });
 }finally{await client.end();}
});
