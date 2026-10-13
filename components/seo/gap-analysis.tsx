'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Project={id:string;name:string;domain:string};
type Result={kind:'keywords'|'backlinks';projectDomain:string;competitorDomain:string;shared:string[];missing:string[];unique:string[];truncated:boolean;counts:{project:number;competitor:number;shared:number;missing:number;unique:number}};
export default function GapAnalysis(){
 const [projects,setProjects]=useState<Project[]>([]),[project,setProject]=useState(''),[competitor,setCompetitor]=useState(''),[kind,setKind]=useState<'keywords'|'backlinks'>('keywords'),[result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;fetch('/api/projects',{cache:'no-store'}).then(async response=>{
   const body=await response.json();if(!response.ok)throw Error(body.error||'Unable to load projects.');
   if(active){setProjects(body.projects);setProject(body.projects?.[0]?.id||'');setCompetitor(body.projects?.[1]?.id||'');}
 }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Project list unavailable.')});return()=>{active=false};},[]);
 async function compare(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setResult(null);
   try{
     const response=await fetch(`/api/seo/gap?projectId=${encodeURIComponent(project)}&competitorId=${encodeURIComponent(competitor)}&kind=${kind}`,{cache:'no-store'});
     const data=await response.json();if(!response.ok)throw Error(data.error||'Comparison unavailable.');
     setResult(data);
   }catch(e){setError(e instanceof Error?e.message:'Comparison unavailable.')}finally{setBusy(false)}
 }
 return <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-10"><div className="mx-auto max-w-6xl space-y-6">
   <nav className="text-sm"><Link className="text-indigo-700 underline" href="/seo-tools">SEO tools</Link> / Gap analysis</nav>
   <header className="rounded-2xl bg-gradient-to-r from-[#24204b] to-[#6246af] p-8 text-white"><h1 className="text-3xl font-bold">Keyword and backlink gap analysis</h1>
     <p className="mt-3 max-w-3xl text-sm text-violet-100">Compare explicitly user-imported keyword terms or referring domains between two projects in your authorized workspace. SearchPilot does not claim comprehensive competitor coverage.</p></header>
   <form onSubmit={compare} className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-4">
     <label className="text-sm font-semibold">Your project<select required className="mt-2 block w-full rounded-lg border border-slate-300 p-3" value={project} onChange={e=>setProject(e.target.value)}><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} · {p.domain}</option>)}</select></label>
     <label className="text-sm font-semibold">Comparison project<select required className="mt-2 block w-full rounded-lg border border-slate-300 p-3" value={competitor} onChange={e=>setCompetitor(e.target.value)}><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} · {p.domain}</option>)}</select></label>
     <label className="text-sm font-semibold">Compare<select className="mt-2 block w-full rounded-lg border border-slate-300 p-3" value={kind} onChange={e=>setKind(e.target.value as 'keywords'|'backlinks')}><option value="keywords">Imported keywords</option><option value="backlinks">Imported referring domains</option></select></label>
     <button type="submit" disabled={busy||!project||!competitor||project===competitor} className="self-end rounded-lg bg-indigo-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?'Comparing…':'Compare datasets'}</button>
   </form>
   {error&&<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm">{error}</p>}
   {projects.length<2&&<div className="rounded-xl border bg-white p-6 text-sm">At least two workspace projects with independently supplied research datasets are required. <Link href="/projects" className="text-indigo-700 underline">Create another project</Link>.</div>}
   {result&&<div className="space-y-5">
     <p role="status" className="rounded-lg border border-indigo-300 bg-indigo-50 p-4 text-sm font-medium">User-imported records only · UNVERIFIED · {result.truncated?'Partial comparison: more than 1,000 distinct entries on a side':'All locally imported rows in the bounded selection'}</p>
     <div className="grid gap-4 sm:grid-cols-3">{[['Missing opportunities',result.counts.missing],['Shared',result.counts.shared],['Unique to your project',result.counts.unique]].map(([title,count])=><section className="rounded-xl border bg-white p-5" key={title}><p className="text-xs text-slate-600">{title}</p><strong className="mt-2 block text-3xl">{count}</strong></section>)}</div>
     <div className="grid gap-5 md:grid-cols-3">{[
       {title:'In comparison project, not yours',items:result.missing},
       {title:'In both imported datasets',items:result.shared},
       {title:'Only in your project',items:result.unique}
     ].map(group=><section key={group.title} className="rounded-xl border bg-white p-5"><h2 className="text-base font-bold">{group.title}</h2><p className="mt-1 text-xs text-slate-600">Source: manually supplied {kind==='keywords'?'keywords':'referring domains'}</p>
       <ul className="mt-4 max-h-96 space-y-2 overflow-auto text-sm">{group.items.map(value=><li key={value} className="break-all rounded-lg border p-2">{value}</li>)}{!group.items.length&&<li className="text-slate-600">None in available imports</li>}</ul>
     </section>)}</div>
   </div>}
 </div></main>;
}
