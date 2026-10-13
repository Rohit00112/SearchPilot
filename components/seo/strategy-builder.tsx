'use client';

import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {Alert,Badge,Button,Card,EmptyState,Input} from '@/components/ui';
import {ArrowRight,FolderPlus,Layers3,Plus,RefreshCw,Target} from 'lucide-react';

type Project={id:string;name:string;domain:string};
type StrategyList={id:string;projectId:string;title:string;description?:string|null;sourceType?:string};
type Cluster={id:string;listId?:string;title:string;notes?:string|null};
type ClusterKeyword={id:string;clusterId?:string|null;listId?:string;phrase:string;priority:number;notes?:string|null};
type RowsResponse<T>={kind:string;rows:T[];provenance:{sourceType:string;verified:false;sample:false}};
const inputClass='mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600';
const labelClass='block text-xs font-semibold text-slate-700';

async function api<T>(url:string, options?:RequestInit):Promise<T>{
  const response=await fetch(url,{cache:'no-store',credentials:'same-origin',...options});
  const payload:unknown=await response.json().catch(()=>null);
  if(!response.ok){
    const value=payload as {error?:unknown}|null;
    throw Error(typeof value?.error==='string'?value.error:`Request failed (${response.status}).`);
  }
  return payload as T;
}
function json(data:unknown,method='POST'):RequestInit {
  return {method,headers:{'content-type':'application/json'},body:JSON.stringify(data)};
}

export default function StrategyBuilder(){
  const [projects,setProjects]=useState<Project[]>([]);
  const [projectId,setProjectId]=useState('');
  const [lists,setLists]=useState<StrategyList[]>([]);
  const [listId,setListId]=useState('');
  const [clusters,setClusters]=useState<Cluster[]>([]);
  const [items,setItems]=useState<ClusterKeyword[]>([]);
  const [loadingProjects,setLoadingProjects]=useState(true);
  const [loadingLists,setLoadingLists]=useState(false);
  const [loadingDetail,setLoadingDetail]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [listName,setListName]=useState('');
  const [clusterName,setClusterName]=useState('');
  const [clusterNotes,setClusterNotes]=useState('');
  const [keyword,setKeyword]=useState('');
  const [itemCluster,setItemCluster]=useState('');
  const [priority,setPriority]=useState(3);
  const [search,setSearch]=useState('');
  const projectRequest=useRef(0),listRequest=useRef(0),detailRequest=useRef(0);

  const loadProjects=useCallback(async()=>{
    const request=++projectRequest.current;
    setLoadingProjects(true);setError('');
    try{
      const data=await api<{projects:Project[]}>('/api/projects');
      if(request===projectRequest.current){
        setProjects(data.projects??[]);
        setProjectId(previous=>data.projects?.some(p=>p.id===previous)?previous:(data.projects?.[0]?.id??''));
      }
    }catch(cause){if(request===projectRequest.current)setError(cause instanceof Error?cause.message:'Unable to load projects.');}
    finally{if(request===projectRequest.current)setLoadingProjects(false);}
  },[]);
  const loadLists=useCallback(async()=>{
    const request=++listRequest.current;
    if(!projectId){setLists([]);setListId('');setLoadingLists(false);return;}
    setLoadingLists(true);setError('');
    try{
      const data=await api<RowsResponse<StrategyList>>(`/api/seo/strategy?kind=lists&projectId=${encodeURIComponent(projectId)}`);
      const next=data.rows??[];
      if(request===listRequest.current){
        setLists(next);
        setListId(previous=>next.some(list=>list.id===previous)?previous:(next[0]?.id??''));
      }
    }catch(cause){if(request===listRequest.current)setError(cause instanceof Error?cause.message:'Unable to load keyword strategies.');}
    finally{if(request===listRequest.current)setLoadingLists(false);}
  },[projectId]);
  const loadDetail=useCallback(async()=>{
    const request=++detailRequest.current;
    if(!listId){setClusters([]);setItems([]);setLoadingDetail(false);return;}
    setLoadingDetail(true);setError('');
    try{
      const url=`/api/seo/strategy?projectId=${encodeURIComponent(projectId)}&listId=${encodeURIComponent(listId)}`;
      const [groups,keywords]=await Promise.all([
        api<RowsResponse<Cluster>>(url+'&kind=clusters'),
        api<RowsResponse<ClusterKeyword>>(url+'&kind=keywords'),
      ]);
      if(request===detailRequest.current){setClusters(groups.rows??[]);setItems(keywords.rows??[]);}
    }catch(cause){if(request===detailRequest.current)setError(cause instanceof Error?cause.message:'Unable to load strategy details.');}
    finally{if(request===detailRequest.current)setLoadingDetail(false);}
  },[projectId,listId]);

  useEffect(()=>{void loadProjects();},[loadProjects]);
  useEffect(()=>{
    setLists([]);setListId('');setClusters([]);setItems([]);setNotice('');
    void loadLists();
  },[loadLists]);
  useEffect(()=>{void loadDetail();},[loadDetail]);
  useEffect(()=>()=>{projectRequest.current++;listRequest.current++;detailRequest.current++;},[]);
  useEffect(()=>{
    if(!clusters.some(c=>c.id===itemCluster))setItemCluster(clusters[0]?.id??'');
  },[clusters,itemCluster]);

  async function mutate(fn:()=>Promise<void>){
    setBusy(true);setError('');setNotice('');
    try{await fn();}catch(cause){setError(cause instanceof Error?cause.message:'Unable to save changes.');}
    finally{setBusy(false);}
  }

  async function createList(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!projectId||!listName.trim())return;
    await mutate(async()=>{
      const response=await api<{item:StrategyList}>('/api/seo/strategy',json({kind:'lists',projectId,title:listName.trim()}));
      setListName('');
      await loadLists();
      if(response.item?.id)setListId(response.item.id);
      setNotice('Strategy saved. Add your own topic groups to begin.');
    });
  }
  async function createCluster(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!listId||!clusterName.trim())return;
    await mutate(async()=>{
      await api('/api/seo/strategy',json({kind:'clusters',projectId,listId,title:clusterName.trim(),notes:clusterNotes.trim()||null}));
      setClusterName('');setClusterNotes('');
      await loadDetail();setNotice('Manual topic cluster saved.');
    });
  }
  async function addKeyword(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!listId||!keyword.trim()||!itemCluster)return;
    await mutate(async()=>{
      await api('/api/seo/strategy',json({kind:'keywords',projectId,listId,clusterId:itemCluster,phrase:keyword.trim(),priority}));
      setKeyword('');
      await loadDetail();setNotice('Keyword assigned to the selected manual topic cluster.');
    });
  }
  async function deleteRecord(kind:'lists'|'clusters'|'keywords',id:string,title:string){
    if(!window.confirm(kind==='clusters'
      ? `Delete ${title}? Assigned keywords will remain in the strategy as ungrouped items.`
      : `Delete ${title}? ${kind==='lists'?'Its groups and keywords will also be deleted.':'This keyword assignment will be removed.'}`))return;
    await mutate(async()=>{
      await api('/api/seo/strategy',json({kind,projectId,id},'DELETE'));
      if(kind==='lists')await loadLists();
      else await loadDetail();
      setNotice(`${title} deleted.`);
    });
  }
  const chosen=projects.find(p=>p.id===projectId);
  const selected=lists.find(list=>list.id===listId);
  const filtered=clusters.filter(c=>c.title.toLowerCase().includes(search.trim().toLowerCase())||
    items.some(item=>item.clusterId===c.id&&item.phrase.toLowerCase().includes(search.trim().toLowerCase())));
  const ungrouped=items.filter(item=>!item.clusterId||!clusters.some(cluster=>cluster.id===item.clusterId))
    .filter(item=>item.phrase.toLowerCase().includes(search.trim().toLowerCase()));
  return <main className="min-h-screen bg-[#f7f8fc] px-4 py-8 text-slate-900 md:px-10">
    <div className="mx-auto max-w-6xl space-y-6">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-700"><Link href="/seo-tools" className="underline">SEO tools</Link> / Keyword strategy</nav>
      <header className="rounded-2xl bg-gradient-to-r from-[#25204c] to-[#6046af] px-6 py-9 text-white md:px-9">
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">Keyword strategy builder</h1><Badge tone="purple">Manual strategy</Badge></div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-violet-100">Organize keywords into manually named topic groups and assign editorial priorities. SearchPilot records your deliberate assignments; it does not auto-generate clusters or claim live search demand.</p>
      </header>

      {error&&<Alert tone="error" title="Strategy unavailable" onDismiss={()=>setError('')}>{error}</Alert>}
      {notice&&<Alert tone="success" onDismiss={()=>setNotice('')}>{notice}</Alert>}

      <Card title="Your workspace" description="Strategies belong to the selected project and your authorized workspace.">
        <div className="flex flex-wrap items-end gap-4 p-5">
          <label className={labelClass+' min-w-48 flex-1'}>Project
            <select className={inputClass} value={projectId} disabled={loadingProjects||busy} onChange={event=>setProjectId(event.target.value)}>
              <option value="">Select a project</option>
              {projects.map(project=><option key={project.id} value={project.id}>{project.name} · {project.domain}</option>)}
            </select>
          </label>
          <Button loading={loadingProjects||loadingLists} leadingIcon={<RefreshCw size={15}/>} onClick={()=>void loadProjects()}>Refresh projects</Button>
          <Link href="/projects" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-700">Manage projects <ArrowRight size={15}/></Link>
        </div>
      </Card>

      {loadingProjects&&<p role="status" className="rounded-xl bg-white p-5 text-sm">Loading projects…</p>}
      {!loadingProjects&&!projectId&&<EmptyState icon={Layers3} title="No project selected" description="Create a project before organizing a manual keyword strategy." action={<Link href="/projects" className="text-violet-700 underline">Go to projects</Link>}/>}
      {!!projectId&&<div className="space-y-5">
        <Card title="Strategy lists" description={`Only human-created lists for ${chosen?.domain??'this project'} are displayed.`}>
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <form onSubmit={createList} className="flex flex-wrap items-end gap-3">
              <div className="min-w-44 flex-1"><Input label="New strategy list" required maxLength={120} value={listName} onChange={event=>setListName(event.target.value)} placeholder="e.g. Website migration topics"/></div>
              <Button type="submit" variant="primary" leadingIcon={<FolderPlus size={16}/>} loading={busy} disabled={!projectId}>Create list</Button>
            </form>
            <label className={labelClass}>Current strategy
              <select className={inputClass} value={listId} onChange={event=>setListId(event.target.value)} disabled={loadingLists||busy}>
                <option value="">Choose a saved list</option>{lists.map(list=><option key={list.id} value={list.id}>{list.title}</option>)}
              </select>
            </label>
          </div>
          {loadingLists&&<p role="status" className="px-5 pb-5 text-sm">Loading strategy lists…</p>}
          {!loadingLists&&!error&&lists.length===0&&<EmptyState icon={FolderPlus} compact title="No strategy lists yet" description="Create your first strategy list. Nothing will be clustered or generated automatically."/>}
        </Card>

        {selected&&<div className="grid gap-5 lg:grid-cols-2">
          <Card title="Add topic group" description="Name the group and record editorial notes. Hierarchical topic roles are not stored by this API.">
            <form onSubmit={createCluster} className="space-y-4 p-5">
              <Input label="Topic group name" required maxLength={120} value={clusterName} onChange={event=>setClusterName(event.target.value)} placeholder="e.g. Technical SEO foundations"/>
              <label className={labelClass}>Editorial notes (optional)<textarea rows={3} maxLength={2000} value={clusterNotes} onChange={event=>setClusterNotes(event.target.value)} className={inputClass}/></label>
              <Button type="submit" variant="primary" leadingIcon={<Plus size={15}/>} loading={busy}>Save manual group</Button>
            </form>
          </Card>

          <Card title="Assign an existing keyword" description="Only keywords you provide are added; no search volume or difficulty is inferred.">
            {clusters.length===0?<EmptyState icon={Target} compact title="Create a topic group first" description="You need at least one saved group before assigning keywords."/>:
              <form onSubmit={addKeyword} className="space-y-4 p-5">
                <Input label="Keyword or phrase" required maxLength={200} value={keyword} onChange={event=>setKeyword(event.target.value)} placeholder="e.g. technical SEO checklist"/>
                <label className={labelClass}>Topic group
                  <select className={inputClass} required value={itemCluster} onChange={event=>setItemCluster(event.target.value)}>
                    <option value="">Select a topic group</option>{clusters.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </label>
                <label className={labelClass}>Editorial priority<select className={inputClass} value={priority} onChange={event=>setPriority(Number(event.target.value))}>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
                <Button type="submit" variant="primary" loading={busy} leadingIcon={<Plus size={15}/>}>Assign keyword</Button>
              </form>}
          </Card>
        </div>}

        {selected&&<Card title="Your content plan" description={`${selected.title} · All topics and priorities are manually assigned.`}>
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            <Badge tone="info">{clusters.length} recorded groups</Badge>
            <Badge tone="neutral">{items.length} saved keyword assignments</Badge>
            <Button onClick={()=>void loadDetail()} leadingIcon={<RefreshCw size={15}/>} loading={loadingDetail}>Refresh groups</Button>
          </div>
          <div className="border-t p-5"><Input label="Search saved groups or assigned keywords" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Filter your topic plan"/></div>
          {loadingDetail&&<p role="status" className="px-5 pb-5 text-sm">Loading saved groups…</p>}
          {!loadingDetail&&!error&&filtered.length===0&&ungrouped.length===0&&<EmptyState compact icon={Layers3} title={search?'No matching groups or keywords':'No topic groups yet'} description={search?'Try another phrase or clear your filter.':'Add a manual topic group to start your content plan.'}/>}
          {filtered.length>0&&<div className="grid gap-4 border-t p-5 sm:grid-cols-2">{filtered.map(cluster=>{
            const keywords=items.filter(item=>item.clusterId===cluster.id);
            return <section key={cluster.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2"><h3 className="flex-1 text-base font-bold">{cluster.title}</h3><Badge tone="purple">Manual group</Badge><Button size="sm" variant="danger" onClick={()=>void deleteRecord('clusters',cluster.id,cluster.title)}>Delete</Button></div>
              {cluster.notes&&<p className="mt-2 text-xs text-slate-600">{cluster.notes}</p>}
              <p className="mt-3 text-xs text-slate-600">{keywords.length} keyword{keywords.length===1?'':'s'} · Assigned by an editor</p>
              {keywords.length?<ul className="mt-3 space-y-2">{keywords.map(item=><li key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="flex-1 break-words">{item.phrase} · Priority {item.priority}</span><button className="font-bold text-rose-700" type="button" onClick={()=>void deleteRecord('keywords',item.id,item.phrase)}>Remove</button></li>)}</ul>:<p className="mt-3 text-xs text-slate-600">No keywords assigned to this group.</p>}
            </section>;
          })}</div>}
          {ungrouped.length>0&&<section className="border-t p-5" aria-label="Ungrouped saved keywords"><h3 className="text-sm font-bold">Ungrouped keywords ({ungrouped.length})</h3><p className="mt-1 text-xs text-slate-600">Deleting a group keeps its keyword records, and they can be reviewed here.</p><ul className="mt-3 space-y-2">{ungrouped.map(item=><li key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="min-w-0 flex-1 break-words">{item.phrase} · Priority {item.priority}</span><button type="button" className="font-semibold text-rose-700" onClick={()=>void deleteRecord('keywords',item.id,item.phrase)}>Remove</button></li>)}</ul></section>}
        </Card>}
      </div>}
      <p className="text-xs leading-6 text-slate-600">Source: your workspace's saved manual entries. Topic groups and keyword priorities are editorial decisions, not algorithmic SEO or commercial dataset recommendations. Each view displays up to 100 saved records.</p>
    </div>
  </main>;
}
