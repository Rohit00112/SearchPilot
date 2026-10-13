import {NextRequest,NextResponse} from 'next/server';
import {authorize,csrf,deny,forbidden} from '@/lib/auth';
import {databaseAvailable,getPool} from '@/lib/db';
import {dateTime,jsonBody,object,optionalInteger,pageLimit,responseError,textField,uuid,ValidationError} from '@/lib/validation';

export const runtime='nodejs';
const missing=()=>NextResponse.json({error:'Resource not found.'},{status:404});
const unavailable=()=>NextResponse.json({error:'Manual rank observations require PostgreSQL.'},{status:503});

// GET /api/rankings?projectId=<uuid>&keywordId=<uuid optional>&limit=25&cursor=<opaque>
export async function GET(request:NextRequest){
  if(!databaseAvailable)return unavailable();
  try {
    const session=await authorize(request);if(!session)return deny();
    const params=request.nextUrl.searchParams;
    const projectId=uuid(params.get('projectId'),'project ID');
    const keywordId=params.has('keywordId')?uuid(params.get('keywordId'),'keyword ID'):null;
    const limit=pageLimit(params.get('limit'));
    const rawCursor=params.get('cursor');
    let cursor:{date:string;id:string}|null=null;
    if(rawCursor){
      try{
        const parsed=object(JSON.parse(Buffer.from(rawCursor,'base64url').toString('utf8')));
        cursor={date:dateTime(parsed.date),id:uuid(parsed.id,'cursor ID')};
      }catch{throw new ValidationError('Invalid page cursor.');}
    }
    const pool=getPool();
    const owned=await pool.query('SELECT 1 FROM projects WHERE id=$1 AND workspace_id=$2',[projectId,session.workspaceId]);
    if(!owned.rows.length)return missing();
    const result=await pool.query(
      `SELECT r.id,r.project_id AS "projectId",r.keyword_id AS "keywordId",k.keyword,
              r.position,r.observed_at AS "observedAt",r.recorded_at AS "recordedAt",
              r.source,r.note,r.recorded_by AS "recordedBy"
       FROM manual_rank_observations r
       JOIN keywords k ON k.id=r.keyword_id AND k.workspace_id=r.workspace_id AND k.project_id=r.project_id
       WHERE r.workspace_id=$1 AND r.project_id=$2
         AND ($3::uuid IS NULL OR r.keyword_id=$3::uuid)
         AND ($4::timestamptz IS NULL OR (r.observed_at,r.id)<($4::timestamptz,$5::uuid))
       ORDER BY r.observed_at DESC,r.id DESC LIMIT $6`,
      [session.workspaceId,projectId,keywordId,cursor?.date??null,cursor?.id??null,limit+1]
    );
    const rows=result.rows.slice(0,limit);
    const hasMore=result.rows.length>limit;
    const last=rows.at(-1);
    const nextCursor=hasMore&&last?Buffer.from(JSON.stringify({date:new Date(last.observedAt).toISOString(),id:last.id})).toString('base64url'):null;
    return NextResponse.json({rankings:rows,page:{limit,hasMore,nextCursor},provenance:{source:'manual',verified:false},demo:false});
  }catch(error){return responseError(error,'Unable to load ranking observations.');}
}

// POST /api/rankings {projectId,keywordId,position,observedAt?,note?}
export async function POST(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return unavailable();
  try {
    const session=await authorize(request,'editor');if(!session)return forbidden();
    const body=await jsonBody(request);
    const projectId=uuid(body.projectId,'project ID');
    const keywordId=uuid(body.keywordId,'keyword ID');
    const position=optionalInteger(body.position,'Position',1,1000);
    if(position===null)throw new ValidationError('Position is required.');
    const observedAt=body.observedAt===undefined?new Date().toISOString():dateTime(body.observedAt);
    const note=body.note===undefined||body.note===null?null:textField(body.note,'Note',500);
    const result=await getPool().query(
      `INSERT INTO manual_rank_observations (workspace_id,project_id,keyword_id,position,observed_at,recorded_by,source,note)
       SELECT $1,p.id,k.id,$4,$5,$6,'manual',$7
       FROM projects p JOIN keywords k ON k.project_id=p.id AND k.workspace_id=p.workspace_id
       WHERE p.workspace_id=$1 AND p.id=$2 AND k.id=$3
       RETURNING id,project_id AS "projectId",keyword_id AS "keywordId",position,
                 observed_at AS "observedAt",recorded_at AS "recordedAt",
                 source,note,recorded_by AS "recordedBy"`,
      [session.workspaceId,projectId,keywordId,position,observedAt,session.id,note]
    );
    if(!result.rows.length)return missing();
    return NextResponse.json({ranking:{...result.rows[0],provenance:{source:'manual',verified:false}}},{status:201});
  }catch(error){return responseError(error,'Unable to record manual ranking.');}
}
