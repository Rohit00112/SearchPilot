import pg from 'pg';
import {randomUUID} from 'node:crypto';
// Explicit worker, no automatic network. HTTP crawling is not supported in this
// wave because robust pinned DNS + robots rules + scoped redirect-safe fetching
// for all pages needs a separate security review. Never manufacture page scores.
export async function runOne({databaseUrl=process.env.DATABASE_URL,networkEnabled=false}={}){
 if(!databaseUrl)throw Error('DATABASE_URL required for crawl worker.');
 if(networkEnabled)throw Error('Network crawling is disabled pending egress and robots compliance review.');
 const client=new pg.Client({connectionString:databaseUrl});
 await client.connect();
 try{
   // Inspect only, without claiming a job or altering its status.
   const {rows}=await client.query(
     "SELECT id,workspace_id AS \"workspaceId\",project_id AS \"projectId\",root_host AS \"rootHost\",max_pages AS \"maxPages\",max_depth AS \"maxDepth\",created_at AS \"createdAt\" FROM seo_crawl_jobs WHERE status='queued' ORDER BY created_at LIMIT 10"
   );
   return {mode:'inspection_only',networkEnabled:false,queued:rows,processed:0,
     reason:'Jobs remain queued until a robots-aware DNS-pinned multi-page worker is configured and reviewed.'};
 }finally{await client.end()}
}
