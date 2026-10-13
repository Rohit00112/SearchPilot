'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {FileText,ArrowUp,ArrowDown,Download,Plus,Trash2,Save} from 'lucide-react';
import {reportPresets,reportSections,reportSectionLabels,type ReportSection} from './report-templates';

type Project={id:string;name:string;domain:string};
type Keyword={keyword:string;position:number|null;volume:number|null;difficulty:number|null};
type Audit={id:string;score:number;domain:string;checkedAt:string;checks:{name:string;status:string;recommendation:string}[]};
type Report={id:string;projectId:string;title:string;blocks:ReportSection[];updatedAt:string};
type Share={id:string;reportId:string;createdAt:string;expiresAt:string;revokedAt:string|null};
type Source='reports'|'keywords'|'audits'|'rankings';
type ProjectData={
  projectId:string;
  loading:boolean;
  reports:Report[];
  keywords:Keyword[];
  audits:Audit[];
  rankCount:number|null;
  errors:Partial<Record<Source,string>>;
};
const emptyData=(projectId:string):ProjectData=>({
  projectId,loading:true,reports:[],keywords:[],audits:[],rankCount:null,errors:{},
});
const getError=(reason:unknown)=>reason instanceof Error?reason.message:'The request failed.';
async function api<T>(path:string,options?:RequestInit):Promise<T>{
  const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(typeof body.error==='string'?body.error:'Unable to complete request.');
  return body as T;
}
const config=(method:string,payload:unknown):RequestInit=>({method,headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
export default function ReportBuilder(){
  const [projects,setProjects]=useState<Project[]>([]),[projectId,setProjectId]=useState('');
  const [projectData,setProjectData]=useState<ProjectData|null>(null);
  const [title,setTitle]=useState(reportPresets[0].title),[blocks,setBlocks]=useState<ReportSection[]>([...reportPresets[0].blocks]),[selected,setSelected]=useState('');
  const [notes,setNotes]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  const [shares,setShares]=useState<Share[]>([]),[shareTtl,setShareTtl]=useState(7),[shareConsent,setShareConsent]=useState(false),[shareUrl,setShareUrl]=useState('');
  const [initialized,setInitialized]=useState(false);
  const project=projects.find(p=>p.id===projectId);
  // Render only data that matches the selected project, including before the next effect runs.
  const data=projectData?.projectId===projectId?projectData:null;
  const loading=Boolean(projectId)&&(!data||data.loading);
  const reports=data?.reports??[],keywords=data?.keywords??[],audits=data?.audits??[];
  const rankCount=data?.rankCount??null;
  const errors=data?.errors??{};
  const refreshReports=useCallback(async(id:string)=>{
    const result=await api<{reports:Report[]}>(`/api/report-definitions?projectId=${encodeURIComponent(id)}`);
    setProjectData(current=>current?.projectId===id
      ?{...current,reports:result.reports??[],errors:{...current.errors,reports:undefined}}:current);
  },[]);
  useEffect(()=>{let active=true;(async()=>{try{
    const data=await api<{projects:Project[]}>('/api/projects');
    if(!active)return;
    setProjects(data.projects||[]);setProjectId(data.projects?.[0]?.id||'');
  }catch(e){if(active)setError(e instanceof Error?e.message:'Failed to load projects.')}finally{if(active)setInitialized(true)}})();return()=>{active=false};},[]);
  useEffect(()=>{
    if(!projectId){setProjectData(null);return;}
    let active=true;
    setProjectData(emptyData(projectId));
    void (async()=>{
      const id=encodeURIComponent(projectId);
      const [reportsResult,keywordsResult,auditsResult,rankingsResult]=await Promise.allSettled([
        api<{reports:Report[]}>(`/api/report-definitions?projectId=${id}`),
        api<{keywords:Keyword[]}>(`/api/keywords?projectId=${id}`),
        api<{audits:Audit[]}>(`/api/audit?projectId=${id}`),
        api<{rankings:unknown[]}>(`/api/rankings?projectId=${id}&limit=100`),
      ]);
      if(!active)return;
      const sourceErrors:ProjectData['errors']={};
      if(reportsResult.status==='rejected')sourceErrors.reports=getError(reportsResult.reason);
      if(keywordsResult.status==='rejected')sourceErrors.keywords=getError(keywordsResult.reason);
      if(auditsResult.status==='rejected')sourceErrors.audits=getError(auditsResult.reason);
      if(rankingsResult.status==='rejected')sourceErrors.rankings=getError(rankingsResult.reason);
      setProjectData({
        projectId,loading:false,
        reports:reportsResult.status==='fulfilled'?reportsResult.value.reports??[]:[],
        keywords:keywordsResult.status==='fulfilled'?keywordsResult.value.keywords??[]:[],
        audits:auditsResult.status==='fulfilled'?auditsResult.value.audits??[]:[],
        rankCount:rankingsResult.status==='fulfilled'?rankingsResult.value.rankings?.length??0:null,
        errors:sourceErrors,
      });
    })();
    return()=>{active=false;};
  },[projectId]);
  function applyPreset(preset:typeof reportPresets[number]){
    setSelected('');
    setShares([]);setShareUrl('');setShareConsent(false);
    setTitle(preset.title);
    setBlocks([...preset.blocks]);
    setSuccess(`${preset.name} preset applied. Edit the layout before saving or printing.`);
    setError('');
  }
  function chooseProject(nextId:string){
    setProjectId(nextId);
    setSelected('');
    setShares([]);setShareUrl('');setShareConsent(false);
    setNotes('');
    setTitle(reportPresets[0].title);
    setBlocks([...reportPresets[0].blocks]);
    setError('');
    setSuccess('');
  }
  function loadReport(report:Report){setSelected(report.id);setTitle(report.title);setBlocks(report.blocks);setShares([]);setShareUrl('');setShareConsent(false);setSuccess('Loaded saved report layout.');}
  const listShares=useCallback(async(reportId:string)=>{
    const result=await api<{shares:Share[]}>(`/api/report-shares?reportId=${encodeURIComponent(reportId)}`);
    setShares(result.shares);
  },[]);
  useEffect(()=>{
    if(!selected){setShares([]);return;}
    let active=true;
    void api<{shares:Share[]}>(`/api/report-shares?reportId=${encodeURIComponent(selected)}`)
      .then(result=>{if(active)setShares(result.shares);})
      .catch(e=>{if(active)setError(getError(e));});
    return()=>{active=false;};
  },[selected]);
  async function createShare(){
    if(!selected||!shareConsent)return;
    setBusy(true);setError('');setSuccess('');setShareUrl('');
    try{
      const result=await api<{token:string}>('/api/report-shares',config('POST',{reportId:selected,ttlDays:shareTtl,acknowledgeLimitedShare:true}));
      setShareUrl(`${window.location.origin}/shared-report/${result.token}`);
      await listShares(selected);
      setShareConsent(false);
      setSuccess('Limited read-only link created. Copy it now; the token cannot be retrieved later.');
    }catch(e){setError(getError(e));}finally{setBusy(false);}
  }
  async function revokeShare(id:string){
    if(!selected)return;
    setBusy(true);setError('');setSuccess('');
    try{
      await api(`/api/report-shares?id=${encodeURIComponent(id)}`,{method:'DELETE'});
      setShareUrl('');await listShares(selected);setSuccess('Share link revoked.');
    }catch(e){setError(getError(e));}finally{setBusy(false);}
  }
  function move(index:number,delta:number){setBlocks(current=>{const next=[...current],target=index+delta;if(target<0||target>=next.length)return current;[next[index],next[target]]=[next[target],next[index]];return next;});}
  async function save(){
    if(!projectId||!title.trim()||!blocks.length)return;
    setBusy(true);setError('');setSuccess('');
    try{
      const response=selected?
        await api<{report:Report}>(`/api/report-definitions?id=${encodeURIComponent(selected)}`,config('PATCH',{title,blocks})):
        await api<{report:Report}>('/api/report-definitions',config('POST',{projectId,title,blocks}));
      setSelected(response.report.id);await refreshReports(projectId);setSuccess('Report layout saved to your workspace.');
    }catch(e){setError(getError(e))}finally{setBusy(false)}
  }
  async function remove(){
    if(!selected||!window.confirm('Delete this saved report layout?'))return;
    setBusy(true);try{
      await api(`/api/report-definitions?id=${encodeURIComponent(selected)}`,{method:'DELETE'});
      setSelected('');setTitle(reportPresets[0].title);setBlocks([...reportPresets[0].blocks]);await refreshReports(projectId);setSuccess('Report layout deleted.');
    }catch(e){setError(getError(e))}finally{setBusy(false)}
  }
  function print(){window.print();}
  const latestAudit=audits[0];
  const sourceMessage=(source:Source)=>{
    if(!projectId)return 'Choose a project to view recorded data.';
    if(loading)return 'Loading records for the selected project…';
    return errors[source]?`Unable to load ${source} for this project: ${errors[source]}`:'';
  };
  return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8">
    <style>{`@media print{.report-controls{display:none!important}body{background:white!important}.report-paper{border:0!important;box-shadow:none!important;margin:0!important;max-width:none!important}.print-section{break-inside:avoid}}`}</style>
    <div className="report-controls mx-auto mb-6 max-w-6xl">
      <nav className="mb-4 text-sm"><Link href="/reports" className="text-indigo-700 underline">Reports</Link> / Report builder</nav>
      <h1 className="mb-2 text-3xl font-bold">SearchPilot report builder</h1>
      <p className="mb-5 text-sm text-slate-600">Start from an editable template or build your own report from saved project records. Print or save a PDF from your browser. No estimated traffic, invented search positions, or emailed delivery is included.</p>
      {error&&<p role="alert" className="mb-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm">{error}</p>}
      {success&&<p role="status" className="mb-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm">{success}</p>}
      {Object.entries(errors).filter(([,message])=>Boolean(message)).map(([source,message])=><p key={source} role="alert" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">{source} data could not load for {project?.name||'this project'}: {message}. Other available project records remain visible.</p>)}
      <div className="mb-5 rounded-xl border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Start with a report template</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {reportPresets.map(preset=><button key={preset.id} type="button" disabled={busy} onClick={()=>applyPreset(preset)} className="rounded-lg border border-slate-300 p-4 text-left transition hover:border-indigo-500 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50">
            <span className="block text-sm font-semibold">{preset.name}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">{preset.description}</span>
            <span className="mt-2 block text-xs font-semibold text-indigo-700">Use template</span>
          </button>)}
        </div>
        <p className="mt-3 text-xs text-slate-500">Templates only set the report title and section order. You can edit the draft, then save a layout for the selected project.</p>
      </div>
      <div className="grid gap-5 rounded-xl border bg-white p-5 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm font-semibold">Project<select className="mt-2 block w-full rounded-md border border-slate-300 p-2" value={projectId} disabled={busy} onChange={e=>chooseProject(e.target.value)}><option value="">Choose a project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} — {p.domain}</option>)}</select></label>
          <label className="block text-sm font-semibold">Report title<input maxLength={160} className="mt-2 block w-full rounded-md border border-slate-300 p-2" value={title} onChange={e=>setTitle(e.target.value)}/></label>
          <label className="block text-sm font-semibold">Saved layouts for this project<select className="mt-2 block w-full rounded-md border border-slate-300 p-2" value={selected} disabled={busy||loading||Boolean(errors.reports)} onChange={e=>{const next=reports.find(r=>r.id===e.target.value);if(next)loadReport(next);else setSelected('')}}><option value="">New report</option>{reports.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
          <label className="block text-sm font-semibold">Report author notes (local preview only)<textarea className="mt-2 min-h-20 w-full rounded-md border border-slate-300 p-2" maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Context and next steps to discuss with your client"/></label>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold">Report sections and reading order</h2>
          <div className="space-y-2">{reportSections.map(block=><div key={block} className="flex items-center gap-3 rounded-lg border p-2 text-sm"><label className="flex min-w-0 flex-1 items-center gap-3"><input type="checkbox" checked={blocks.includes(block)} onChange={e=>setBlocks(current=>e.target.checked?[...current,block]:current.filter(x=>x!==block))}/><span>{reportSectionLabels[block]}</span></label>{blocks.includes(block)&&<><button aria-label={`Move ${reportSectionLabels[block]} up`} type="button" disabled={blocks.indexOf(block)===0} onClick={()=>move(blocks.indexOf(block),-1)} className="rounded border p-1 disabled:opacity-30"><ArrowUp size={14}/></button><button aria-label={`Move ${reportSectionLabels[block]} down`} type="button" disabled={blocks.indexOf(block)===blocks.length-1} onClick={()=>move(blocks.indexOf(block),1)} className="rounded border p-1 disabled:opacity-30"><ArrowDown size={14}/></button></>}</div>)}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="flex items-center gap-2 rounded bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy||!projectId||!blocks.length||!title.trim()} onClick={()=>void save()}><Save size={15}/> {selected?'Update layout':'Save layout'}</button>
            <button className="flex items-center gap-2 rounded border px-4 py-2 text-sm disabled:opacity-50" disabled={!projectId||loading||!blocks.length} onClick={print}><Download size={15}/> Print / Save PDF</button>
            <button className="flex items-center gap-2 rounded border px-4 py-2 text-sm" disabled={busy} onClick={()=>{setSelected('');setTitle(reportPresets[0].title);setBlocks([...reportPresets[0].blocks]);setSuccess('New editable report layout started.')}}><Plus size={15}/> New</button>
            {selected&&<button className="flex items-center gap-2 rounded border border-red-400 px-4 py-2 text-sm text-red-700" disabled={busy} onClick={()=>void remove()}><Trash2 size={15}/> Delete</button>}
          </div>
        </div>
      </div>
      <section className="mt-5 space-y-3 rounded-xl border bg-white p-5">
        <h2 className="text-base font-semibold">Optional read-only share link</h2>
        <p className="text-sm text-slate-600">Reports are private by default. Create a link only when you want anyone holding it to see the saved report title, project domain, and section headings. Keywords, audits, rankings, author notes, Search Console data, and workspace records stay private. No email is sent.</p>
        {!selected?<p className="text-sm text-slate-600">Save a report layout first to enable sharing.</p>:<>
          <label className="block text-sm">Expiry
            <select className="ml-3 rounded border p-2" value={shareTtl} disabled={busy} onChange={e=>setShareTtl(Number(e.target.value))}>
              {[1,3,7,14,30].map(days=><option key={days} value={days}>{days} day{days===1?'':'s'}</option>)}
            </select>
          </label>
          <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={shareConsent} disabled={busy} onChange={e=>setShareConsent(e.target.checked)}/><span>I explicitly approve sharing this title, project domain and section headings with anyone who has the link.</span></label>
          <button type="button" className="rounded bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy||!shareConsent} onClick={()=>void createShare()}>Create expiring share link</button>
          {shareUrl&&<div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"><p className="mb-2 font-semibold">Copy this link now. It will not be shown again.</p><input aria-label="New share URL" readOnly className="w-full rounded border p-2" value={shareUrl} onFocus={e=>e.target.select()}/><button type="button" className="mt-2 rounded border bg-white px-3 py-1.5" onClick={()=>void navigator.clipboard.writeText(shareUrl)}>Copy link</button></div>}
          <h3 className="text-sm font-semibold">Previous links</h3>
          {shares.length===0?<p className="text-sm text-slate-500">No share links for this saved layout.</p>:<ul className="space-y-2">{shares.map(share=><li key={share.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm"><span>Expires {new Date(share.expiresAt).toLocaleString()} · {share.revokedAt?'Revoked':new Date(share.expiresAt).getTime()<=Date.now()?'Expired':'Active'}</span>{!share.revokedAt&&new Date(share.expiresAt).getTime()>Date.now()&&<button type="button" disabled={busy} className="rounded border border-red-300 px-3 py-1 text-red-700 disabled:opacity-50" onClick={()=>void revokeShare(share.id)}>Revoke</button>}</li>)}</ul>}
        </>}
      </section>
    </div>
    <article className="report-paper mx-auto max-w-4xl space-y-6 rounded-xl border bg-white p-6 shadow-md md:p-12">
      <header className="border-b pb-5"><p className="text-xs font-bold uppercase tracking-widest text-indigo-700">SearchPilot / Project report</p><h2 className="my-3 text-3xl font-bold">{title||'Untitled report'}</h2><p className="text-sm text-slate-600">{project?project.domain:'Select a workspace project'} · Prepared {new Date().toLocaleDateString()}</p><p className="mt-2 text-xs text-slate-500">Sources: project records, manually entered keyword fields and ranking observations, saved automated homepage checks, and local author notes. No verified SERP, traffic, or backlink metrics.</p></header>
      {!initialized&&<p>Loading your workspace…</p>}
      {loading&&<p role="status" className="text-sm text-slate-600">Loading data for {project?.name||'the selected project'}…</p>}
      {blocks.map(block=><section key={block} className="print-section space-y-3">
        <h3 className="border-b pb-2 text-lg font-bold">{reportSectionLabels[block]}</h3>
        {block==='overview'&&<><p className="text-xs text-slate-500">Source: saved project and workspace keyword/audit records.</p><div className="grid gap-3 sm:grid-cols-3">{[['Project',project?.name||'—'],['Recorded keywords',!loading&&!errors.keywords?String(keywords.length):'—'],['Recorded homepage audits',!loading&&!errors.audits?String(audits.length):'—']].map(([label,value])=><div key={label} className="rounded-lg border p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div>{(sourceMessage('keywords')||sourceMessage('audits'))&&<p className="text-sm text-slate-500">{sourceMessage('keywords')||sourceMessage('audits')}</p>}</>}
        {block==='keywords'&&<><p className="text-xs text-slate-500">Source: project keyword entries. Position, volume, and difficulty fields are manually supplied and are not independently verified.</p>{sourceMessage('keywords')?<p className="text-sm text-slate-500">{sourceMessage('keywords')}</p>:<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-100"><tr><th className="p-2">Keyword</th><th className="p-2">Entered position</th><th className="p-2">Entered volume</th><th className="p-2">Entered difficulty</th></tr></thead><tbody>{keywords.slice(0,30).map((k,index)=><tr className="border-b" key={index}><td className="p-2">{k.keyword}</td><td className="p-2">{k.position??'—'}</td><td className="p-2">{k.volume??'—'}</td><td className="p-2">{k.difficulty??'—'}</td></tr>)}</tbody></table>{!keywords.length&&<p className="p-3 text-sm text-slate-500">No keywords recorded.</p>}{keywords.length>30&&<p className="text-xs text-slate-500">Showing the first 30 of {keywords.length} keywords.</p>}</div>}</>}
        {block==='audit'&&<><p className="text-xs text-slate-500">Source: latest saved automated homepage HTML check for this project. The score reflects the limited checks listed below.</p>{sourceMessage('audits')?<p className="text-sm text-slate-500">{sourceMessage('audits')}</p>:latestAudit?<div><p className="text-sm">Homepage check score: <strong>{latestAudit.score}/100</strong> — {new Date(latestAudit.checkedAt).toLocaleString()}</p><ul className="mt-3 space-y-2">{latestAudit.checks.map(c=><li key={c.name} className="rounded-lg border p-3 text-sm"><strong>{c.name}</strong> · {c.status}<p className="text-xs text-slate-600">{c.recommendation}</p></li>)}</ul></div>:<p className="text-sm text-slate-500">No homepage audits recorded. This report does not imply a full-site crawl.</p>}</>}
        {block==='manual_rankings'&&<><p className="text-xs text-slate-500">Source: manually recorded rank observations, first API page (up to 100). These are not search-engine-verified SERP positions.</p>{sourceMessage('rankings')?<p className="text-sm text-slate-500">{sourceMessage('rankings')}</p>:<p className="text-sm">Manual rank observations on the first page: {rankCount}. Review timestamped records in <Link className="text-indigo-700 underline" href="/rank-history">Rank history</Link>. This is not a total count when more pages exist.</p>}</>}
        {block==='notes'&&<><p className="text-xs text-slate-500">Source: author-entered notes for this local preview; these notes are not stored in the saved layout.</p><p className="whitespace-pre-wrap text-sm">{notes||'No editorial notes entered.'}</p></>}
      </section>)}
      <footer className="border-t pt-4 text-xs text-slate-500"><FileText size={15} className="inline"/> SearchPilot report from selected project records and author notes; source and coverage limitations are shown in each section.</footer>
    </article>
  </main>;
}
