import {test,expect} from '@playwright/test';

test('invitation fragment takes priority over Vue hash routing',async({page})=>{
 await page.goto('/#type=invite&error=access_denied');
 await expect(page.getByRole('heading',{name:'Activate your research account'})).toBeVisible();
 await expect(page).toHaveURL(/\/#\/activate$/);
 await expect(page.getByRole('alert')).toContainText('Invitation could not be verified');
});

test('non-invitation token-looking fragments never expose activation credentials',async({page})=>{
 await page.goto('/#access_token=dummy&refresh_token=dummy&type=signup');
 await expect(page.getByRole('heading',{name:'Activate your research account'})).toHaveCount(0);
});

test('password recovery is available without public registration',async({page})=>{
 await page.goto('/#/recover');
 await expect(page.getByRole('heading',{name:'Account password recovery'})).toBeVisible();
 await expect(page.getByLabel('Research email')).toBeVisible();
 await expect(page.getByRole('button',{name:'Send recovery email'})).toBeDisabled();
});
