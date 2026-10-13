#!/usr/bin/env node
// Explicit operator entry point: node scripts/crawl-worker.mjs
// This inspects queued crawl jobs, performs NO outbound fetches, and leaves
// statuses queued. This is intentionally honest about unavailable execution.
// Multi-page crawling is NOT production enabled; do not schedule this as a
// successful processor. Safety review must precede any network-enabled mode.
import {runOne} from '../lib/crawl-worker.mjs';
try{
  const result=await runOne({networkEnabled:process.argv.includes('--network')});
  console.log(JSON.stringify(result,null,2));
}catch(error){
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
}
