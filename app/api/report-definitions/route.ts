import {NextRequest,NextResponse} from 'next/server';
import {authorize,csrf,deny,forbidden} from '@/lib/auth';
import {databaseAvailable,getPool} from '@/lib/db';
import {jsonBody,uuid,textField,responseError,ValidationError} from '@/lib/validation';
export const runtime='nodejs';

const accepted=['overview','keywords','audit','manual_rankings','notes'] as const;
type Block=typeof accepted[number];
function blocks(value:unknown):Block[] {
  if(!Array.isArray(value)||!value.length||value.length>5||value.some(x=>!accepted.includes(x as Block))||new Set(value).size!==value.length)
    throw new ValidationError('Choose one to five unique report sections.');
  return value as Block[];
}
function missing(){return NextResponse.json({error:'Report not found.'},{status:404});}
function unavailable(){return NextResponse.json({error:'Report definitions require a configured PostgreSQL database.'},{status:503});}

export async function GET(request:NextRequest){
  if(!databaseAvailable)return unavailable();
  try{
    const session=await authorize(request);if(!session)return deny();
    const projectId=request.nextUrl.searchParams.get('projectId');
    const id=request.nextUrl.searchParams.get('id');
    const pool=getPool();
    if(id){
      const valid=uuid(id,'report ID');
      const result=await pool.query('SELECT id,project_id AS "projectId",title,blocks,created_at AS "createdAt",updated_at AS "updatedAt" FROM report_definitions WHERE workspace_id=$1 AND id=$2',[session.workspaceId,valid]);
      return result.rows.length?NextResponse.json({report:result.rows[0]}):missing();
    }
    const project=uuid(projectId,'project ID');
    const owned=await pool.query('SELECT 1 FROM projects WHERE workspace_id=$1 AND id=$2',[session.workspaceId,project]);
    if(!owned.rows.length)return missing();
    const result=await pool.query('SELECT id,project_id AS "projectId",title,blocks,created_at AS "createdAt",updated_at AS "updatedAt" FROM report_definitions WHERE workspace_id=$1 AND project_id=$2 ORDER BY updated_at DESC LIMIT 100',[session.workspaceId,project]);
    return NextResponse.json({reports:result.rows});
  }catch(error){return responseError(error,'Unable to load reports.');}
}
export async function POST(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return unavailable();
  try{
    const user=await authorize(request,'editor');if(!user)return forbidden();
    const body=await jsonBody(request);
    const projectId=uuid(body.projectId,'project ID'),title=textField(body.title,'Report title',160),sections=blocks(body.blocks);
    const result=await getPool().query(`INSERT INTO report_definitions(workspace_id,project_id,created_by,title,blocks)
      SELECT p.workspace_id,p.id,$3,$4,$5::jsonb FROM projects p WHERE p.workspace_id=$1 AND p.id=$2
      RETURNING id,project_id AS "projectId",title,blocks,created_at AS "createdAt",updated_at AS "updatedAt"`,
      [user.workspaceId,projectId,user.id,title,JSON.stringify(sections)]);
    return result.rows.length?NextResponse.json({report:result.rows[0]},{status:201}):missing();
  }catch(error){return responseError(error,'Unable to create report.');}
}
export async function PATCH(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return unavailable();
  try{
    const user=await authorize(request,'editor');if(!user)return forbidden();
    const id=uuid(request.nextUrl.searchParams.get('id'),'report ID'),body=await jsonBody(request);
    const title=body.title===undefined?null:textField(body.title,'Report title',160);
    const sections=body.blocks===undefined?null:blocks(body.blocks);
    if(title===null&&sections===null)throw new ValidationError('Provide report changes.');
    const result=await getPool().query(`UPDATE report_definitions SET title=COALESCE($3,title),blocks=COALESCE($4::jsonb,blocks),updated_at=now()
      WHERE workspace_id=$1 AND id=$2 RETURNING id,project_id AS "projectId",title,blocks,created_at AS "createdAt",updated_at AS "updatedAt"`,
      [user.workspaceId,id,title,sections?JSON.stringify(sections):null]);
    return result.rows.length?NextResponse.json({report:result.rows[0]}):missing();
  }catch(error){return responseError(error,'Unable to update report.');}
}
export async function DELETE(request:NextRequest){
  const blocked=csrf(request);if(blocked)return blocked;
  if(!databaseAvailable)return unavailable();
  try{
    const user=await authorize(request,'editor');if(!user)return forbidden();
    const id=uuid(request.nextUrl.searchParams.get('id'),'report ID');
    const result=await getPool().query('DELETE FROM report_definitions WHERE workspace_id=$1 AND id=$2 RETURNING id',[user.workspaceId,id]);
    return result.rows.length?NextResponse.json({deleted:true}):missing();
  }catch(error){return responseError(error,'Unable to delete report.');}
}
