'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {Copy,UserPlus,Trash2,RefreshCw} from 'lucide-react';
type Workspace={id:string;name:string;role:'owner'|'editor'|'viewer'};
type Member={id:string;email:string;displayName:string;role:'owner'|'editor'|'viewer';joinedAt:string};
type Invite={id:string;email:string;role:string;expiresAt:string;acceptedAt:string|null;revokedAt:string|null;createdAt:string};
async function api<T>(url:string,options?:RequestInit):Promise<T>{
  const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options}),data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||'Request failed.');
  return data as T;
}
export default function TeamPage(){
  const [workspaces,setWorkspaces]=useState<Workspace[]>([]),[selected,setSelected]=useState(''),[members,setMembers]=useState<Member[]>([]),[invites,setInvites]=useState<Invite[]>([]);
  const [email,setEmail]=useState(''),[role,setRole]=useState<'viewer'|'editor'>('viewer'),[inviteLink,setInviteLink]=useState('');
  const [error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const current=workspaces.find(w=>w.id===selected);
  const load=useCallback(async()=>{setLoading(true);setError('');try{
    const data=await api<{workspaces:Workspace[],activeWorkspaceId:string|null}>('/api/workspaces');
    setWorkspaces(data.workspaces);setSelected(data.activeWorkspaceId||'');
  }catch(e){setError(e instanceof Error?e.message:'Unable to read workspaces.')}finally{setLoading(false)}},[]);
  const loadTeam=useCallback(async()=>{if(!current||current.role!=='owner'){setMembers([]);setInvites([]);return;}
    try{
      const data=await api<{members:Member[],invitations:Invite[]}>('/api/workspaces/invitations');
      setMembers(data.members);setInvites(data.invitations);
    }catch(e){setError(e instanceof Error?e.message:'Unable to read team.')}
  },[current?.id,current?.role]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{void loadTeam()},[loadTeam]);
  async function action(fn:()=>Promise<void>){setBusy(true);setError('');setStatus('');try{await fn()}catch(e){setError(e instanceof Error?e.message:'Request failed.')}finally{setBusy(false)}}
  async function select(id:string){await action(async()=>{
    await api('/api/workspaces',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({workspaceId:id})});
    setSelected(id);setInviteLink('');setMembers([]);setInvites([]);setStatus('Active workspace changed. Other SearchPilot screens will now use this workspace.');
  });}
  async function createInvite(event:React.FormEvent){event.preventDefault();await action(async()=>{
    const data=await api<{invitation:{inviteToken:string,email:string},delivery:string}>('/api/workspaces/invitations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,role})});
    setInviteLink(new URL('/join/'+encodeURIComponent(data.invitation.inviteToken),window.location.origin).toString());
    setEmail('');setStatus('Invitation created. Copy and securely share the link. NO email was sent.');
    await loadTeam();
  });}
  async function changeRole(member:Member,next:'editor'|'viewer'){await action(async()=>{
    await api('/api/workspaces/members?id='+encodeURIComponent(member.id),{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({role:next})});
    await loadTeam();setStatus('Role changed.');
  });}
  async function removeMember(member:Member){if(!window.confirm('Remove access for '+member.email+'?'))return;
    await action(async()=>{await api('/api/workspaces/members?id='+encodeURIComponent(member.id),{method:'DELETE'});await loadTeam();setStatus('Member removed.');});}
  async function revoke(invite:Invite){await action(async()=>{
    await api('/api/workspaces/invitations?id='+encodeURIComponent(invite.id),{method:'DELETE'});await loadTeam();setStatus('Pending invitation revoked.');
  });}
  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-10">
    <div className="mx-auto max-w-5xl space-y-5">
      <nav className="text-sm"><Link className="text-indigo-700 underline" href="/">SearchPilot</Link> / Team & workspaces</nav>
      <header className="rounded-2xl bg-gradient-to-r from-[#24204b] to-[#6246af] p-7 text-white"><h1 className="text-3xl font-bold">Team and workspace access</h1><p className="mt-3 text-sm text-violet-100">Invite teammates as viewers or editors, manage access, and switch between permitted workspaces.</p></header>
      {error&&<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm">{error}</p>}
      {status&&<p role="status" className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm">{status}</p>}
      <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Active workspace</h2>
        {loading?<p className="mt-3 text-sm">Loading workspaces…</p>:<div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex-1 text-sm">Workspace<select className="mt-2 block w-full rounded-lg border border-slate-300 p-3" value={selected} onChange={e=>void select(e.target.value)}>{workspaces.map(w=><option value={w.id} key={w.id}>{w.name} · {w.role}</option>)}</select></label>
          <button type="button" onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"><RefreshCw size={16}/> Refresh</button>
        </div>}
      </section>
      {current?.role!=='owner'?<section className="rounded-xl border bg-white p-6 text-sm text-slate-600">{current?'Only workspace owners can invite and manage members. You can still access the workspace according to your assigned role.':'No accessible workspace found. Sign in or accept an invitation.'}</section>:<>
        <section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-bold">Invite a collaborator</h2><p className="mt-2 text-sm text-slate-600">Invitations are restricted to the specified email, valid for seven days, and consumed once. Outbound email is not connected; share the link yourself.</p>
          <form onSubmit={createInvite} className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-48 flex-1 text-sm">Email address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 p-3"/></label>
            <label className="text-sm">Permission<select value={role} onChange={e=>setRole(e.target.value as 'viewer'|'editor')} className="mt-1 block w-full rounded-lg border border-slate-300 p-3"><option value="viewer">Viewer</option><option value="editor">Editor</option></select></label>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><UserPlus size={16}/> Create invite</button>
          </form>
          {inviteLink&&<div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3"><p className="text-xs font-semibold text-indigo-900">One-time invitation link — only displayed here</p><p className="mt-2 break-all text-xs">{inviteLink}</p><button className="mt-2 inline-flex items-center gap-2 rounded border border-indigo-500 px-3 py-2 text-sm" type="button" onClick={()=>void navigator.clipboard.writeText(inviteLink).then(()=>setStatus('Invitation link copied.'),()=>setError('Copy permission was denied.'))}><Copy size={15}/> Copy invite link</button></div>}
        </section>
        <section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-bold">Team members</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[590px] text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Member</th><th className="p-3">Role</th><th className="p-3">Action</th></tr></thead><tbody>{members.map(member=><tr key={member.id} className="border-b"><td className="p-3"><strong>{member.displayName}</strong><span className="block text-xs text-slate-600">{member.email}</span></td><td className="p-3">{member.role==='owner'?'Owner':<select aria-label={'Role for '+member.email} value={member.role} onChange={e=>void changeRole(member,e.target.value as 'viewer'|'editor')} className="rounded border p-2"><option value="viewer">Viewer</option><option value="editor">Editor</option></select>}</td><td className="p-3">{member.role!=='owner'&&<button type="button" onClick={()=>void removeMember(member)} className="inline-flex items-center gap-1 text-red-700"><Trash2 size={15}/> Remove</button>}</td></tr>)}</tbody></table></div></section>
        <section className="rounded-xl border bg-white p-5"><h2 className="text-lg font-bold">Invitation history</h2><div className="mt-3 space-y-2">{invites.map(invite=><div key={invite.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"><div className="min-w-0 flex-1"><strong>{invite.email}</strong><span className="ml-2 text-xs text-slate-600">{invite.role} · {invite.acceptedAt?'Accepted':invite.revokedAt?'Revoked':new Date(invite.expiresAt)<new Date()?'Expired':'Pending'}</span></div>{!invite.acceptedAt&&!invite.revokedAt&&<button onClick={()=>void revoke(invite)} disabled={busy} className="rounded border border-red-300 px-3 py-2 text-red-700">Revoke</button>}</div>)}{!invites.length&&<p className="text-sm text-slate-600">No invitations yet.</p>}</div></section>
      </>}
    </div>
  </main>;
}
