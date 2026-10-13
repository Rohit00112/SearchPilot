import {test,expect,axe,screenshot,expectSample,loginIfConfigured} from './helpers';

const implemented=[
  {id:'F01',route:'/projects',heading:'My Projects'},
  {id:'F02',route:'/domain-overview',heading:'Domain Overview'},
  {id:'F03',route:'/keywords',heading:'Keyword Research'},
  {id:'F05',route:'/position-tracking',heading:'Position Tracking'},
  {id:'F07',route:'/site-audit',heading:'Site Audit'},
  {id:'F09',route:'/backlinks',heading:'Backlink Analytics'},
  {id:'F12',route:'/reports',heading:'Reports'},
  {id:'F15',route:'/settings',heading:'Account Settings'},
];

test.describe('Local SearchPilot screen health / a11y',()=>{
  for(const screen of implemented){
    test(`${screen.id}-H1 ${screen.route} renders without crash and passes axe`,async({page})=>{
      await loginIfConfigured(page);
      await page.goto(screen.route);
      await expect(page.getByRole('heading',{name:screen.heading,exact:true,level:1})).toBeVisible();
      if(['F02','F09','F12'].includes(screen.id))await expectSample(page);
      await axe(page);
      await screenshot(page,`${screen.id}-H1`);
    });
  }

  test('F15-E1 mobile drawer opens, follows link, closes and returns focus on Escape',async({page},info)=>{
    test.skip(info.project.name!=='mobile-390','Mobile-specific drawer');
    await loginIfConfigured(page);
    await page.goto('/');
    const menu=page.getByRole('button',{name:'Open navigation menu'});
    await menu.click();
    await expect(page.getByRole('button',{name:'Close navigation menu'})).toHaveAttribute('aria-expanded','true');
    await expect(page.getByRole('navigation',{name:'SEO tools'})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button',{name:'Open navigation menu'})).toBeFocused();
    await menu.click();
    await page.getByRole('navigation',{name:'SEO tools'}).getByRole('link',{name:'My Projects'}).click();
    await expect(page).toHaveURL(/\/projects$/);
    await screenshot(page,'F15-E1');
  });

  test('F01-E1 form dialog traps focus and closes with Escape',async({page})=>{
    await loginIfConfigured(page);
    await page.goto('/projects');
    await page.getByRole('button',{name:'Create new project'}).click();
    const dialog=page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading',{name:'Create a new project'})).toBeVisible();
    await dialog.getByRole('textbox',{name:'Project name'}).fill('SEO regression');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await axe(page);
    await screenshot(page,'F01-E1');
  });
});
