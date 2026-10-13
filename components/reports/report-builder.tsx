'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {FileText,ArrowUp,ArrowDown,Download,Plus,Trash2,Save} from 'lucide-react';

type Project={id:string;name:string;domain:string};
type Keyword={keyword:string;position:number|null;volume:number|null;difficulty:number|null};
type Audit={id:string;score:number;domain:string;checkedAt:string;checks:{name:string;status:string;recommendation:string}[]};
type Report={id:string;projectId:string;title:string;blocks:Block[];updatedAt:string};
const sections=['overview','keywords','audit','manual_rankings','notes'] as const;
type Block=typeof sections[number];
const display:Record<Block,string>={overview:'Workspace overview',keywords:'Tracked keywords',audit:'Technical homepage audit',manual_rankings:'Manual rank observations',notes:'Editorial notes'};
async function api<T>(path:string,options?:RequestInit):Promise<T>{
  const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(typeof body.error==='string'?body.error:'Unable to complete request.');
  return body as T;
}
const config=(method:string,payload:unknown):RequestInit=>({method,headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
export default function ReportBuilder(){
  const [projects,setProjects]=useState<Project[]>([]),[projectId,setProjectId]=useState(''),[reports,setReports]=useState<Report[]>([]);
  const [title,setTitle]=useState('SEO performance summary'),[blocks,setBlocks]=useState<Block[]>(['overview','keywords','audit']),[selected,setSelected]=useState('');
  const [keywords,setKeywords]=useState<Keyword[]>([]),[audits,setAudits]=useState<Audit[]>([]),[rankCount,setRankCount]=useState<number|null>(null);
  const [notes,setNotes]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  const [initialized,setInitialized]=useState(false);
  const project=projects.find(p=>p.id===projectId);
  const refreshReports=useCallback(async(id:string)=>{
    if(!id){setReports([]);return;}
    const result=await api<{reports:Report[]}>(`/api/report-definitions?projectId=${encodeURIComponent(id)}`);
    setReports(result.reports);
  },[]);
  useEffect(()=>{let active=true;(async()=>{try{
    const data=await api<{projects:Project[]}>('/api/projects');
    if(!active)return;
    setProjects(data.projects||[]);setProjectId(data.projects?.[0]?.id||'');
  }catch(e){if(active)setError(e instanceof Error?e.message:'Failed to load projects.')}finally{if(active)setInitialized(true)}})();return()=>{active=false};},[]);
  useEffect(()=>{if(!projectId)return;let active=true;setError('');
    Promise.all([refreshReports(projectId),api<{keywords:Keyword[]}>(`/api/keywords?projectId=${encodeURIComponent(projectId)}`),api<{audits:Audit[]}>(`/api/audit?projectId=${encodeURIComponent(projectId)}`),api<{rankings:unknown[]}>(`/api/rankings?projectId=${encodeURIComponent(projectId)}&limit=100`)])
    .then(([,k,a,r])=>{if(active){setKeywords(k.keywords);setAudits(a.audits);setRankCount(r.rankings.length)}})
    .catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load report data.')});
    return()=>{active=false};
  },[projectId,refreshReports]);
  function loadReport(report:Report){setSelected(report.id);setTitle(report.title);setBlocks(report.blocks);setSuccess('Loaded saved report layout.');}
  function move(index:number,delta:number){setBlocks(current=>{const next=[...current],target=index+delta;if(target<0||target>=next.length)return current;[next[index],next[target]]=[next[target],next[index]];return next;});}
  async function save(){
    if(!projectId||!title.trim()||!blocks.length)return;
    setBusy(true);setError('');setSuccess('');
    try{
      const response=selected?
        await api<{report:Report}>(`/api/report-definitions?id=${encodeURIComponent(selected)}`,config('PATCH',{title,blocks})):
        await api<{report:Report}>('/api/report-definitions',config('POST',{projectId,title,blocks}));
      setSelected(response.report.id);await refreshReports(projectId);setSuccess('Report layout saved to your workspace.');
    }catch(e){setError(e instanceof Error?e.message:'Unable to save report.')}finally{setBusy(false)}
  }
  async function remove(){
    if(!selected||!window.confirm('Delete this saved report layout?'))return;
    setBusy(true);try{
      await api(`/api/report-definitions?id=${encodeURIComponent(selected)}`,{method:'DELETE'});
      setSelected('');setTitle('SEO performance summary');setBlocks(['overview','keywords','audit']);await refreshReports(projectId);setSuccess('Report layout deleted.');
    }catch(e){setError(e instanceof Error?e.message:'Unable to delete report.')}finally{setBusy(false)}
  }
  function print(){window.print();}
  const latestAudit=audits[0];
  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8">
    <style>{`@media print{.report-controls{display:none!important}body{background:white!important}.report-paper{border:0!important;box-shadow:none!important;margin:0!important;max-width:none!important}.print-section{break-inside:avoid}}`}</style>
    <div className="report-controls mx-auto mb-6 max-w-6xl">
      <nav className="mb-4 text-sm"><Link href="/reports" className="text-indigo-700 underline">Reports</Link> / Report builder</nav>
      <h1 className="mb-2 text-3xl font-bold">SearchPilot report builder</h1>
      <p className="mb-5 text-sm text-slate-600">Create saved section layouts from your actual workspace records. Export as PDF using your browser’s print dialog. No sample traffic or synthetic backlink measurements are included.</p>
      {error&&<p role="alert" className="mb-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm">{error}</p>}
      {success&&<p role="status" className="mb-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm">{success}</p>}
      <div className="grid gap-5 rounded-xl border bg-white p-5 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm font-semibold">Project<select className="mt-2 block w-full rounded-md border border-slate-300 p-2" value={projectId} onChange={e=>{setProjectId(e.target.value);setSelected('')}}><option value="">Choose a project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} — {p.domain}</option>)}</select></label>
          <label className="block text-sm font-semibold">Report title<input maxLength={160} className="mt-2 block w-full rounded-md border border-slate-300 p-2" value={title} onChange={e=>setTitle(e.target.value)}/></label>
          <label className="block text-sm font-semibold">Saved layouts<select className="mt-2 block w-full rounded-md border border-slate-300 p-2" value={selected} onChange={e=>{const next=reports.find(r=>r.id===e.target.value);if(next)loadReport(next);else setSelected('')}}><option value="">New report</option>{reports.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
          <label className="block text-sm font-semibold">Report author notes (local preview only)<textarea className="mt-2 min-h-20 w-full rounded-md border border-slate-300 p-2" maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Context and next steps to discuss with your client"/></label>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold">Report sections and reading order</h2>
          <div className="space-y-2">{sections.map(block=><label key={block} className="flex items-center gap-3 rounded-lg border p-2 text-sm"><input type="checkbox" checked={blocks.includes(block)} onChange={e=>setBlocks(current=>e.target.checked?[...current,block]:current.filter(x=>x!==block))}/><span className="flex-1">{display[block]}</span>{blocks.includes(block)&&<><button aria-label={`Move ${display[block]} up`} type="button" onClick={()=>move(blocks.indexOf(block),-1)} className="rounded border p-1"><ArrowUp size={14}/></button><button aria-label={`Move ${display[block]} down`} type="button" onClick={()=>move(blocks.indexOf(block),1)} className="rounded border p-1"><ArrowDown size={14}/></button></>}</label>)}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="flex items-center gap-2 rounded bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy||!projectId||!blocks.length||!title.trim()} onClick={()=>void save()}><Save size={15}/> {selected?'Update layout':'Save layout'}</button>
            <button className="flex items-center gap-2 rounded border px-4 py-2 text-sm" disabled={!projectId} onClick={print}><Download size={15}/> Print / Save PDF</button>
            <button className="flex items-center gap-2 rounded border px-4 py-2 text-sm" onClick={()=>{setSelected('');setTitle('SEO performance summary');setBlocks(['overview','keywords','audit'])}}><Plus size={15}/> New</button>
            {selected&&<button className="flex items-center gap-2 rounded border border-red-400 px-4 py-2 text-sm text-red-700" disabled={busy} onClick={()=>void remove()}><Trash2 size={15}/> Delete</button>}
          </div>
        </div>
      </div>
    </div>
    <article className="report-paper mx-auto max-w-4xl space-y-6 rounded-xl border bg-white p-6 shadow-md md:p-12">
      <header className="border-b pb-5"><p className="text-xs font-bold uppercase tracking-widest text-indigo-700">SearchPilot / Client report</p><h2 className="my-3 text-3xl font-bold">{title||'Untitled report'}</h2><p className="text-sm text-slate-600">{project?project.domain:'Select a workspace project'} · Generated {new Date().toLocaleDateString()}</p><p className="mt-2 text-xs text-slate-500">Project records and user-entered measurements only. Manual rankings are not search-engine verified.</p></header>
      {!initialized&&<p>Loading your workspace…</p>}
      {blocks.map(block=><section key={block} className="print-section space-y-3">
        <h3 className="border-b pb-2 text-lg font-bold">{display[block]}</h3>
        {block==='overview'&&<div className="grid gap-3 sm:grid-cols-3">{[['Project',project?.name||'—'],['Tracked keywords',String(keywords.length)],['Recorded audits',String(audits.length)]].map(([label,value])=><div key={label} className="rounded-lg border p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div>}
        {block==='keywords'&&<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-100"><tr><th className="p-2">Keyword</th><th className="p-2">Manual rank</th><th className="p-2">Manual volume</th><th className="p-2">Manual difficulty</th></tr></thead><tbody>{keywords.slice(0,30).map(k=><tr className="border-b" key={k.keyword}><td className="p-2">{k.keyword}</td><td className="p-2">{k.position??'—'}</td><td className="p-2">{k.volume??'—'}</td><td className="p-2">{k.difficulty??'—'}</td></tr>)}</tbody></table>{!keywords.length&&<p className="p-3 text-sm text-slate-500">No keywords recorded.</p>}{keywords.length>30&&<p className="text-xs text-slate-500">Showing the first 30 of {keywords.length} keywords.</p>}</div>}
        {block==='audit'&&(latestAudit?<div><p className="text-sm">Homepage check score: <strong>{latestAudit.score}/100</strong> — {new Date(latestAudit.checkedAt).toLocaleString()}</p><ul className="mt-3 space-y-2">{latestAudit.checks.map(c=><li key={c.name} className="rounded-lg border p-3 text-sm"><strong>{c.name}</strong> · {c.status}<p className="text-xs text-slate-600">{c.recommendation}</p></li>)}</ul></div>:<p className="text-sm text-slate-500">No homepage audits recorded. This report does not imply a full-site crawl.</p>)}
        {block==='manual_rankings'&&<p className="text-sm">Saved manual rank observations (first page): {rankCount??'not available'}. Review the full timestamped records in <Link className="text-indigo-700 underline" href="/rank-history">Rank history</Link>; these are not verified SERP positions.</p>}
        {block==='notes'&&<p className="whitespace-pre-wrap text-sm">{notes||'No editorial notes entered.'}</p>}
      </section>)}
      <footer className="border-t pt-4 text-xs text-slate-500"><FileText size={15} className="inline"/> SearchPilot independently generated report. Data sources are indicated above.</footer>
    </article>
  </main>;
}
