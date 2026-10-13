import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export function gscConfig() {
  const id=process.env.GOOGLE_CLIENT_ID, secret=process.env.GOOGLE_CLIENT_SECRET, origin=process.env.APP_ORIGIN;
  if(!id || !secret || !origin || !process.env.GSC_ENCRYPTION_KEY) throw new Error("Google Search Console OAuth is not configured.");
  const key=Buffer.from(process.env.GSC_ENCRYPTION_KEY,"hex");
  if(key.length!==32) throw new Error("GSC_ENCRYPTION_KEY must contain 32 bytes as hex.");
  return {id,secret,key,redirect:new URL("/api/integrations/gsc/callback",origin).toString()};
}
export function encrypt(value:string) {
  const {key}=gscConfig(),iv=randomBytes(12),c=createCipheriv("aes-256-gcm",key,iv);
  const data=Buffer.concat([c.update(value,"utf8"),c.final()]);
  return Buffer.concat([iv,c.getAuthTag(),data]).toString("base64url");
}
export function decrypt(value:string) {
  const {key}=gscConfig(),buf=Buffer.from(value,"base64url");
  const d=createDecipheriv("aes-256-gcm",key,buf.subarray(0,12));
  d.setAuthTag(buf.subarray(12,28));
  return Buffer.concat([d.update(buf.subarray(28)),d.final()]).toString("utf8");
}
export const digest=(value:string)=>createHash("sha256").update(value).digest("hex");
export const challenge=(value:string)=>createHash("sha256").update(value).digest("base64url");
export async function getAccessToken(refreshToken:string) {
  const {id,secret}=gscConfig();
  const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:id,client_secret:secret,refresh_token:refreshToken,grant_type:"refresh_token"}),signal:AbortSignal.timeout(10000),cache:"no-store"});
  if(!res.ok) throw new Error("Google connection expired or permission was revoked.");
  const token=await res.json();
  if(typeof token.access_token!=="string") throw new Error("Google did not return an access token.");
  return token.access_token as string;
}
