'use client';
import {useCallback,useEffect,useState} from 'react';
import {Alert,Badge,Button,Card,EmptyState,Input} from '@/components/ui';
import {RefreshCw} from 'lucide-react';
type Kind='organic'|'keywords'|'backlinks';
type RecordRow=Record<string,unknown>&{id:string;sourceLabel?:string;observed_at?:string};
type Campaign={id:string;name:string;engine:string;device:string;country:string;locale:string;status:string};
const fields:Record<Kind,{key:string;label:string}[]>={
 organic:[{key:'position',label:'Observed rank'},{key:'landing_url',label:'Landing URL'},{key:'observed_at',label:'Observed at'}],
 keywords:[{key:'phrase',label:'Keyword'},{key:'country',label:'Country'},{key:'volume',label:'Imported volume'},{key:'difficulty',label:'Imported difficulty'},{key:'intent',label:'Intent'}],
 backlinks:[{key:'source_url',label:'Source URL'},{key:'target_url',label:'Target URL'},{key:'link_type',label:'Link type'},{key:'status',label:'Status'}]
};
async function api<T>(url:string,init?:RequestInit):Promise<T>{const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...init});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||`HTTP ${r.status}`);return data}
export default function ImportedData({kind,projectId}:{kind:Kind;projectId:string}){
 const [rows,setRows]=useState<RecordRow[]>([]),[campaigns,setCampaigns]=useState<Campaign[]>([]),[campaignId,setCampaignId]=useState(''),[name,setName]=useState(''),[engine,setEngine]=useState('google'),[device,setDevice]=useState('desktop'),[country,setCountry]=useState('US'),[locale,setLocale]=useState('en-US');
 const [sourceLabel,setSourceLabel]=useState('Manual research upload'),[items,setItems]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{if(!projectId)return;setLoading(true);setError('');
  try{const result=await api<{rows:RecordRow[]}>(`/api/seo/data?projectId=${encodeURIComponent(projectId)}&kind=${kind}&limit=100`);setRows(result.rows||[]);
   if(kind==='organic'){const data=await api<{campaigns:Campaign[]}>(`/api/seo/campaigns?projectId=${encodeURIComponent(projectId)}`);setCampaigns(data.campaigns||[]);setCampaignId(v=>data.campaigns.some(c=>c.id===v)?v:data.campaigns[0]?.id||'')}
  }catch(e){setError(e instanceof Error?e.message:'Provider not available.')}finally{setLoading(false)}},[kind,projectId]);
 useEffect(()=>{void refresh()},[refresh]);
 async function submit(action:()=>Promise<void>){setBusy(true);setError('');setStatus('');try{await action();await refresh()}catch(e){setError(e instanceof Error?e.message:'Could not save.')}finally{setBusy(false)}}
 async function createCampaign(e:React.FormEvent){e.preventDefault();await submit(async()=>{const r=await api<{campaign:Campaign}>('/api/seo/campaigns',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId,name,engine,device,country,locale})});setCampaignId(r.campaign.id);setName('');setStatus('Campaign created. Observations must be explicitly imported.')})}
 async function importRows(e:React.FormEvent){e.preventDefault();await submit(async()=>{
  let parsed:unknown;try{parsed=JSON.parse(items)}catch{throw Error('Enter a valid JSON array of observation objects.')}
  if(!Array.isArray(parsed)||parsed.length<1||parsed.length>50)throw Error('Provide 1–50 observation objects.');
  const result=await api<{imported:number}>('/api/seo/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId,kind,sourceLabel,campaignId:kind==='organic'?campaignId:undefined,items:parsed})});
  setStatus(`Imported ${result.imported} user-supplied observations as unverified records.`);setItems('');
 })}
 return <div className="space-y-5">
  {kind==='organic'&&<Card title="Tracking campaigns" description="The search engine, country, locale and device are required context for user-imported organic ranks.">
   <form onSubmit={createCampaign} className="grid gap-3 p-5 md:grid-cols-3">
    <Input label="Campaign name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="US desktop research"/>
    <label className="flex flex-col gap-2 text-xs font-semibold">Search engine<select className="rounded-lg border p-3" value={engine} onChange={e=>setEngine(e.target.value)}><option value="google">Google</option><option value="bing">Bing</option></select></label>
    <label className="flex flex-col gap-2 text-xs font-semibold">Device<select className="rounded-lg border p-3" value={device} onChange={e=>setDevice(e.target.value)}><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></label>
    <Input label="Country (ISO 2)" maxLength={2} required value={country} onChange={e=>setCountry(e.target.value.toUpperCase())}/>
    <Input label="Locale" required value={locale} onChange={e=>setLocale(e.target.value)} placeholder="en-US"/>
    <div className="flex items-end"><Button variant="primary" type="submit" disabled={busy}>Create campaign</Button></div>
   </form>
   {!!campaigns.length&&<div className="border-t p-5"><label className="flex flex-col gap-2 text-xs font-semibold">Active import campaign<select className="rounded-lg border p-3" value={campaignId} onChange={e=>setCampaignId(e.target.value)}>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name} · {c.engine} · {c.device} · {c.country}</option>)}</select></label></div>}
  </Card>}
  <Card title="User-imported research observations" description="These records are user-supplied, not independently verified or inferred by SearchPilot.">
   <div className="flex flex-wrap items-center gap-3 p-5"><Badge tone="warning">User import · UNVERIFIED</Badge><Badge>{rows.length} displayed records</Badge><Button loading={loading} onClick={()=>void refresh()} leadingIcon={<RefreshCw size={15}/>}>Refresh observations</Button></div>
   {error&&<Alert tone="error">{error}</Alert>}{status&&<Alert tone="success">{status}</Alert>}
   {!!rows.length?<div className="overflow-x-auto" role="region" tabIndex={0} aria-label="Imported observations"><table className="min-w-[720px] w-full text-left text-xs"><thead className="bg-slate-100"><tr>{[...fields[kind],{key:'sourceLabel',label:'Supplied source'}].map(x=><th scope="col" className="p-3" key={x.key}>{x.label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t">{[...fields[kind],{key:'sourceLabel',label:'Supplied source'}].map(field=><td className="max-w-60 truncate p-3" key={field.key} title={String(row[field.key]??'')}>{String(row[field.key]??'—')}</td>)}</tr>)}</tbody></table></div>:!loading&&<EmptyState compact title="No imported observations yet" description="Upload authorized user-owned observations if available. SearchPilot does not supply an automatic commercial SEO dataset."/>}
   <form onSubmit={importRows} className="space-y-4 border-t p-5"><Input label="Source label" required maxLength={160} value={sourceLabel} onChange={e=>setSourceLabel(e.target.value)}/><label className="block text-xs font-semibold">Observation objects (JSON array, 1–50 entries)<textarea required rows={5} value={items} onChange={e=>setItems(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-mono text-xs" placeholder={kind==='keywords'?'[{"keyword":"example","country":"US","locale":"en-US","volume":null,"difficulty":null,"observedAt":"2026-10-01T10:00:00Z"}]':kind==='backlinks'?'[{"sourceUrl":"https://other.example/post","targetUrl":"https://your-domain.example/","linkType":"follow","status":"unknown","observedAt":"2026-10-01T10:00:00Z"}]':'[{"keyword":"example","position":5,"observedAt":"2026-10-01T10:00:00Z"}]'}/></label><p className="text-xs text-slate-600">Only upload observations you have permission to use. Every import is explicitly tagged user_import and verified=false.</p><Button type="submit" variant="primary" loading={busy} disabled={kind==='organic'&&!campaignId}>Import observations</Button></form>
  </Card>
 </div>;
}
