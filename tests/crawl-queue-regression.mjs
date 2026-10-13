/**
 * Loopback-only queued crawl API checks. Deliberately never starts any crawler
 * or contacts external websites. Run against a disposable migrated database.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.BASE_URL;
if(!base||!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(base))throw Error('Use an isolated loopback BASE_URL.');
const token=randomUUID().slice(0,8);
const users=[{email:`crawl-a-${token}@example.test`,cookie:'',project:''},{email:`crawl-b-${token}@example.test`,cookie:'',project:''}];
async function req(path,{user,method='GET',body}={}){
 const headers={};
 if(user?.cookie)headers.cookie=user.cookie;
 if(method!=='GET'&&method!=='HEAD')headers.origin=base;
 if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(10000)});
 return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};
}
function ok(result,status){assert.equal(result.status,status,JSON.stringify(result.data).slice(0,300));return result.data;}
test('bounded tenant-scoped audit job lifecycle, network not invoked',{timeout:30000},async t=>{
 await t.test('two separate owners with local projects',async()=>{
  for(const [index,u] of users.entries()){
   const created=await req('/api/auth/register',{method:'POST',body:{email:u.email,password:'Secure-test-password-123456',displayName:'Crawler tester'}});
   ok(created,201);u.cookie=created.cookie.split(';')[0];
   u.project=ok(await req('/api/projects',{user:u,method:'POST',body:{name:'Crawler '+index,domain:'crawl'+index+'.example.test'}}),201).project.id;
  }
 });
 let job='';
 await t.test('enqueue returns 202 and stays queued without pretending to scan',async()=>{
  const response=await req('/api/seo/crawls',{user:users[0],method:'POST',body:{projectId:users[0].project,maxPages:3,maxDepth:1}});
  const j=ok(response,202).job;job=j.id;assert.equal(j.status,'queued');assert.equal(j.pagesCrawled,0);
  const list=ok(await req('/api/seo/crawls?projectId='+users[0].project,{user:users[0]}),200);
  assert.equal(list.jobs.length,1);assert.equal(list.workerMode,'explicit');
  const detail=ok(await req('/api/seo/crawls/'+job,{user:users[0]}),200);
  assert.equal(detail.pages.length,0);assert.equal(detail.issues.length,0);
 });
 await t.test('limits, duplicate queue and cross-tenant access rejected',async()=>{
  const duplicate=await req('/api/seo/crawls',{user:users[0],method:'POST',body:{projectId:users[0].project,maxPages:3}});
  ok(duplicate,409);
  const tooLarge=await req('/api/seo/crawls',{user:users[1],method:'POST',body:{projectId:users[1].project,maxPages:11}});
  ok(tooLarge,400);
  ok(await req('/api/seo/crawls/'+job,{user:users[1]}),404);
  ok(await req('/api/seo/crawls?projectId='+users[0].project,{user:users[1]}),404);
  ok(await req('/api/seo/crawls',{user:users[1],method:'POST',body:{projectId:users[0].project}}),404);
 });
 await t.test('cancel queued job, reject duplicate cancellation and comparison',async()=>{
  const cancelled=ok(await req('/api/seo/crawls/'+job,{user:users[0],method:'PATCH',body:{action:'cancel'}}),200);
  assert.equal(cancelled.job.status,'cancelled');
  ok(await req('/api/seo/crawls/'+job,{user:users[0],method:'PATCH',body:{action:'cancel'}}),409);
  const comparison=await req('/api/seo/crawls/compare?projectId='+users[0].project+'&fromId='+job+'&toId='+job,{user:users[0]});
  ok(comparison,404);
 });
});
