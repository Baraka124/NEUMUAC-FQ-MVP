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
