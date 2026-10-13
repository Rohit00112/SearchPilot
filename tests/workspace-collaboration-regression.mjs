/** Loopback-only two-account collaboration regression; use an isolated test DB. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.BASE_URL;
if(!base||!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(base))throw Error('An isolated loopback BASE_URL is required.');
const suffix=randomUUID().slice(0,8);
const owner={email:`owner-${suffix}@example.test`,cookie:'',workspace:''};
const invited={email:`invited-${suffix}@example.test`,cookie:'',workspace:''};
async function api(path,{user,method='GET',data,workspace}={}){
  const headers={};
  if(user?.cookie)headers.cookie=user.cookie+(user.workspaceCookie?'; '+user.workspaceCookie:'');
  if(workspace)headers['x-workspace-id']=workspace;
  if(method!=='GET'&&method!=='HEAD')headers.origin=base;
  if(data!==undefined)headers['content-type']='application/json';
  const response=await fetch(base+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data),redirect:'manual',signal:AbortSignal.timeout(10000)});
  const body=(response.headers.get('content-type')||'').includes('json')?await response.json():await response.text();
  return {status:response.status,body,cookie:response.headers.get('set-cookie')};
}
function expectStatus(result,code){assert.equal(result.status,code,JSON.stringify(result.body).slice(0,220));return result.body;}
test('workspace invitation, member roles and selected workspace isolation',{timeout:45000},async t=>{
  await t.test('register two separate workspace accounts',async()=>{
    for(const user of [owner,invited]){
      const response=await api('/api/auth/register',{method:'POST',data:{email:user.email,password:'Very-secure-qa-password-1234',displayName:'QA Member'}});
      user.workspace=expectStatus(response,201).activeWorkspaceId;
      user.cookie=response.cookie.split(';')[0];
    }
    assert.notEqual(owner.workspace,invited.workspace);
  });
  let token='',invitationId='',projectId='';
  await t.test('owner creates private project and email-bound invitation',async()=>{
    const result=await api('/api/projects',{user:owner,method:'POST',data:{name:'Team-owned project',domain:'example.test'}});
    projectId=expectStatus(result,201).project.id;
    const invite=await api('/api/workspaces/invitations',{user:owner,method:'POST',data:{email:invited.email,role:'viewer'}});
    const body=expectStatus(invite,201);
    token=body.invitation.inviteToken;invitationId=body.invitation.id;
    assert.equal(body.delivery,'manual_copy_only');
    // The second account owns its own default workspace; its member listing is allowed,
    // but must never expose the first account's pending invitation.
    const foreignList=expectStatus(await api('/api/workspaces/invitations',{user:invited,method:'GET'}),200);
    assert.equal(foreignList.invitations.some(x=>x.id===invitationId),false);
  });
  await t.test('invitation token cannot be redeemed by another email or twice',async()=>{
    const outsider=await api('/api/workspaces/invitations/accept',{user:owner,method:'POST',data:{token}});
    assert.equal(outsider.status,403);
    const accepted=await api('/api/workspaces/invitations/accept',{user:invited,method:'POST',data:{token}});
    expectStatus(accepted,200);invited.workspaceCookie=accepted.cookie.split(';')[0];
    assert.equal((await api('/api/workspaces/invitations/accept',{user:invited,method:'POST',data:{token}})).status,403);
    const listing=expectStatus(await api('/api/workspaces',{user:invited}),200);
    assert.equal(listing.workspaces.length,2);
    assert.equal(listing.activeWorkspaceId,owner.workspace);
  });
  await t.test('viewer reads shared project but cannot mutate; own workspace isolated',async()=>{
    const result=expectStatus(await api('/api/projects',{user:invited}),200);
    assert.equal(result.projects[0].id,projectId);
    assert.equal((await api('/api/projects',{user:invited,method:'POST',data:{name:'Blocked write',domain:'blocked.example.test'}})).status,403);
    const own=expectStatus(await api('/api/projects',{user:invited,workspace:invited.workspace}),200);
    assert.deepEqual(own.projects,[]);
  });
  await t.test('owner may promote then revoke membership, never edit owner',async()=>{
    const list=expectStatus(await api('/api/workspaces/invitations',{user:owner}),200);
    assert.equal(list.invitations.find(x=>x.id===invitationId).acceptedAt!==null,true);
    const member=list.members.find(x=>x.email===invited.email);
    assert.ok(member);
    expectStatus(await api('/api/workspaces/members?id='+member.id,{user:owner,method:'PATCH',data:{role:'editor'}}),200);
    expectStatus(await api('/api/projects',{user:invited,method:'POST',data:{name:'Editor-created project',domain:'editor.example.test'}}),201);
    const ownerMember=list.members.find(x=>x.role==='owner');
    assert.equal((await api('/api/workspaces/members?id='+ownerMember.id,{user:owner,method:'PATCH',data:{role:'viewer'}})).status,404);
    expectStatus(await api('/api/workspaces/members?id='+member.id,{user:owner,method:'DELETE'}),200);
    assert.equal((await api('/api/projects',{user:invited})).status,401);
    const own=expectStatus(await api('/api/workspaces',{user:invited}),200);
    assert.equal(own.workspaces.length,1);
  });
});
