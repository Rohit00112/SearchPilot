import {test,expect,loginIfConfigured} from './helpers';

test('Saved GSC opportunities CSV is scoped, labelled and spreadsheet-safe',async({page})=>{
  test.skip(!process.env.SEARCHPILOT_E2E_EMAIL,'Requires an isolated QA account');
  await loginIfConfigured(page);
  await page.route('**/api/seo/gsc-opportunities?**',async route=>{
    const request=new URL(route.request().url());
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      rows:[{query:'=HYPERLINK("https://example.test")',clicks:4,impressions:250,ctr:.016,averagePosition:8.2,latestDate:'2026-10-09',opportunity:{flag:true,label:'High impressions, low CTR (heuristic)'}}],
      filters:{from:request.searchParams.get('from'),to:request.searchParams.get('to'),property:request.searchParams.get('property')},
      page:{limit:100,hasMore:true},
      heuristic:{name:'high_impressions_low_ctr',description:'Review cue, not a prediction.'},
      provenance:{sourceType:'saved_google_search_console',sample:false,live:false,coverage:'Saved records only.'},
    })});
  });
  await page.goto('/opportunities');
  await expect(page.getByText('More results may be available',{exact:false})).toBeVisible();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export displayed CSV'}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^searchpilot-gsc-opportunities-\d{4}-\d\d-\d\d-\d{4}-\d\d-\d\d\.csv$/);
  const stream=await download.createReadStream();
  const chunks:Buffer[]=[];
  for await (const chunk of stream)chunks.push(Buffer.from(chunk));
  const csv=Buffer.concat(chunks).toString('utf8');
  expect(csv).toContain('saved_google_search_console');
  expect(csv).toContain('High impressions, low CTR (heuristic)');
  expect(csv).toContain('"\'=HYPERLINK(""https://example.test"")"');
  expect(csv).toContain('"(all properties)"');
});
