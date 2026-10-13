import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {guard,boundedBody,owned,uuid,string,choice,handle,missing} from '@/lib/seo-core';
import {ValidationError} from '@/lib/validation';
export const runtime='nodejs';
const tables={lists:'seo_strategy_lists',clusters:'seo_strategy_clusters',keywords:'seo_strategy_keywords'} as const;
type Kind=keyof typeof tables;
const kindOf=(v:unknown)=>choice(v,'kind',['lists','clusters','keywords']) as Kind;
const output=(kind:Kind,row:Record<string,unknown>)=>({
 ...row,projectId:row.project_id,listId:row.list_id,clusterId:row.cluster_id,
 sourceType:'user_manual',verified:false,sample:false
});
async function verifyParent(workspace:string,project:string,kind:Kind,list:string|null,cluster:string|null){
 if(!await owned(getPool(),workspace,project))return false;
 if(kind!=='lists'){
  const l=await getPool().query('SELECT 1 FROM seo_strategy_lists WHERE workspace_id=$1 AND project_id=$2 AND id=$3',[workspace,project,list]);
  if(!l.rows.length)return false;
 }
 if(kind==='keywords'&&cluster){
  const c=await getPool().query('SELECT 1 FROM seo_strategy_clusters WHERE workspace_id=$1 AND project_id=$2 AND list_id=$3 AND id=$4',[workspace,project,list,cluster]);
  if(!c.rows.length)return false;
 }
 return true;
}
export async function GET(request:NextRequest){return handle(async()=>{
 const auth=await guard(request);if(auth.error)return auth.error;
 const p=request.nextUrl.searchParams;
 const kind=kindOf(p.get('kind')),projectId=uuid(p.get('projectId'),'project ID');
 const listId=kind==='lists'?null:uuid(p.get('listId'),'list ID');
 if(!await verifyParent(auth.session!.workspaceId,projectId,kind,listId,null))return missing();
 const conditions=['workspace_id=$1','project_id=$2',...(listId?['list_id=$3']:[])];
 const {rows}=await getPool().query('SELECT * FROM '+tables[kind]+' WHERE '+conditions.join(' AND ')+' ORDER BY created_at DESC LIMIT 100',
  [auth.session!.workspaceId,projectId,...(listId?[listId]:[])]);
 return NextResponse.json({kind,rows:rows.map(row=>output(kind,row)),provenance:{sourceType:'user_manual',verified:false,sample:false}});
})}
export async function POST(request:NextRequest){return handle(async()=>{
 const auth=await guard(request,true);if(auth.error)return auth.error;
 const b=await boundedBody(request),kind=kindOf(b.kind),projectId=uuid(b.projectId,'project ID');
 const listId=kind==='lists'?null:uuid(b.listId,'list ID');
 const clusterId=kind==='keywords'&&b.clusterId!=null?uuid(b.clusterId,'cluster ID'):null;
 if(!await verifyParent(auth.session!.workspaceId,projectId,kind,listId,clusterId))return missing();
 const text=string(kind==='keywords'?b.phrase:b.title,kind==='keywords'?'Phrase':'Title',kind==='keywords'?200:120);
 const notes=b.notes==null?null:string(b.notes,'Notes',2000);
 const description=b.description==null?null:string(b.description,'Description',1000);
 const priority=kind==='keywords'?(b.priority===undefined?3:b.priority):3;
 if(typeof priority!=='number'||!Number.isInteger(priority)||priority<1||priority>5)throw new ValidationError('Priority must be 1–5.');
 let sql:string;let args:unknown[];
 if(kind==='lists'){
  sql='INSERT INTO seo_strategy_lists(workspace_id,project_id,title,description,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *';
  args=[auth.session!.workspaceId,projectId,text,description,auth.session!.id];
 }else if(kind==='clusters'){
  sql='INSERT INTO seo_strategy_clusters(workspace_id,project_id,list_id,title,notes) VALUES($1,$2,$3,$4,$5) RETURNING *';
  args=[auth.session!.workspaceId,projectId,listId,text,notes];
 }else{
  sql='INSERT INTO seo_strategy_keywords(workspace_id,project_id,list_id,cluster_id,phrase,notes,priority) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *';
  args=[auth.session!.workspaceId,projectId,listId,clusterId,text,notes,priority];
 }
 const {rows}=await getPool().query(sql,args);
 return NextResponse.json({kind,item:output(kind,rows[0])},{status:201});
})}
export async function PATCH(request:NextRequest){return handle(async()=>{
 const auth=await guard(request,true);if(auth.error)return auth.error;
 const b=await boundedBody(request),kind=kindOf(b.kind),id=uuid(b.id,'item ID'),projectId=uuid(b.projectId,'project ID');
 const columns:string[]=[],values:unknown[]=[auth.session!.workspaceId,projectId,id];
 for(const [field,column,max] of [['title','title',120],['phrase','phrase',200],['description','description',1000],['notes','notes',2000]] as const){
  if(b[field]!==undefined&&((kind==='lists'&&['title','description'].includes(field))||(kind==='clusters'&&['title','notes'].includes(field))||(kind==='keywords'&&['phrase','notes'].includes(field)))){
   values.push(b[field]===null&&['notes','description'].includes(field)?null:string(b[field],field,max));
   columns.push(column+'=$'+values.length);
  }
 }
 if(kind==='keywords'&&b.priority!==undefined){
  if(typeof b.priority!=='number'||!Number.isInteger(b.priority)||b.priority<1||b.priority>5)throw new ValidationError('Priority must be 1–5.');
  values.push(b.priority);columns.push('priority=$'+values.length);
 }
 if(!columns.length)throw new ValidationError('No changes provided.');
 const {rows}=await getPool().query('UPDATE '+tables[kind]+' SET '+columns.join(',')+',updated_at=now() WHERE workspace_id=$1 AND project_id=$2 AND id=$3 RETURNING *',values);
 return rows.length?NextResponse.json({kind,item:output(kind,rows[0])}):missing();
})}
export async function DELETE(request:NextRequest){return handle(async()=>{
 const auth=await guard(request,true);if(auth.error)return auth.error;
 const b=await boundedBody(request),kind=kindOf(b.kind),id=uuid(b.id,'item ID'),projectId=uuid(b.projectId,'project ID');
 const {rowCount}=await getPool().query('DELETE FROM '+tables[kind]+' WHERE workspace_id=$1 AND project_id=$2 AND id=$3',[auth.session!.workspaceId,projectId,id]);
 return rowCount?NextResponse.json({deleted:true}):missing();
})}
