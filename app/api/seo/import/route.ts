import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {guard,handle,missing,owned,boundedBody,string,choice,uuid,time,number,httpsUrl} from '@/lib/seo-core';
import {ValidationError} from '@/lib/validation';
export const runtime='nodejs';

export async function POST(request:NextRequest){return handle(async()=>{
 const auth=await guard(request,true);if(auth.error)return auth.error;
 const data=await boundedBody(request);
 const projectId=uuid(data.projectId,'project ID');
 const kind=choice(data.kind,'kind',['organic','keywords','backlinks']);
 const sourceLabel=string(data.sourceLabel,'Source label',160);
 const campaignId=kind==='organic'?uuid(data.campaignId,'campaign ID'):null;
 if(!Array.isArray(data.items)||data.items.length<1||data.items.length>50)throw new ValidationError('Provide 1–50 imported items.');
 const client=await getPool().connect();
 try{
   await client.query('BEGIN');
   const domain=await owned(client,auth.session!.workspaceId,projectId);
   if(!domain){await client.query('ROLLBACK');return missing();}
   let campaign:{id:string;country:string;locale:string;status:string}|undefined;
   if(campaignId){
     const row=await client.query('SELECT id,country,locale,status FROM seo_tracking_campaigns WHERE workspace_id=$1 AND project_id=$2 AND id=$3 FOR UPDATE',[auth.session!.workspaceId,projectId,campaignId]);
     campaign=row.rows[0];
     if(!campaign||campaign.status!=='active'){await client.query('ROLLBACK');return missing();}
   }
   // Validate every record before creating an import batch. Partial imports
   // never commit, and submitted metrics are never verified by this endpoint.
   const parsed=await Promise.all(data.items.map(async(raw,index)=>{
     if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new ValidationError('Item '+(index+1)+' must be an object.');
     const item=raw as Record<string,unknown>,observedAt=time(item.observedAt);
     if(kind==='organic'){
       const phrase=string(item.keyword,'Keyword',200);
       const position=number(item.position,'position',1,1000,true);
       const landingUrl=item.landingUrl==null?null:httpsUrl(item.landingUrl,'Landing URL',domain).url;
       return {phrase,position,observedAt,landingUrl};
     }
     if(kind==='keywords'){
       const phrase=string(item.keyword,'Keyword',200);
       const country=string(item.country,'Country',2).toUpperCase(),locale=string(item.locale,'Locale',20);
       if(!/^[A-Z]{2}$/.test(country)||!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(locale))throw new ValidationError('Invalid keyword country or locale.');
       const volume=number(item.volume,'volume',0,2147483647,true),difficulty=number(item.difficulty,'difficulty',0,100);
       const intent=item.intent==null?null:choice(item.intent,'intent',['informational','navigational','commercial','transactional','mixed']);
       return {phrase,country,locale,volume,difficulty,intent,observedAt};
     }
     const source=httpsUrl(item.sourceUrl,'Source URL'),target=httpsUrl(item.targetUrl,'Target URL',domain);
     const linkType=choice(item.linkType,'link type',['follow','nofollow','sponsored','ugc']);
     const status=choice(item.status,'link status',['live','lost','unknown']);
     const anchor=item.anchorText==null?null:string(item.anchorText,'Anchor text',500);
     return {sourceUrl:source.url,targetUrl:target.url,sourceHost:source.host,linkType,status,anchor,observedAt};
   }));
   const created=await client.query('INSERT INTO seo_import_batches(workspace_id,project_id,campaign_id,kind,source_label,submitted_by,item_count) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,created_at AS "createdAt"',[auth.session!.workspaceId,projectId,campaignId,kind,sourceLabel,auth.session!.id,parsed.length]);
   const batchId=created.rows[0].id;
   for(const item of parsed){
     if(kind==='organic'){
       const entry=item as {phrase:string;position:number|null;observedAt:string;landingUrl:string|null};
       const keyword=await client.query('INSERT INTO seo_tracking_keywords(workspace_id,project_id,campaign_id,phrase) VALUES($1,$2,$3,$4) ON CONFLICT(workspace_id,campaign_id,phrase) DO UPDATE SET updated_at=seo_tracking_keywords.updated_at RETURNING id',[auth.session!.workspaceId,projectId,campaignId,entry.phrase]);
       await client.query('INSERT INTO seo_organic_observations(workspace_id,project_id,campaign_id,keyword_id,batch_id,position,observed_at,landing_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[auth.session!.workspaceId,projectId,campaignId,keyword.rows[0].id,batchId,entry.position,entry.observedAt,entry.landingUrl]);
     }else if(kind==='keywords'){
       const entry=item as {phrase:string;country:string;locale:string;volume:number|null;difficulty:number|null;intent:string|null;observedAt:string};
       await client.query('INSERT INTO seo_keyword_research(workspace_id,project_id,batch_id,phrase,country,locale,volume,difficulty,intent,observed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[auth.session!.workspaceId,projectId,batchId,entry.phrase,entry.country,entry.locale,entry.volume,entry.difficulty,entry.intent,entry.observedAt]);
     }else{
       const entry=item as {sourceUrl:string;targetUrl:string;sourceHost:string;linkType:string;status:string;anchor:string|null;observedAt:string};
       await client.query('INSERT INTO seo_backlink_observations(workspace_id,project_id,batch_id,source_url,target_url,source_host,anchor_text,link_type,status,observed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[auth.session!.workspaceId,projectId,batchId,entry.sourceUrl,entry.targetUrl,entry.sourceHost,entry.anchor,entry.linkType,entry.status,entry.observedAt]);
     }
   }
   await client.query('COMMIT');
   return NextResponse.json({batch:{id:batchId,projectId,campaignId,kind,sourceType:'user_import',sourceLabel,verified:false,sample:false,itemCount:parsed.length,createdAt:created.rows[0].createdAt},imported:parsed.length},{status:201});
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
})}
