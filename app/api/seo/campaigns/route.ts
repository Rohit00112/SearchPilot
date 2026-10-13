import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {guard,handle,owned,missing,boundedBody,string,choice,uuid} from '@/lib/seo-core';
import {ValidationError} from '@/lib/validation';
export const runtime='nodejs';
const fields='id,project_id AS "projectId",name,engine,device,country,locale,city,status,created_at AS "createdAt",updated_at AS "updatedAt"';
export async function GET(request:NextRequest){return handle(async()=>{
 const auth=await guard(request);if(auth.error)return auth.error;
 const projectId=uuid(request.nextUrl.searchParams.get('projectId'),'project ID');
 if(!await owned(getPool(),auth.session!.workspaceId,projectId))return missing();
 const {rows}=await getPool().query('SELECT '+fields+' FROM seo_tracking_campaigns WHERE workspace_id=$1 AND project_id=$2 ORDER BY created_at DESC LIMIT 100',[auth.session!.workspaceId,projectId]);
 return NextResponse.json({campaigns:rows,sample:false});
})}
export async function POST(request:NextRequest){return handle(async()=>{
 const auth=await guard(request,true);if(auth.error)return auth.error;
 const b=await boundedBody(request),projectId=uuid(b.projectId,'project ID');
 if(!await owned(getPool(),auth.session!.workspaceId,projectId))return missing();
 const name=string(b.name,'Campaign name',120),engine=choice(b.engine,'engine',['google','bing']),device=choice(b.device,'device',['desktop','mobile']);
 const country=string(b.country,'Country',2).toUpperCase(),locale=string(b.locale,'Locale',20);
 if(!/^[A-Z]{2}$/.test(country)||!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(locale))throw new ValidationError('Invalid country or locale.');
 const city=b.city==null?null:string(b.city,'City',120);
 const {rows}=await getPool().query('INSERT INTO seo_tracking_campaigns(workspace_id,project_id,name,engine,device,country,locale,city,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING '+fields,[auth.session!.workspaceId,projectId,name,engine,device,country,locale,city,auth.session!.id]);
 return NextResponse.json({campaign:rows[0]},{status:201});
})}
export async function PATCH(request:NextRequest){return handle(async()=>{
 const auth=await guard(request,true);if(auth.error)return auth.error;
 const id=uuid(request.nextUrl.searchParams.get('id'),'campaign ID'),b=await boundedBody(request);
 const name=b.name===undefined?null:string(b.name,'Campaign name',120);
 const status=b.status===undefined?null:choice(b.status,'status',['active','paused','archived']);
 if(name===null&&status===null)throw new ValidationError('No campaign changes.');
 const {rows}=await getPool().query('UPDATE seo_tracking_campaigns SET name=COALESCE($3,name),status=COALESCE($4,status),updated_at=now() WHERE workspace_id=$1 AND id=$2 RETURNING '+fields,[auth.session!.workspaceId,id,name,status]);
 return rows[0]?NextResponse.json({campaign:rows[0]}):missing();
})}
