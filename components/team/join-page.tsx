'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
export default function JoinPage({token}:{token:string}){
  const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function accept(){
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/workspaces/invitations/accept',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({token})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(data.error||'Unable to accept invitation.');
      router.replace('/projects');router.refresh();
    }catch(e){setError(e instanceof Error?e.message:'Unable to accept invitation.')}finally{setBusy(false)}
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5"><div className="w-full max-w-lg rounded-2xl border bg-white p-8 shadow-sm">
    <Link href="/" className="text-sm font-bold text-indigo-700">SearchPilot</Link>
    <h1 className="mt-5 text-2xl font-bold">Accept workspace invitation</h1>
    <p className="mt-3 text-sm text-slate-600">Sign in with the exact email address invited by the workspace owner. The invitation is valid for seven days and can be used only once.</p>
    {error&&<p role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm">{error}</p>}
    <button type="button" onClick={()=>void accept()} disabled={busy} className="mt-6 w-full rounded-lg bg-indigo-700 p-3 text-sm font-bold text-white disabled:opacity-50">{busy?'Verifying invitation…':'Accept invitation'}</button>
    <p className="mt-5 text-sm text-slate-600">Need to sign in? <Link href="/login" className="font-bold text-indigo-700 underline">Go to login</Link> and return to this link afterward.</p>
  </div></main>;
}
