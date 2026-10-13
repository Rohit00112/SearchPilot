'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
type Keyword={id:string;keyword:string};
type Observation={id:string;keywordId:string;keyword:string;position:number;observedAt:string;source:string;note:string|null};
type Page={hasMore:boolean;nextCursor:string|null};
type RankResponse={rankings:Observation[];page:Page;provenance:{source:string;verified:boolean}};
async function get<T>(path:string,options?:RequestInit):Promise<T>{
 const r=await fetch(path,{cache:'no-store',credentials:'same-origin',...options});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Unable to load manual ranks.');return data as T;
}
export default function ManualRankHistory({projectId,keywords}:{projectId:string;keywords:Keyword[]}){
 const [observations,setObservations]=useState<Observation[]>([]),[cursor,setCursor]=useState<string|null>(null),[hasMore,setHasMore]=useState(false);
 const [selected,setSelected]=useState(''),[position,setPosition]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[status,setStatus]=useState('');
 async function fetchPage(project:string,c:string|null,append:boolean,alive:()=>boolean){
  const params=new URLSearchParams({projectId:project,limit:'100'});if(c)params.set('cursor',c);
  const data=await get<RankResponse>('/api/rankings?'+params.toString());
  if(!alive())return;
  setObservations(old=>append?[...old,...data.rankings]:data.rankings);
  setHasMore(Boolean(data.page.hasMore));setCursor(data.page.nextCursor);
 }
 useEffect(()=>{
  let active=true;setLoading(true);setError('');setObservations([]);setCursor(null);setHasMore(false);setSelected(keywords[0]?.id||'');
  if(!projectId){setLoading(false);return()=>{active=false}};
  void fetchPage(projectId,null,false,()=>active).catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load ranks.');}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[projectId,keywords[0]?.id]);
 const grouped=useMemo(()=>observations.filter(r=>!selected||r.keywordId===selected).sort((a,b)=>new Date(a.observedAt).getTime()-new Date(b.observedAt).getTime()),[observations,selected]);
 const timeline=grouped.slice(-30).map(r=>({date:new Date(r.observedAt).toLocaleDateString(),position:r.position,at:r.observedAt}));
 const latest=grouped.at(-1),prior=grouped.at(-2),delta=latest&&prior?prior.position-latest.position:null;
 async function record(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError('');setStatus('');
  try{
   const positionNumber=Number(position);
   if(!selected||!Number.isInteger(positionNumber)||positionNumber<1||positionNumber>1000)throw Error('Choose a keyword and enter a whole position from 1 to 1,000.');
   await get('/api/rankings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId,keywordId:selected,position:positionNumber,note:note.trim()||undefined})});
   setPosition('');setNote('');await fetchPage(projectId,null,false,()=>true);
   setStatus('Manual observation saved. This is not an automatically checked Google ranking.');
  }catch(e){setError(e instanceof Error?e.message:'Unable to save observation.')}finally{setBusy(false)}
 }
 async function more(){
  if(!cursor||busy)return;setBusy(true);try{await fetchPage(projectId,cursor,true,()=>true);}catch(e){setError(e instanceof Error?e.message:'Unable to load older ranks.')}finally{setBusy(false)}
 }
 return <section className="space-y-5 rounded-xl border border-[#D4DED3] bg-white p-5 md:p-6" aria-label="Manually recorded ranking history">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-[#1B332D]">Recorded ranking history</h2><p className="mt-2 max-w-2xl text-sm text-[#52645C]">These positions are supplied by users. They are not independently observed SERP rankings; changes compare the latest two recorded observations only.</p></div><span className="rounded-full bg-[#E1F2E8] px-3 py-2 text-xs font-semibold text-[#0F5943]">MANUAL · UNVERIFIED</span></div>
  {error&&<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm">{error}</p>}
  {status&&<p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">{status}</p>}
  <label className="block text-sm font-semibold text-[#1B332D]">Tracked keyword
   <select className="mt-2 block w-full max-w-md rounded-lg border border-[#678376] bg-white p-3" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">All manually recorded keywords</option>{keywords.map(k=><option value={k.id} key={k.id}>{k.keyword}</option>)}</select>
  </label>
  {selected&&<div className="grid gap-3 sm:grid-cols-3">
   <div className="rounded-lg bg-[#F8F6F1] p-4"><p className="text-xs text-[#52645C]">Latest entered position</p><strong className="mt-2 block text-2xl">{latest?.position??'—'}</strong></div>
   <div className="rounded-lg bg-[#F8F6F1] p-4"><p className="text-xs text-[#52645C]">Change from previous entry</p><strong className="mt-2 block text-2xl">{delta===null?'—':delta>0?'+'+delta:String(delta)}</strong></div>
   <div className="rounded-lg bg-[#F8F6F1] p-4"><p className="text-xs text-[#52645C]">Last recorded</p><strong className="mt-2 block text-base">{latest?new Date(latest.observedAt).toLocaleString():'Never'}</strong></div>
  </div>}
  {timeline.length>1&&<div className="h-56 w-full" role="img" aria-label="Line chart of user-entered positions on recorded dates; a smaller position number is better"><ResponsiveContainer width="100%" height="100%"><LineChart data={timeline} margin={{top:14,right:16,left:-12,bottom:12}}><CartesianGrid strokeDasharray="3 5" stroke="#D4DED3"/><XAxis dataKey="date" tick={{fontSize:10,fill:'#52645C'}}/><YAxis reversed domain={[1,'dataMax']} allowDecimals={false} tick={{fontSize:11,fill:'#52645C'}}/><Tooltip formatter={(value)=>['#'+value,'Entered position']}/><Line dataKey="position" name="Entered position" type="linear" stroke="#13664E" strokeWidth={2.5} dot={{r:3}}/></LineChart></ResponsiveContainer></div>}
  <form onSubmit={e=>void record(e)} className="grid gap-3 rounded-lg border border-[#D4DED3] bg-[#FFFCF7] p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
    <label className="text-xs font-semibold">New manual position<input type="number" min={1} max={1000} required value={position} onChange={e=>setPosition(e.target.value)} className="mt-2 block w-full rounded-lg border border-[#678376] p-3" placeholder="e.g. 12"/></label>
    <label className="text-xs font-semibold">Optional source note<input value={note} maxLength={500} onChange={e=>setNote(e.target.value)} className="mt-2 block w-full rounded-lg border border-[#678376] p-3" placeholder="How you checked this position"/></label>
    <button type="submit" disabled={busy||!selected} className="rounded-lg bg-[#13664E] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Record position</button>
  </form>
  {loading?<p role="status" className="text-sm">Loading saved observations…</p>:grouped.length?<div role="region" tabIndex={0} aria-label="Manual ranking observations" className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-xs"><thead className="bg-[#F2EFE6]"><tr><th className="p-3">Keyword</th><th className="p-3">Entered position</th><th className="p-3">Observed date</th><th className="p-3">Note</th></tr></thead><tbody>{[...grouped].reverse().slice(0,100).map(r=><tr key={r.id} className="border-b"><th scope="row" className="p-3 font-semibold">{r.keyword}</th><td className="p-3">{r.position}</td><td className="p-3">{new Date(r.observedAt).toLocaleString()}</td><td className="max-w-64 break-words p-3">{r.note||'—'}</td></tr>)}</tbody></table></div>:<p className="rounded-lg bg-[#F8F6F1] p-4 text-sm text-[#52645C]">No manually recorded positions yet. Choose a tracked keyword and enter your first observation.</p>}
  {hasMore&&<button type="button" className="rounded-lg border border-[#13664E] px-4 py-2 text-sm text-[#13664E]" disabled={busy} onClick={()=>void more()}>Load older observations</button>}
  <p className="text-xs text-[#52645C]">Displaying up to 100 most recently fetched observations per API page. <Link href="/seo-campaigns" className="font-semibold text-[#13664E] underline">Configure a tracking campaign</Link> to record target context; this does not enable automatic SERP checks.</p>
 </section>;
}
