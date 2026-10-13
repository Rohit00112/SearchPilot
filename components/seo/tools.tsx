import Link from 'next/link';
import {Badge,Card} from '@/components/ui';
import {Search,BarChart3,Link2,Target,ShieldCheck,ArrowRight,Network,Scale,GitCompare,ScanSearch} from 'lucide-react';
const tools=[
 {href:'/keyword-magic',name:'Keyword research',description:'Review tracked terms and, when available, user-imported keyword research.',icon:Search},
 {href:'/keyword-strategy',name:'Keyword strategy builder',description:'Create manual topic clusters and assign pillar and supporting keywords to a content plan.',icon:Network},
 {href:'/organic-rankings',name:'Organic rankings',description:'View available first-party and user-imported observations with source labels.',icon:BarChart3},
 {href:'/seo-backlinks',name:'Backlink research',description:'Explore authorized backlink observations. No fabricated link graph.',icon:Link2},
 {href:'/backlink-audit',name:'Backlink review',description:'Triage imported links with human decisions, notes and a transparent review history.',icon:Scale},
 {href:'/gaps',name:'Keyword & backlink gaps',description:'Compare user-imported keyword and referring-domain data between two workspace projects.',icon:GitCompare},
 {href:'/seo-campaigns',name:'Tracking campaigns',description:'Configure monitoring context and review explicitly sourced positions.',icon:Target},
 {href:'/crawl-jobs',name:'Multi-page site crawls',description:'Queue bounded crawl requests. Network processing awaits safety review; no completed run without a worker.',icon:ScanSearch},
 {href:'/integrations',name:'Google Search Console',description:'Authorize a property, import Google data, and inspect the imported measurements.',icon:ShieldCheck},
] as const;
export default function SEOTools(){
 return <main className="min-h-screen bg-[#f7f8fc] p-4 text-slate-800 md:p-10"><div className="mx-auto max-w-6xl">
  <div className="rounded-2xl bg-gradient-to-r from-[#24204b] to-[#6347b3] p-8 text-white"><div className="flex items-center gap-3"><h1 className="text-3xl font-bold">SEO research tools</h1><Badge tone="purple">Provider-aware</Badge></div><p className="mt-3 max-w-2xl text-sm text-violet-100">Work with your own workspace and connected sources. Measurements appear only when actually collected or imported, with explicit provenance.</p></div>
  <section className="mt-6 grid gap-5 md:grid-cols-2" aria-label="Available tools">{tools.map(tool=>{const Icon=tool.icon;return <Card key={tool.href} className="p-6"><span className="inline-flex rounded-xl bg-violet-100 p-3 text-violet-700"><Icon size={22} aria-hidden="true"/></span><h2 className="mt-4 text-lg font-bold">{tool.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{tool.description}</p><Link href={tool.href} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#6246bf] px-4 py-3 text-xs font-bold text-white">Open tool <ArrowRight size={15} aria-hidden="true"/></Link></Card>})}</section>
  <p className="mt-6 text-xs text-slate-600">SearchPilot distinguishes manually entered or imported observations from provider-verified metrics. Unsupported live research remains unavailable until authorized data sources are connected.</p>
 </div></main>
}
