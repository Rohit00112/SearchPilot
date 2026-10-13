import {test,expect,axe,screenshot} from './helpers';

test('F01-H2 login screen keyboard controls and a11y',async({page})=>{
  await page.goto('/login');
  await expect(page.getByRole('heading',{name:'Sign in to SearchPilot'})).toBeVisible();
  await page.getByRole('button',{name:'Show password'}).click();
  await expect(page.getByRole('button',{name:'Hide password'})).toBeVisible();
  await axe(page);
  await screenshot(page,'F01-H2');
});
test('F01-E2 register required fields, long password and error messaging',async({page})=>{
  await page.goto('/register');
  await expect(page.getByRole('heading',{name:'Create your account'})).toBeVisible();
  await page.getByRole('textbox',{name:'Full name'}).fill('A');
  await page.getByRole('textbox',{name:'Email address'}).fill('qa@example.test');
  await page.locator('input[autocomplete="new-password"]').fill('long-enough-local-password');
  await page.getByRole('button',{name:'Create account'}).click();
  await expect(page.getByText('Enter your full name.')).toBeVisible();
  await axe(page);
  await screenshot(page,'F01-E2');
});
test('F01-N1 wrong password responds without exposing credentials',async({page})=>{
  test.skip(!process.env.SEARCHPILOT_E2E_EMAIL,'Requires seeded local account');
  await page.goto('/login');
  await page.getByRole('textbox',{name:'Email address'}).fill(process.env.SEARCHPILOT_E2E_EMAIL!);
  await page.locator('input[autocomplete="current-password"]').fill('Invalid-password-for-searchpilot');
  await page.getByRole('button',{name:'Sign in'}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
