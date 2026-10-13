'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowDownUp,Download,RefreshCw} from 'lucide-react';

type Opportunity={query:string;clicks:number;impressions:number;ctr:number|null;averagePosition:number|null;latestDate:string;opportunity:{flag:boolean;label:string}};
type Payload={rows?:Opportunity[];filters?:{from:string;to:string;property:string|null};page?:{limit:number;hasMore:boolean};provenance?:{sourceType:string;sample:boolean;live:boolean;coverage?:string};heuristic?:{name:string;description:string}};
type Sort='impressions'|'clicks'|'ctr'|'averagePosition';
const date=(daysAgo:number)=>new Date(Date.now()-daysAgo*86400000).toISOString().slice(0,10);
function csvCell(value:unknown):string {
  const clean=String(value??'').replace(/\u0000/g,'');
  const safe=/^[\s\u0000-\u001f]*[=+\-@]/u.test(clean)?"'"+clean:clean;
  return '"'+safe.replace(/"/g,'""')+'"';
}
export default function GscOpportunities(){
  const [from,setFrom]=useState(()=>date(30)),[to,setTo]=useState(()=>date(3)),[property,setProperty]=useState('');
  const [rows,setRows]=useState<Opportunity[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [source,setSource]=useState(''),[limited,setLimited]=useState(false),[heuristic,setHeuristic]=useState(''),[sort,setSort]=useState<Sort>('impressions'),[ascending,setAscending]=useState(false);
  const [loadedFilters,setLoadedFilters]=useState<{from:string;to:string;property:string|null}|null>(null);
  const valid=from<=to&&Date.parse(to)-Date.parse(from)<=31*86400000;
  const load=useCallback(async(signal?:AbortSignal)=>{
    if(!valid)return;
    setLoading(true);setError('');setRows([]);setLoadedFilters(null);
    try{
      const q=new URLSearchParams({from,to,limit:'100'});if(property.trim())q.set('property',property.trim());
      const response=await fetch('/api/seo/gsc-opportunities?'+q,{credentials:'same-origin',cache:'no-store',signal});
      const payload:Payload&{error?:string}=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(payload.error||'Unable to load saved Search Console observations.');
      if(payload.provenance?.sample!==false||payload.provenance?.sourceType!=='saved_google_search_console')throw Error('The endpoint did not confirm saved Google Search Console provenance.');
      const items=payload.rows||[];
      if(!Array.isArray(items))throw Error('Unexpected opportunity response.');
      setRows(items.filter(r=>r&&typeof r.query==='string'&&[r.clicks,r.impressions].every(v=>typeof v==='number'&&Number.isFinite(v))));
      setLoadedFilters(payload.filters??null);
      setSource('Saved Google Search Console observations'+(payload.provenance.coverage?' · '+payload.provenance.coverage:''));
      setHeuristic(payload.heuristic?.description||'High-impression queries with low click-through rate are flagged for human review.');
      setLimited(Boolean(payload.page?.hasMore));
    }catch(e){if(signal?.aborted)return;setError(e instanceof Error?e.message:'Unable to load opportunities.')}
    finally{if(!signal?.aborted)setLoading(false)}
  },[from,to,property,valid]);
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort()},[load]);
  const displayed=useMemo(()=>[...rows].sort((a,b)=>ascending?(a[sort]??-1)-(b[sort]??-1):(b[sort]??-1)-(a[sort]??-1)),[rows,sort,ascending]);
  function changeSort(next:Sort){if(sort===next)setAscending(v=>!v);else{setSort(next);setAscending(false)}}
  function exportCsv(){
    if(loading||error||!displayed.length||!loadedFilters)return;
    const headings=['Query','Clicks','Impressions','CTR (fraction)','Average position (GSC)','Last saved observation','Heuristic','Source','From','To','Property'];
    const records=displayed.map(r=>[r.query,r.clicks,r.impressions,r.ctr,r.averagePosition,r.latestDate,r.opportunity.label,'saved_google_search_console',loadedFilters.from,loadedFilters.to,loadedFilters.property||'(all properties)']);
    const content='\uFEFF'+[headings,...records].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
    const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
    try{
      const link=document.createElement('a');link.href=url;link.download='searchpilot-gsc-opportunities-'+loadedFilters.from+'-'+loadedFilters.to+'.csv';
      document.body.appendChild(link);link.click();link.remove();
    }finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }
  return <main className="min-h-screen bg-[#F8F6F1] p-4 text-[#1B332D] md:p-10"><div className="mx-auto max-w-6xl space-y-6">
    <nav aria-label="Breadcrumb" className="text-xs text-[#52645C]"><Link href="/" className="underline">SearchPilot</Link> / Search opportunities</nav>
    <header className="rounded-2xl bg-gradient-to-r from-[#172F2B] to-[#24543D] p-7 text-white"><h1 className="text-3xl font-bold">Search opportunities</h1><p className="mt-3 max-w-3xl text-sm text-[#D6E7DD]">Explore observed Search Console queries. Suggestions are simple heuristics based on saved impressions, clicks and average position; they are not independently verified rankings or guaranteed traffic gains.</p></header>
    <form onSubmit={e=>{e.preventDefault();void load()}} className="flex flex-wrap items-end gap-4 rounded-xl border border-[#D4DED3] bg-white p-5">
      <label className="flex flex-col gap-1 text-sm font-semibold">From<input type="date" className="rounded-lg border border-[#678376] p-2" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label className="flex flex-col gap-1 text-sm font-semibold">To<input type="date" className="rounded-lg border border-[#678376] p-2" value={to} onChange={e=>setTo(e.target.value)}/></label>
      <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm font-semibold">Property (optional)<input className="rounded-lg border border-[#678376] p-2" placeholder="Selected Search Console property" value={property} onChange={e=>setProperty(e.target.value)} /></label>
      <button type="submit" disabled={!valid||loading} className="inline-flex items-center gap-2 rounded-lg bg-[#13664E] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><RefreshCw size={15}/>{loading?'Loading…':'Refresh'}</button>
      {!valid&&<p role="alert" className="w-full text-sm text-[#A02D3D]">Choose a valid range of at most 31 days.</p>}
    </form>
    {error&&<div role="alert" className="rounded-xl border border-[#A02D3D] bg-[#FCEAEC] p-5 text-sm text-[#A02D3D]">{error} <button onClick={()=>void load()} className="ml-2 underline">Try again</button></div>}
    {!error&&<section aria-live="polite" className="rounded-xl border border-[#D4DED3] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D4DED3] p-5"><div><h2 className="font-bold">Observed search queries</h2><p className="mt-1 text-xs text-[#52645C]">{loading?'Loading saved data…':rows.length+' records'} · {source||'First-party data'} · Suggestions are heuristic{limited?' · More results may be available':''}</p><p className="mt-1 text-xs text-[#52645C]">{heuristic}</p></div><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={exportCsv} disabled={loading||!rows.length||!loadedFilters} className="inline-flex items-center gap-2 rounded-lg border border-[#13664E] px-3 py-2 text-xs font-bold text-[#0F5943] disabled:opacity-50"><Download size={14}/> Export displayed CSV</button><span className="rounded-full bg-[#E1F2E8] px-3 py-1 text-xs font-bold text-[#0F5943]">No synthetic SEO measurements</span></div></div>
      {!loading&&rows.length===0?<div className="p-8 text-sm"><h3 className="font-bold">No saved query observations found</h3><p className="mt-2 text-[#52645C]">Connect and import a Search Console property first. Empty results are shown as empty, without generated rankings.</p><Link href="/search-console" className="mt-4 inline-block font-bold text-[#0F5943] underline">Connect Search Console</Link></div>:<div role="region" tabIndex={0} aria-label="Observed Search Console opportunities" className="overflow-x-auto"><table className="w-full min-w-[840px] text-left text-sm"><thead className="bg-[#F2EFE6]"><tr><th scope="col" className="p-4">Query</th>{([['impressions','Impressions'],['clicks','Clicks'],['ctr','CTR'],['averagePosition','Avg. position']] as [Sort,string][]).map(([key,title])=><th key={key} scope="col" className="p-4"><button aria-label={'Sort by '+title} className="inline-flex items-center gap-1 font-semibold" onClick={()=>changeSort(key)}>{title}<ArrowDownUp size={13}/></button></th>)}<th scope="col" className="p-4">Heuristic / source</th></tr></thead><tbody>{displayed.map((r,i)=><tr key={r.query+'-'+r.latestDate+'-'+i} className="border-t border-[#D4DED3]"><th scope="row" className="max-w-56 break-words p-4 font-semibold">{r.query}</th><td className="p-4">{r.impressions.toLocaleString()}</td><td className="p-4">{r.clicks.toLocaleString()}</td><td className="p-4">{r.ctr===null?'—':(r.ctr*100).toFixed(1)+'%'}</td><td className="p-4">{r.averagePosition===null?'—':r.averagePosition.toFixed(1)}</td><td className="max-w-56 p-4 text-xs text-[#52645C]">{r.opportunity.label}<span className="mt-1 block font-semibold">{r.opportunity.flag?'Heuristic flag · ':''}Google source · saved {r.latestDate}</span></td></tr>)}</tbody></table></div>}
    </section>}
    <div className="flex flex-wrap gap-3 text-sm"><Link className="rounded-lg border border-[#13664E] bg-white px-4 py-3 font-semibold text-[#0F5943]" href="/search-console">Manage Search Console</Link><Link className="rounded-lg bg-[#13664E] px-4 py-3 font-semibold text-white" href="/keywords">Organize keywords</Link></div>
  </div></main>;
}
