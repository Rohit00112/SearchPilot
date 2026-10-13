'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';

type Keyword={id:string;keyword:string};
type Observation={id:string;keywordId:string;keyword:string;position:number;observedAt:string;source:string;note:string|null};
type Page={hasMore:boolean;nextCursor:string|null};
type RankResponse={rankings:Observation[];page:Page;provenance:{source:string;verified:boolean}};

async function get<T>(path:string,options?:RequestInit):Promise<T>{
 const response=await fetch(path,{cache:'no-store',credentials:'same-origin',...options});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(typeof data.error==='string'?data.error:'Unable to load manual ranks.');
 return data as T;
}

export default function ManualRankHistory({projectId,keywords}:{projectId:string;keywords:Keyword[]}){
 const [observations,setObservations]=useState<Observation[]>([]);
 const [cursor,setCursor]=useState<string|null>(null),[hasMore,setHasMore]=useState(false);
 const [selected,setSelected]=useState(''),[position,setPosition]=useState(''),[note,setNote]=useState('');
 const [saving,setSaving]=useState(false),[loading,setLoading]=useState(true),[paging,setPaging]=useState(false);
 const [error,setError]=useState(''),[status,setStatus]=useState('');
 const mounted=useRef(false),activeProject=useRef(projectId),requestVersion=useRef(0);
 const pageController=useRef<AbortController|null>(null),writeController=useRef<AbortController|null>(null);
 const pageInFlight=useRef(false),writeInFlight=useRef(false);

 async function fetchPage(project:string,requestedCursor:string|null,append:boolean):Promise<boolean>{
  const version=++requestVersion.current;
  pageController.current?.abort();
  const controller=new AbortController();
  pageController.current=controller;
  pageInFlight.current=true;
  if(append)setPaging(true);else setLoading(true);
  setError('');
  const current=()=>mounted.current&&activeProject.current===project&&requestVersion.current===version&&!controller.signal.aborted;
  try{
   const params=new URLSearchParams({projectId:project,limit:'100'});
   if(requestedCursor)params.set('cursor',requestedCursor);
   const data=await get<RankResponse>('/api/rankings?'+params.toString(),{signal:controller.signal});
   if(!current())return false;
   if(!Array.isArray(data.rankings)||!data.page||typeof data.page.hasMore!=='boolean'||
      (data.page.hasMore&&(!data.page.nextCursor||data.page.nextCursor===requestedCursor))||
      data.provenance?.source!=='manual'||data.provenance?.verified!==false){
    throw Error('The manual ranking response was incomplete. Please retry.');
   }
   setObservations(previous=>{
    if(!append)return data.rankings;
    const known=new Set(previous.map(row=>row.id));
    return [...previous,...data.rankings.filter(row=>!known.has(row.id))];
   });
   setHasMore(data.page.hasMore);
   setCursor(data.page.nextCursor);
   return true;
  }catch(cause){
   if(current())setError(cause instanceof Error?cause.message:'Unable to load manual ranks.');
   return false;
  }finally{
   if(requestVersion.current===version){
    pageInFlight.current=false;
    pageController.current=null;
    if(current()){if(append)setPaging(false);else setLoading(false);}
   }
  }
 }

 useEffect(()=>{
  mounted.current=true;
  activeProject.current=projectId;
  setObservations([]);setCursor(null);setHasMore(false);
  setSelected(keywords[0]?.id??'');setPosition('');setNote('');setError('');setStatus('');
  if(projectId)void fetchPage(projectId,null,false);
  else setLoading(false);
  return()=>{
   mounted.current=false;
   requestVersion.current++;
   pageController.current?.abort();writeController.current?.abort();
   pageInFlight.current=false;writeInFlight.current=false;
  };
  // Keyword updates should never reset the selected keyword or restart a page fetch.
  // The parent keys this component by project, so new projects get fresh state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[projectId]);

 const visibleSelection=keywords.some(item=>item.id===selected)?selected:'';
 const grouped=useMemo(()=>observations.filter(row=>!visibleSelection||row.keywordId===visibleSelection)
  .sort((a,b)=>new Date(b.observedAt).getTime()-new Date(a.observedAt).getTime()||b.id.localeCompare(a.id)),[observations,visibleSelection]);
 const timeline=[...grouped.slice(0,30)].reverse().map(row=>({date:new Date(row.observedAt).toLocaleDateString(),position:row.position}));
 const latest=grouped[0],prior=grouped[1],delta=latest&&prior?prior.position-latest.position:null;

 async function record(event:React.FormEvent){
  event.preventDefault();
  if(writeInFlight.current||pageInFlight.current||!mounted.current)return;
  writeInFlight.current=true;
  setSaving(true);setError('');setStatus('');
  const controller=new AbortController();writeController.current=controller;
  const current=()=>mounted.current&&activeProject.current===projectId&&!controller.signal.aborted;
  try{
   const number=Number(position);
   if(!visibleSelection||!Number.isInteger(number)||number<1||number>1000)
    throw Error('Choose a keyword and enter a whole position from 1 to 1,000.');
   await get('/api/rankings',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({projectId,keywordId:visibleSelection,position:number,note:note.trim()||undefined}),signal:controller.signal});
   if(!current())return;
   setPosition('');setNote('');
   if(await fetchPage(projectId,null,false)&&current())
    setStatus('Manual observation saved. This is not an automatically checked Google ranking.');
  }catch(cause){
   if(current())setError(cause instanceof Error?cause.message:'Unable to save observation.');
  }finally{
   if(writeController.current===controller)writeController.current=null;
   writeInFlight.current=false;
   if(current())setSaving(false);
  }
 }

 async function more(){
  if(!cursor||!hasMore||pageInFlight.current||writeInFlight.current||!mounted.current)return;
  setStatus('');
  await fetchPage(projectId,cursor,true);
 }

 return <section className="space-y-5 rounded-xl border border-[#D4DED3] bg-white p-5 md:p-6" aria-label="Manually recorded ranking history">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-[#1B332D]">Recorded ranking history</h2><p className="mt-2 max-w-2xl text-sm text-[#52645C]">These positions are supplied by users. They are not independently observed SERP rankings; changes compare the latest two recorded observations only.</p></div><span className="rounded-full bg-[#E1F2E8] px-3 py-2 text-xs font-semibold text-[#0F5943]">MANUAL · UNVERIFIED</span></div>
  {error&&<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm">{error}</p>}
  {status&&<p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">{status}</p>}
  <label className="block text-sm font-semibold text-[#1B332D]">Tracked keyword
   <select className="mt-2 block w-full max-w-md rounded-lg border border-[#678376] bg-white p-3" value={visibleSelection} onChange={event=>setSelected(event.target.value)}><option value="">All manually recorded keywords</option>{keywords.map(item=><option value={item.id} key={item.id}>{item.keyword}</option>)}</select>
  </label>
  {visibleSelection&&<div className="grid gap-3 sm:grid-cols-3">
   <div className="rounded-lg bg-[#F8F6F1] p-4"><p className="text-xs text-[#52645C]">Latest entered position</p><strong className="mt-2 block text-2xl">{latest?.position??'—'}</strong></div>
   <div className="rounded-lg bg-[#F8F6F1] p-4"><p className="text-xs text-[#52645C]">Change from previous entry</p><strong className="mt-2 block text-2xl">{delta===null?'—':delta>0?'+'+delta:String(delta)}</strong></div>
   <div className="rounded-lg bg-[#F8F6F1] p-4"><p className="text-xs text-[#52645C]">Last recorded</p><strong className="mt-2 block text-base">{latest?new Date(latest.observedAt).toLocaleString():'Never'}</strong></div>
  </div>}
  {timeline.length>1&&<div className="h-56 w-full" role="img" aria-label="Line chart of user-entered positions on recorded dates; a smaller position number is better"><ResponsiveContainer width="100%" height="100%"><LineChart data={timeline} margin={{top:14,right:16,left:-12,bottom:12}}><CartesianGrid strokeDasharray="3 5" stroke="#D4DED3"/><XAxis dataKey="date" tick={{fontSize:10,fill:'#52645C'}}/><YAxis reversed domain={[1,'dataMax']} allowDecimals={false} tick={{fontSize:11,fill:'#52645C'}}/><Tooltip formatter={(value)=>['#'+value,'Entered position']}/><Line dataKey="position" name="Entered position" type="linear" stroke="#13664E" strokeWidth={2.5} dot={{r:3}}/></LineChart></ResponsiveContainer></div>}
  <form onSubmit={event=>void record(event)} className="grid gap-3 rounded-lg border border-[#D4DED3] bg-[#FFFCF7] p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
    <label className="text-xs font-semibold">New manual position<input type="number" min={1} max={1000} required value={position} onChange={event=>setPosition(event.target.value)} className="mt-2 block w-full rounded-lg border border-[#678376] p-3" placeholder="e.g. 12"/></label>
    <label className="text-xs font-semibold">Optional source note<input value={note} maxLength={500} onChange={event=>setNote(event.target.value)} className="mt-2 block w-full rounded-lg border border-[#678376] p-3" placeholder="How you checked this position"/></label>
    <button type="submit" disabled={saving||loading||paging||!visibleSelection} className="rounded-lg bg-[#13664E] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?'Saving observation…':'Record position'}</button>
  </form>
  {loading?<p role="status" className="text-sm">Loading saved observations…</p>:grouped.length?<div role="region" tabIndex={0} aria-label="Manual ranking observations" className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-xs"><thead className="bg-[#F2EFE6]"><tr><th className="p-3">Keyword</th><th className="p-3">Entered position</th><th className="p-3">Observed date</th><th className="p-3">Note</th></tr></thead><tbody>{grouped.map(row=><tr key={row.id} className="border-b"><th scope="row" className="p-3 font-semibold">{row.keyword}</th><td className="p-3">{row.position}</td><td className="p-3">{new Date(row.observedAt).toLocaleString()}</td><td className="max-w-64 break-words p-3">{row.note||'—'}</td></tr>)}</tbody></table></div>:<p className="rounded-lg bg-[#F8F6F1] p-4 text-sm text-[#52645C]">{error?'Saved observations could not be loaded.':'No manually recorded positions for this selection yet. Choose a tracked keyword and enter an observation.'}</p>}
  {hasMore&&<button type="button" className="rounded-lg border border-[#13664E] px-4 py-2 text-sm text-[#13664E] disabled:opacity-50" disabled={paging||saving||loading} onClick={()=>void more()}>{paging?'Loading older observations…':'Load older observations'}</button>}
  <p className="text-xs text-[#52645C]">Loaded {observations.length} manually entered observations in pages of up to 100. <Link href="/seo-campaigns" className="font-semibold text-[#13664E] underline">Configure a tracking campaign</Link> to record target context; this does not enable automatic SERP checks.</p>
 </section>;
}
