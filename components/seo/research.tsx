'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {Badge,Button,Card,EmptyState,Alert,Input} from '@/components/ui';
import {Search,Globe2,Link2,Target,RefreshCw} from 'lucide-react';
import ImportedData from './imported-data';

type Project={id:string;name:string;domain:string};
type Keyword={id:string;projectId:string;keyword:string;position:number|null;volume:number|null;difficulty:number|null};
type Rank={id:string;keyword:string;position:number;observedAt:string;source:string;note:string|null};
type ResearchMode='keyword-research'|'organic-research'|'backlink-research'|'rank-history';
const info:Record<ResearchMode,{title:string;intro:string;source:string}>={
 'keyword-research':{title:'Keyword research',intro:'Explore your own tracked keywords and verified source coverage.',source:'user-entered'},
 'organic-research':{title:'Organic research',intro:'Review available search observations without invented competitor traffic.',source:'google_search_console or licensed provider'},
 'backlink-research':{title:'Backlink research',intro:'Investigate links only when an authorized backlink dataset is available.',source:'licensed or independently collected'},
 'rank-history':{title:'Manual rank history',intro:'Record and review individual rank observations, explicitly marked unverified.',source:'manual'}
};
function message(error:unknown){return error instanceof Error?error.message:'Request failed.'}
async function loadJSON<T>(url:string,options?:RequestInit):Promise<T>{
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(typeof payload.error==='string'?payload.error:`Request failed (HTTP ${response.status}).`);
 return payload as T;
}
export default function Research({mode}:{mode:ResearchMode}){
 const [projects,setProjects]=useState<Project[]>([]),[projectId,setProjectId]=useState(''),[keywords,setKeywords]=useState<Keyword[]>([]),[ranks,setRanks]=useState<Rank[]>([]);
 const [query,setQuery]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(false),[position,setPosition]=useState(''),[keywordId,setKeywordId]=useState(''),[note,setNote]=useState('');
 const refresh=useCallback(async()=>{setLoading(true);setError('');try{
  const projectsData=await loadJSON<{projects:Project[],demo?:boolean}>('/api/projects');
  setProjects(projectsData.projects||[]);
  setProjectId(p=>projectsData.projects?.some(item=>item.id===p)?p:(projectsData.projects?.[0]?.id||''));
 }catch(e){setError(message(e));}finally{setLoading(false)}},[]);
 useEffect(()=>{void refresh()},[refresh]);
 useEffect(()=>{if(!projectId){setKeywords([]);setRanks([]);return;}let cancelled=false;setLoading(true);setError('');
  Promise.all([loadJSON<{keywords:Keyword[]}>(`/api/keywords?projectId=${encodeURIComponent(projectId)}`),loadJSON<{rankings:Rank[]}>(`/api/rankings?projectId=${encodeURIComponent(projectId)}&limit=100`).catch(()=>({rankings:[] as Rank[]}))])
   .then(([k,r])=>{if(!cancelled){setKeywords(k.keywords||[]);setRanks(r.rankings||[]);}})
   .catch(e=>{if(!cancelled)setError(message(e))}).finally(()=>{if(!cancelled)setLoading(false)});
  return()=>{cancelled=true};
 },[projectId]);
 async function addRank(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!projectId||!keywordId)return;
  const value=Number(position);if(!Number.isInteger(value)||value<1||value>1000){setError('Position must be a whole number between 1 and 1000.');return;}
  setSaving(true);setError('');try{await loadJSON('/api/rankings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId,keywordId,position:value,note:note.trim()||undefined})});
   const response=await loadJSON<{rankings:Rank[]}>(`/api/rankings?projectId=${encodeURIComponent(projectId)}&limit=100`);setRanks(response.rankings);setPosition('');setNote('');
  }catch(e){setError(message(e))}finally{setSaving(false)}}
 const filtered=keywords.filter(k=>k.keyword.toLowerCase().includes(query.toLowerCase()));
 const selected=projects.find(p=>p.id===projectId);
 return <main className="min-h-screen bg-[#f7f8fc] px-4 py-8 text-slate-800 md:px-10">
  <div className="mx-auto max-w-6xl space-y-6">
   <nav aria-label="Breadcrumb" className="text-xs text-slate-600"><Link href="/" className="underline">SearchPilot</Link> / {info[mode].title}</nav>
   <header className="rounded-2xl bg-gradient-to-r from-[#24204b] to-[#6347b3] px-6 py-9 text-white md:px-9">
    <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{info[mode].title}</h1><Badge tone="purple">Source: {info[mode].source}</Badge></div>
    <p className="mt-3 max-w-2xl text-sm text-violet-100">{info[mode].intro}</p>
    <div className="mt-4 flex flex-wrap gap-3"><Link href="/search-console" className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-violet-800">Connect real search data</Link><Link href="/projects" className="rounded-lg border border-white/40 px-4 py-2 text-xs font-semibold text-white">Manage projects</Link></div>
   </header>
   <Card title="Research workspace" description="Project data is scoped to the signed-in workspace.">
    <div className="flex flex-wrap items-end gap-4 p-5">
     <label className="flex min-w-56 flex-1 flex-col gap-2 text-xs font-semibold">Project
      <select className="w-full rounded-lg border border-slate-300 bg-white p-3" value={projectId} onChange={e=>setProjectId(e.target.value)}>{projects.length===0?<option value="">No projects available</option>:projects.map(p=><option value={p.id} key={p.id}>{p.name} — {p.domain}</option>)}</select></label>
     <Button onClick={()=>void refresh()} loading={loading} leadingIcon={<RefreshCw size={15}/>}>Refresh projects</Button>
    </div>
   </Card>
   {error&&<Alert tone="error" title="Request unsuccessful" onDismiss={()=>setError('')}>{error}</Alert>}
   {loading&&<p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-600">Loading authorized workspace data…</p>}
   {!loading&&!projectId&&<EmptyState title="No project available" description="Create a workspace project to store your own keywords and observations." action={<Link href="/projects" className="underline">Open projects</Link>}/>}
   {!loading&&projectId&&<div className="space-y-5">
    {mode!=='rank-history'&&<ImportedData key={projectId+mode} projectId={projectId} kind={mode==='keyword-research'?'keywords':mode==='organic-research'?'organic':'backlinks'}/>}
    {mode==='backlink-research'?<Card title="Backlink provider unavailable" description={selected?.domain}><div className="p-6"><EmptyState icon={Link2} title="No verified backlink index connected" description="SearchPilot cannot calculate backlink totals, anchor distributions, referring domain counts or link opportunities without an authorized provider. Synthetic values are excluded from this view." /></div></Card>
    :mode==='organic-research'?<Card title="Organic discovery" description={selected?.domain}><div className="grid gap-4 p-6 md:grid-cols-2">
      <EmptyState icon={Globe2} title="Organic rankings provider unavailable" description="Estimated traffic, keyword market share, live SERP positions and competitors require a licensed or independently collected dataset."/>
      <EmptyState icon={Search} title="First-party search performance" description="Connect and import an authorized Google Search Console property to view actual clicks, impressions, CTR and average positions." action={<Link href="/search-console" className="font-semibold text-violet-700 underline">Open Search Console connection</Link>}/>
     </div></Card>
    :<Card title={mode==='rank-history'?'Manual observations':'Your tracked keywords'} description={mode==='rank-history'?'Each entry records its own timestamp and manual provenance.':'This is your own keyword list, not a generated live SERP index.'}>
      {mode==='keyword-research'&&<div className="p-5"><Input label="Search stored keywords" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter keyword phrases"/></div>}
      {mode==='rank-history'&&<form onSubmit={addRank} className="grid gap-3 border-b border-slate-200 p-5 md:grid-cols-4">
       <label className="flex flex-col gap-1 text-xs font-semibold">Tracked keyword<select required value={keywordId} onChange={e=>setKeywordId(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-3"><option value="">Select keyword</option>{keywords.map(k=><option key={k.id} value={k.id}>{k.keyword}</option>)}</select></label>
       <Input label="Manually observed position" type="number" required min={1} max={1000} value={position} onChange={e=>setPosition(e.target.value)} />
       <Input label="Observation note (optional)" maxLength={500} value={note} onChange={e=>setNote(e.target.value)} />
       <div className="flex items-end"><Button variant="primary" type="submit" loading={saving} disabled={!keywords.length}>Record manual rank</Button></div>
      </form>}
      <div className="overflow-x-auto" role="region" aria-label="SEO data table" tabIndex={0}>
       <table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-100 text-xs text-slate-700"><tr>{(mode==='rank-history'?['Keyword','Position','Observed at','Source','Note']:['Keyword','Entered position','Entered volume','Entered difficulty','Source']).map(label=><th className="p-4" scope="col" key={label}>{label}</th>)}</tr></thead>
       <tbody>{mode==='rank-history'?ranks.map(row=><tr key={row.id} className="border-t"><th scope="row" className="p-4 font-medium">{row.keyword}</th><td className="p-4">{row.position}</td><td className="p-4">{new Date(row.observedAt).toLocaleString()}</td><td className="p-4"><Badge tone="info">Manual · unverified</Badge></td><td className="p-4">{row.note||'—'}</td></tr>):filtered.map(row=><tr key={row.id} className="border-t"><th scope="row" className="p-4 font-medium">{row.keyword}</th><td className="p-4">{row.position??'—'}</td><td className="p-4">{row.volume??'—'}</td><td className="p-4">{row.difficulty??'—'}</td><td className="p-4"><Badge>Manually entered</Badge></td></tr>)}</tbody>
       </table>
      </div>
      {(mode==='rank-history'?ranks:filtered).length===0&&<EmptyState icon={Target} compact title="Nothing to display yet" description={mode==='rank-history'?'Add a tracked keyword and record an observation to begin your history.':'Add keywords to your selected project, or clear the search filter.'} action={<Link className="font-semibold text-violet-700 underline" href="/keywords">Manage tracked keywords</Link>}/>}
     </Card>}
    </div>}
  </div></main>;
}
