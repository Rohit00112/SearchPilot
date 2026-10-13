import {NextRequest,NextResponse} from 'next/server';
import {authorize,deny} from '@/lib/auth';
import {databaseAvailable,getPool} from '@/lib/db';
import {pageLimit,responseError,ValidationError} from '@/lib/validation';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const headers={'Cache-Control':'private, no-store'};
const MIN_IMPRESSIONS=100;
const MAX_CTR_EXCLUSIVE=0.02;
const DAY_MS=86_400_000;

type Aggregate={
  query:string;
  clicks:string;
  impressions:string;
  averagePosition:string|null;
  latestDate:string;
};

function dateParam(value:string,label:string):number{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new ValidationError(`Invalid ${label} date; use YYYY-MM-DD.`);
  const parsed=Date.parse(value+'T00:00:00.000Z');
  if(!Number.isFinite(parsed)||new Date(parsed).toISOString().slice(0,10)!==value)
    throw new ValidationError(`Invalid ${label} calendar date.`);
  return parsed;
}

function propertyParam(value:string|null):string|null{
  if(value===null)return null;
  if(!value||value.length>500)throw new ValidationError('Invalid property filter.');
  if(value.startsWith('sc-domain:')){
    const domain=value.slice('sc-domain:'.length);
    if(!/^(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i.test(domain))
      throw new ValidationError('Invalid property filter.');
    return value;
  }
  try{
    const url=new URL(value);
    if(url.protocol!=='https:'||!url.hostname.includes('.')||url.username||url.password||url.hash||url.port)
      throw new Error('Invalid URL prefix');
  }catch{throw new ValidationError('Invalid property filter.');}
  return value;
}

function safeCount(value:string):number{
  const numeric=Number(value);
  // Avoid rounding large PostgreSQL bigint aggregates without warning.
  if(!Number.isSafeInteger(numeric)||numeric<0)throw new Error('GSC count exceeds safe JSON integer precision.');
  return numeric;
}

/**
 * GET /api/seo/gsc-opportunities?from=YYYY-MM-DD&to=YYYY-MM-DD&property=...&limit=25
 * Reads only locally saved Google Search Console observations; no Google API call.
 */
export async function GET(request:NextRequest){
  if(!databaseAvailable)return NextResponse.json({error:'Saved Search Console data is unavailable.'},{status:503,headers});
  try{
    const session=await authorize(request);
    if(!session)return deny();
    const params=request.nextUrl.searchParams;
    if(request.nextUrl.search.length>1024)throw new ValidationError('Query parameters are too long.');
    const keys=[...params.keys()];
    if(new Set(keys).size!==keys.length||keys.some(key=>!['from','to','property','limit','workspaceId'].includes(key)))
      throw new ValidationError('Unsupported or duplicate query parameters.');
    const fromParam=params.get('from'),toParam=params.get('to');
    if((fromParam===null)!==(toParam===null))
      throw new ValidationError('Provide both from and to, or omit both for the last 31 UTC calendar days.');
    const today=new Date().toISOString().slice(0,10);
    const to=toParam??today;
    const toMs=dateParam(to,'to');
    const from=fromParam??new Date(toMs-30*DAY_MS).toISOString().slice(0,10);
    const fromMs=dateParam(from,'from');
    if(fromMs>toMs||toMs-fromMs>30*DAY_MS||toMs>Date.parse(today+'T00:00:00.000Z'))
      throw new ValidationError('Date range must end by today and contain at most 31 calendar days, inclusive.');
    const property=propertyParam(params.get('property'));
    const limit=pageLimit(params.get('limit'),100);

    const {rows}=await getPool().query<Aggregate>(`
      SELECT query,
        SUM(clicks)::text AS clicks,
        SUM(impressions)::text AS impressions,
        (SUM(average_position::numeric * impressions) / NULLIF(SUM(impressions),0))::text AS "averagePosition",
        to_char(MAX(metric_date),'YYYY-MM-DD') AS "latestDate"
      FROM gsc_performance
      WHERE workspace_id=$1
        AND metric_date BETWEEN $2::date AND $3::date
        AND ($4::text IS NULL OR property_uri=$4)
        AND btrim(query)<>''
      GROUP BY query
      ORDER BY SUM(impressions) DESC, query COLLATE "C"
      LIMIT $5`,[session.workspaceId,from,to,property,limit+1]);

    const opportunities=rows.slice(0,limit).map(row=>{
      const clicks=safeCount(row.clicks),impressions=safeCount(row.impressions);
      const ctr=impressions===0?null:clicks/impressions;
      const averagePosition=row.averagePosition===null?null:Number(row.averagePosition);
      if(averagePosition!==null&&!Number.isFinite(averagePosition))throw new Error('Invalid saved GSC position aggregate.');
      const flagged=impressions>=MIN_IMPRESSIONS&&ctr!==null&&ctr<MAX_CTR_EXCLUSIVE;
      return {
        query:row.query,clicks,impressions,ctr,averagePosition,latestDate:row.latestDate,
        opportunity:{flag:flagged,label:flagged?'High impressions, low CTR (heuristic)':'No heuristic flag'},
      };
    });
    return NextResponse.json({
      rows:opportunities,
      filters:{from,to,property},
      page:{limit,hasMore:rows.length>limit},
      heuristic:{
        name:'high_impressions_low_ctr',
        minImpressions:MIN_IMPRESSIONS,
        ctrBelow:MAX_CTR_EXCLUSIVE,
        description:'A basic review cue: at least 100 saved impressions and CTR below 2%. It does not predict ranking gains or search demand.',
      },
      provenance:{
        sourceType:'saved_google_search_console',
        sample:false,
        live:false,
        coverage:'Only previously saved GSC query observations in the selected workspace and date/property range. Imports can be partial; no third-party search volume or keyword difficulty.',
      },
    },{headers});
  }catch(error){
    const response=responseError(error,'Unable to read saved Search Console opportunities.');
    response.headers.set('Cache-Control','private, no-store');
    return response;
  }
}
