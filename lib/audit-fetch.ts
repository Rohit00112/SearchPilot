import {lookup} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {isIP} from 'node:net';
import type {TLSSocket} from 'node:tls';

const MAX_BYTES=256*1024;
const TIMEOUT_MS=8_000;
const MAX_RECORDS=16;
export class AuditFetchError extends Error {}

// Deliberately IPv4-only for this phase. AAAA-only domains fail closed.
// Reject non-globally-routable/special IPv4 ranges, including benchmarking,
// documentation, CGNAT, link-local, multicast and reserved allocations.
export function isPublicIPv4(address:string):boolean{
  if(isIP(address)!==4)return false;
  const n=address.split('.').map(Number);
  const [a,b,c]=n;
  if(a===0||a===10||a===127||a>=224)return false;
  if(a===100&&b>=64&&b<=127)return false;
  if(a===169&&b===254)return false;
  if(a===172&&b>=16&&b<=31)return false;
  if(a===192&&(b===168||b===0||b===88&&c===99||b===0&&c===2))return false;
  if(a===198&&(b===18||b===19||b===51&&c===100))return false;
  if(a===203&&b===0&&c===113)return false;
  return true;
}

// Single DNS resolution followed by a connection pinned to one of those
// already-approved addresses. HTTPS keeps the actual hostname for Host, SNI,
// and certificate hostname verification. No proxy, redirects or content
// decompression. Re-resolution by a different HTTP stack cannot occur.
export async function fetchAuditHtml(domain:string):Promise<{html:string;status:number}>{
  if(!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))
    throw new AuditFetchError('Enter a valid public domain.');
  let records:{address:string;family:number}[];
  try{records=await lookup(domain,{family:4,all:true,verbatim:true})}
  catch{throw new AuditFetchError('Domain has no reachable public IPv4 address.')}
  if(!Array.isArray(records)||!records.length||records.length>MAX_RECORDS||
    records.some(record=>!isPublicIPv4(record.address)))
    throw new AuditFetchError('Domain must resolve exclusively to public IPv4 addresses.');
  const pinned=records[0].address;
  return new Promise((resolve,reject)=>{
    let finished=false;
    const fail=(message:string)=>{
      if(finished)return;
      finished=true;
      outgoing.destroy();
      reject(new AuditFetchError(message));
    };
    const outgoing=httpsRequest({
      hostname:domain,servername:domain,port:443,path:'/',method:'GET',
      agent:false,rejectUnauthorized:true,timeout:TIMEOUT_MS,
      signal:AbortSignal.timeout(TIMEOUT_MS),
      maxHeaderSize:16*1024,
      lookup:(host,_options,callback)=>{
        if(host!==domain){callback(new Error('Unexpected DNS lookup host.'),'',4);return}
        callback(null,pinned,4);
      },
      headers:{
        'user-agent':'SearchPilotSiteAudit/1.0 (bounded public homepage)',
        'accept':'text/html',
        'accept-encoding':'identity',
        'connection':'close'
      }
    },response=>{
      const status=response.statusCode||0;
      if(status>=300&&status<400){fail('Redirects are not followed by the site audit.');return}
      if(status<200||status>=300){fail('Homepage returned HTTP '+status+'.');return}
      const contentType=response.headers['content-type']||'';
      if(typeof contentType!=='string'||!/^text\/html(?:\s*;|$)/i.test(contentType)){
        fail('Homepage did not return HTML.');return;
      }
      const encoding=response.headers['content-encoding'];
      if(encoding&&encoding!=='identity'){fail('Compressed responses are unsupported.');return}
      const advertised=response.headers['content-length'];
      if(advertised&&(!/^\d+$/.test(String(advertised))||Number(advertised)>MAX_BYTES)){
        fail('Homepage exceeds the 256 KiB audit limit.');return;
      }
      void (async()=>{
        const chunks:Buffer[]=[];let size=0;
        for await(const part of response){
          const chunk=Buffer.isBuffer(part)?part:Buffer.from(part as Uint8Array);
          size+=chunk.length;
          if(size>MAX_BYTES)throw new AuditFetchError('Homepage exceeds the 256 KiB audit limit.');
          chunks.push(chunk);
        }
        if(finished)return;
        finished=true;
        resolve({html:Buffer.concat(chunks).toString('utf8'),status});
      })().catch(error=>fail(error instanceof AuditFetchError?error.message:'Unable to read the homepage.'));
    });
    outgoing.on('socket',socket=>{
      socket.once('secureConnect',()=>{
        if(socket.remoteAddress!==pinned||!(socket as TLSSocket).authorized)
          fail('HTTPS peer did not match the validated public address.');
      });
    });
    outgoing.on('timeout',()=>fail('Site audit timed out.'));
    outgoing.on('error',()=>fail('Secure connection to the homepage failed.'));
    outgoing.setTimeout(TIMEOUT_MS);
    outgoing.end();
  });
}
