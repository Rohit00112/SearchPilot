'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,BookOpen,CheckCircle2,Database,FileText,Globe2,ShieldCheck} from 'lucide-react';
type Usage={projects:number;keywords:number;audits:number;reports:number;queued_crawls:number;import_batches:number;members:number};
type Data={usage:Usage;limits:{enforcedPlanLimits:boolean;paidPlanConfigured:boolean;projectCap:number|null;keywordCap:number|null;reportCap:number|null;overageBilling:boolean};note:string;source:string};
type Connection={connected:boolean;configured:boolean;property:string|null};
export default function GettingStarted(){
 const [usage,setUsage]=useState<Data|null>(null),[gsc,setGsc]=useState<Connection|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let alive=true;(async()=>{
   const [u,g]=await Promise.allSettled([fetch('/api/usage',{cache:'no-store'}),fetch('/api/integrations/gsc',{cache:'no-store'})]);
   if(!alive)return;
   if(u.status==='fulfilled'&&u.value.ok)setUsage(await u.value.json());
   else setError('Sign in and configure your workspace to see live progress.');
   if(g.status==='fulfilled'&&g.value.ok)setGsc(await g.value.json());
   setBusy(false);
 })().catch(()=>{if(alive){setError('Some setup status is unavailable.');setBusy(false)}});return()=>{alive=false}},[]);
 const steps=[
  {title:'Add your domain and connect Search Console',detail:'First add a project, then authorize your own Google Search Console property. SearchPilot cannot access Google metrics without your permission.',done:Boolean(usage?.usage.projects&&gsc?.connected&&gsc?.property),links:[['Manage projects','/projects'],['Connect Search Console','/search-console']]},
  {title:'Run a homepage SEO check',detail:'The on-demand audit examines one HTTPS homepage. Multi-page crawl jobs currently queue without running, pending a separate network safety review.',done:Boolean(usage?.usage.audits),links:[['Open homepage audit','/site-audit'],['View queued crawls','/crawl-jobs']]},
  {title:'Build your first client report',detail:'Choose a saved project, select report sections and print or save a browser PDF. Automated email delivery is not yet available.',done:Boolean(usage?.usage.reports),links:[['Open report builder','/report-builder']]},
 ] as const;
 return <main className="min-h-screen bg-slate-100 p-5 text-slate-900 md:p-10"><div className="mx-auto max-w-5xl space-y-6">
  <nav className="text-sm"><Link href="/" className="text-indigo-700 underline">SearchPilot</Link> / Guided setup</nav>
  <header className="rounded-2xl bg-gradient-to-r from-[#25204c] to-[#6446b9] p-8 text-white"><span className="inline-flex items-center gap-2 text-sm text-violet-200"><BookOpen size={17}/> START HERE</span><h1 className="mt-3 text-3xl font-bold">From your website to a useful SEO report</h1><p className="mt-3 max-w-2xl text-sm text-violet-100">Three small steps, based on measurements you own. No invented traffic, rank, or authority estimates.</p></header>
  {busy&&<p role="status">Loading saved setup progress…</p>}{error&&<p role="alert" className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">{error}</p>}
  <div className="grid gap-5">{steps.map((step,i)=><section key={step.title} className="rounded-xl border bg-white p-6"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-100 font-bold text-violet-800">{step.done?<CheckCircle2 size={23}/>:i+1}</span><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{step.done?'Saved milestone found':'Next milestone'}</p><h2 className="mt-1 text-xl font-bold">{step.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p><div className="mt-4 flex flex-wrap gap-3">{step.links.map(([name,href])=><Link key={href} href={href} className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-3 text-xs font-bold text-white">{name}<ArrowRight size={14}/></Link>)}</div></div></div></section>)}</div>
  <section className="rounded-xl border bg-white p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><Database size={20}/> Your saved workspace usage</h2><p className="mt-2 text-sm text-slate-600">Counts read from workspace-owned PostgreSQL records. There are currently no paid plans, included usage allowances, or surprise overage charges to calculate.</p>{usage?<div className="mt-4 grid gap-3 sm:grid-cols-3">{[['Projects',usage.usage.projects],['Tracked keywords',usage.usage.keywords],['Homepage audits',usage.usage.audits],['Report layouts',usage.usage.reports],['SEO import batches',usage.usage.import_batches],['Team members',usage.usage.members]].map(([name,value])=><div key={name} className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-600">{name}</p><strong className="mt-2 block text-2xl">{value}</strong></div>)}</div>:<p className="mt-3 text-sm text-slate-600">Usage data unavailable.</p>}<p className="mt-4 text-xs text-slate-600">No billing, quotas, or background crawl execution are represented as enabled.</p></section>
  <section className="rounded-xl border bg-white p-6"><h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen size={20}/> Quick SEO glossary</h2><dl className="mt-4 grid gap-4 md:grid-cols-2">{[
   ['Impressions','How many times your property appeared in Google Search results, as reported by Search Console.'],
   ['Clicks','Visits resulting from Search result clicks according to the connected Search Console property.'],
   ['Average position','Impression-weighted Google Search Console metric; not a verified daily ranking for every user or location.'],
   ['Homepage audit score','SearchPilot checklist score for the inspected homepage; not a complete technical site-health measurement.'],
   ['Imported backlink','An observation supplied by a user or authorized export; not proof that a link remains live.'],
   ['Manual rankings','Positions supplied by a user; not observed SERP measurements until a licensed source is connected.']
  ].map(([term,definition])=><div key={term} className="rounded-lg bg-slate-50 p-4"><dt className="font-semibold">{term}</dt><dd className="mt-2 text-sm leading-6 text-slate-600">{definition}</dd></div>)}</dl></section>
  <footer className="flex flex-wrap gap-3 text-sm"><Link href="/search-console" className="inline-flex items-center gap-2 text-indigo-700 underline"><Globe2 size={16}/> Google source</Link><Link href="/site-audit" className="inline-flex items-center gap-2 text-indigo-700 underline"><ShieldCheck size={16}/> Homepage check</Link><Link href="/report-builder" className="inline-flex items-center gap-2 text-indigo-700 underline"><FileText size={16}/> Reports</Link></footer>
 </div></main>;
}
