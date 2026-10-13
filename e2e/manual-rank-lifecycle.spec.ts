import {expect,test,type Page,type Route} from '@playwright/test';

// Browser lifecycle coverage uses intercepted API responses and never touches a database.
const first='11111111-1111-4111-8111-111111111111';
const second='22222222-2222-4222-8222-222222222222';
const alpha='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const beta='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const gamma='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const projects=[
 {id:first,name:'First QA project',domain:'first.example.test',createdAt:'2026-01-01T00:00:00.000Z'},
 {id:second,name:'Second QA project',domain:'second.example.test',createdAt:'2026-01-02T00:00:00.000Z'},
];
const keywords=[
 {id:alpha,projectId:first,keyword:'keyword alpha',position:11,volume:0,difficulty:40,createdAt:'2026-01-01T00:00:00.000Z'},
 {id:beta,projectId:first,keyword:'keyword beta',position:12,volume:0,difficulty:60,createdAt:'2026-01-01T00:00:00.000Z'},
 {id:gamma,projectId:second,keyword:'keyword gamma',position:3,volume:0,difficulty:20,createdAt:'2026-01-01T00:00:00.000Z'},
];
const observed=(id:string,keywordId:string,keyword:string,position:number,day:number)=>({
 id,keywordId,keyword,position,observedAt:`2026-10-${String(day).padStart(2,'0')}T12:00:00.000Z`,source:'manual',note:null,
});
const a=observed('11111111-aaaa-4111-8111-111111111111',alpha,'keyword alpha',7,12);
const b=observed('22222222-bbbb-4222-8222-222222222222',beta,'keyword beta',19,11);
const older=observed('33333333-cccc-4333-8333-333333333333',alpha,'keyword alpha',17,10);
const other=observed('44444444-dddd-4444-8444-444444444444',gamma,'keyword gamma',3,12);

function respond(route:Route,body:unknown,status=200){
 return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
}

async function mockWorkspace(page:Page,ranking:(route:Route,url:URL)=>Promise<void>){
 await page.route('**/api/**',async route=>{
  const request=route.request();
  const url=new URL(request.url());
  if(url.pathname==='/api/rankings')return ranking(route,url);
  if(url.pathname==='/api/projects')return respond(route,{projects,demo:false});
  if(url.pathname==='/api/keywords')return respond(route,{keywords,demo:false});
  if(url.pathname==='/api/auth/me')return respond(route,{user:{id:first,name:'QA User',role:'owner'}});
  if(url.pathname==='/api/audit')return respond(route,{audits:[]});
  if(url.pathname==='/api/integrations/gsc/performance')return respond(route,{rows:[]});
  return respond(route,{});
 });
}

test('manual observations remain selectable despite portfolio filters; older pages append once',async({page})=>{
 let olderRequests=0;
 await mockWorkspace(page,async(route,url)=>{
  if(url.searchParams.has('cursor')){
   olderRequests++;
   await respond(route,{rankings:[b,older],page:{hasMore:false,nextCursor:null},provenance:{source:'manual',verified:false}});
   return;
  }
  await respond(route,{rankings:[a,b],page:{hasMore:true,nextCursor:'older-page'},provenance:{source:'manual',verified:false}});
 });
 await page.goto('/position-tracking');
 const history=page.getByRole('region',{name:'Manual ranking observations'});
 const select=page.getByRole('combobox',{name:'Tracked keyword'});
 await expect(history.locator('tbody tr')).toHaveCount(1);
 await page.getByRole('textbox',{name:'Filter keywords'}).fill('keyword alpha');
 await expect(select.locator('option')).toHaveCount(3); // All + both project keywords
 await select.selectOption(beta);
 await expect(history.locator('tbody tr')).toHaveCount(1);
 await expect(history).toContainText('keyword beta');
 await page.getByRole('textbox',{name:'Filter keywords'}).fill('nothing-matches');
 await expect(select).toHaveValue(beta);
 await expect(history).toContainText('keyword beta');
 await select.selectOption('');
 await page.getByRole('button',{name:'Load older observations'}).click();
 await expect(history.locator('tbody tr')).toHaveCount(3);
 await expect(history).toContainText('17');
 await expect(page.getByText('Loaded 3 manually entered observations')).toBeVisible();
 expect(olderRequests).toBe(1);
});

test('late response for a previous project never replaces current ranking history',async({page})=>{
 await mockWorkspace(page,async(route,url)=>{
  if(url.searchParams.get('projectId')===first){
   await new Promise(resolve=>setTimeout(resolve,550));
   await respond(route,{rankings:[a],page:{hasMore:false,nextCursor:null},provenance:{source:'manual',verified:false}}).catch(()=>{});
   return;
  }
  await respond(route,{rankings:[other],page:{hasMore:false,nextCursor:null},provenance:{source:'manual',verified:false}});
 });
 await page.goto('/position-tracking');
 const project=page.locator('#workspace-project-select');
 await expect(project.locator('option')).toHaveCount(2);
 await expect(page.getByRole('heading',{name:'Recorded ranking history'})).toBeVisible();
 await project.selectOption(second);
 const history=page.getByRole('region',{name:'Manual ranking observations'});
 await expect(history).toContainText('keyword gamma');
 await page.waitForTimeout(650);
 await expect(history).not.toContainText('keyword alpha');
 await expect(page.getByRole('combobox',{name:'Tracked keyword'})).toHaveValue(gamma);
});
