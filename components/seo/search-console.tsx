'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {Alert,Badge,Button,Card,EmptyState} from '@/components/ui';
import {Download,ExternalLink,RefreshCw,ShieldCheck} from 'lucide-react';
type Connection={connected:boolean;property:string|null;configured:boolean};
type Property={url:string;permission:string};
type Row={date:string;query:string;page:string;country:string;device:string;clicks:number;impressions:number;ctr:number;averagePosition:number;collectedAt:string};
const asDate=(date:Date)=>date.toISOString().slice(0,10);
async function call<T>(url:string,init?:RequestInit):Promise<T>{
 const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...init});
 const v=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(typeof v.error==='string'?v.error:`Request failed (HTTP ${r.status})`);
 return v as T;
}
export default function SearchConsole(){
 const [connection,setConnection]=useState<Connection|null>(null),[properties,setProperties]=useState<Property[]>([]),[property,setProperty]=useState(''),[rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[status,setStatus]=useState('');
 const [to,setTo]=useState(asDate(new Date(Date.now()-3*86400000))),[from,setFrom]=useState(asDate(new Date(Date.now()-10*86400000)));
 const refresh=useCallback(async()=>{setLoading(true);setError('');
  try{const result=await call<Connection>('/api/integrations/gsc');setConnection(result);setProperty(result.property||'');
   if(result.connected){const sites=await call<{properties:Property[]}>('/api/integrations/gsc/properties');setProperties(sites.properties||[]);}
   else setProperties([]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load integration.');}finally{setLoading(false)}
 },[]);
 useEffect(()=>{void refresh()},[refresh]);
 async function action(fn:()=>Promise<void>){setBusy(true);setError('');setStatus('');try{await fn()}catch(e){setError(e instanceof Error?e.message:'Request failed.')}finally{setBusy(false)}}
 const body=(data:object):RequestInit=>({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
 async function performance(){const data=await call<{rows:Row[],source:string,sample:boolean}>(`/api/integrations/gsc/performance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);setRows(data.rows||[]);setStatus(`Loaded ${data.rows?.length||0} stored records from Google Search Console.`);}
 const dateValid=Boolean(from&&to&&from<=to&&(Date.parse(to)-Date.parse(from))/86400000<=30);
 return <main className="min-h-screen bg-[#f7f8fc] p-4 text-slate-800 md:p-10"><div className="mx-auto max-w-6xl space-y-6">
  <nav className="text-xs text-slate-600" aria-label="Breadcrumb"><Link href="/" className="underline">SearchPilot</Link> / Google Search Console</nav>
  <header className="rounded-2xl bg-gradient-to-r from-[#24204b] to-[#624ab0] p-8 text-white"><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">Google Search Console</h1><Badge tone={connection?.connected?'success':'warning'}>{connection?.connected?'Connected':'Not connected'}</Badge></div><p className="mt-3 max-w-2xl text-sm text-violet-100">Authorized Google data only. Search Console average position is impression-weighted and is different from an exact SERP ranking.</p></header>
  {error&&<Alert tone="error" title="Integration error" onDismiss={()=>setError('')}>{error}</Alert>}
  {status&&<Alert tone="success" title="Updated" onDismiss={()=>setStatus('')}>{status}</Alert>}
  {loading&&<p role="status" className="rounded-xl bg-white p-5 text-sm">Checking connection status…</p>}
  {!loading&&<Card title="Connection and property" description="A Google account must authorize read-only Search Console access.">
   <div className="space-y-4 p-5">
    <div className="flex flex-wrap gap-2"><Badge tone={connection?.configured?'success':'warning'}>{connection?.configured?'OAuth configured':'OAuth not configured'}</Badge>{connection?.property&&<Badge tone="info">Property: {connection.property}</Badge>}</div>
    {!connection?.configured&&<EmptyState icon={ShieldCheck} compact title="Administrator setup required" description="A local Google OAuth client and redirect URI must be configured before you can connect a Google account. No data will be synthesized."/>}
    <div className="flex flex-wrap gap-2">
     {!connection?.connected&&<Button variant="primary" disabled={!connection?.configured} loading={busy} leadingIcon={<ExternalLink size={15}/>} onClick={()=>void action(async()=>{const result=await call<{authorizationUrl:string}>('/api/integrations/gsc/connect',body({}));if(!result.authorizationUrl.startsWith('https://accounts.google.com/'))throw Error('Unexpected OAuth destination');window.location.assign(result.authorizationUrl)})}>Connect with Google</Button>}
     {connection?.connected&&<Button variant="danger" loading={busy} onClick={()=>void action(async()=>{await call('/api/integrations/gsc',{method:'DELETE'});setRows([]);await refresh();setStatus('Google Search Console disconnected.')})}>Disconnect</Button>}
     <Button onClick={()=>void refresh()} loading={loading} leadingIcon={<RefreshCw size={15}/>}>Refresh connection</Button>
    </div>
    {connection?.connected&&<form onSubmit={e=>{e.preventDefault();void action(async()=>{await call('/api/integrations/gsc',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({property})});await refresh();setStatus('Verified Google property selected.')})}} className="flex flex-wrap items-end gap-3">
     <label className="flex min-w-52 flex-1 flex-col gap-2 text-xs font-semibold">Authorized property<select required className="rounded-lg border border-slate-300 bg-white p-3" value={property} onChange={e=>setProperty(e.target.value)}><option value="">Select a property</option>{properties.map(p=><option value={p.url} key={p.url}>{p.url} ({p.permission})</option>)}</select></label>
     <Button variant="primary" type="submit" loading={busy} disabled={!property}>Use property</Button>
    </form>}
    {connection?.connected&&properties.length===0&&<EmptyState compact title="No accessible properties returned" description="Check your Google account's Search Console access, then refresh. Permission changes can take time to propagate."/>}
   </div>
  </Card>}
  <Card title="First-party performance" description="Google Search Console · stored data · no sample rows">
   <div className="flex flex-wrap items-end gap-3 p-5"><label className="flex flex-col gap-1 text-xs font-semibold">From<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="rounded-lg border border-slate-300 p-3"/></label><label className="flex flex-col gap-1 text-xs font-semibold">To<input type="date" value={to} onChange={e=>setTo(e.target.value)} className="rounded-lg border border-slate-300 p-3"/></label><Button loading={busy} disabled={!dateValid||!connection?.connected} onClick={()=>void action(performance)}>Load saved performance</Button><Button variant="primary" loading={busy} disabled={!dateValid||!connection?.property} leadingIcon={<Download size={15}/>} onClick={()=>void action(async()=>{const result=await call<{imported:number,partial:boolean}>('/api/integrations/gsc/performance',body({from,to}));setStatus(`Imported ${result.imported} Google rows${result.partial?' (provider page limit reached; partial result)':''}.`);await performance()})}>Import from Google</Button></div>
   {!dateValid&&<Alert tone="warning">Choose a date range of at most 31 days, with the starting date before the ending date.</Alert>}
   {rows.length?<div role="region" tabIndex={0} aria-label="Search Console performance rows" className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-100"><tr>{['Date','Query','Page','Clicks','Impressions','CTR','Average position','Source'].map(x=><th key={x} scope="col" className="p-4">{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.date}-${r.query}-${i}`} className="border-t"><td className="p-4">{r.date}</td><th scope="row" className="p-4 font-semibold">{r.query||'—'}</th><td className="max-w-40 truncate p-4" title={r.page}>{r.page}</td><td className="p-4">{r.clicks}</td><td className="p-4">{r.impressions}</td><td className="p-4">{(r.ctr*100).toFixed(1)}%</td><td className="p-4">{Number(r.averagePosition).toFixed(1)}</td><td className="p-4"><Badge tone="success">Google · measured</Badge></td></tr>)}</tbody></table></div>:<EmptyState title="No stored Search Console measurements" description="Connect an authorized Google property and import a date range. Empty Google results are valid and will not be replaced with made-up metrics."/>}
  </Card>
 </div></main>;
}
