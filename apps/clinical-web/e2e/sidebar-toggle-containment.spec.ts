import {test,expect} from '@playwright/test';

/** Visual regression of the sidebar collapse affordance. The button must be
 * fully inside the rail: a negative right offset gets clipped by sticky
 * scrolling and overlapped by the higher-z-index content header.
 */
test('sidebar toggle is contained, unobscured and usable in both rail states',async({page})=>{
 for(const width of [768,1024,1366]){
  await page.setViewportSize({width,height:850});
  await page.goto('/#/workspace');
  await page.evaluate(()=>localStorage.removeItem('nfq-sidebar-collapsed-v1'));
  await page.reload();
  const sidebar=page.locator('.sidebar');
  const toggle=sidebar.locator('.sidebar-toggle');
  const mark=sidebar.locator('.wordmark-icon');
  const firstLink=page.getByRole('navigation',{name:'Workspaces'}).locator('a').first();
  for(const collapsed of [false,true]){
   await expect(toggle).toBeVisible();
   await expect(toggle).toHaveAttribute('aria-label',collapsed?'Expand sidebar':'Collapse sidebar');
   const rect=await page.evaluate(()=>{
    const side=document.querySelector<HTMLElement>('.app-frame .sidebar')!;
    const control=side.querySelector<HTMLButtonElement>('.sidebar-toggle')!;
    const rect=side.getBoundingClientRect(),r=control.getBoundingClientRect();
    const centerX=r.x+r.width/2,centerY=r.y+r.height/2;
    const top=document.elementFromPoint(centerX,centerY);
    return {
     sideLeft:rect.left,sideRight:rect.right,
     left:r.left,right:r.right,top:r.top,bottom:r.bottom,
     width:r.width,height:r.height,
     hittable:control===top||control.contains(top),
     overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
    };
   });
   expect(rect.left).toBeGreaterThanOrEqual(rect.sideLeft);
   expect(rect.right).toBeLessThanOrEqual(rect.sideRight);
   expect(rect.width).toBeGreaterThanOrEqual(26);
   expect(rect.width).toBeLessThanOrEqual(30);
   expect(rect.height).toBeGreaterThanOrEqual(26);
   expect(rect.height).toBeLessThanOrEqual(30);
   expect(rect.hittable).toBe(true);
   expect(rect.overflow).toBe(0);
   const icon=await mark.boundingBox(),nav=await firstLink.boundingBox();
   expect(icon).not.toBeNull();
   expect(nav).not.toBeNull();
   // A non-overlapping bounding box alone is insufficient: earlier versions
   // showed the actual logo and collapse button nearly touching/occluding
   // each other in the narrow rail. The two elements now have a real layout gap.
   const brand=await sidebar.locator('.nfq-sidebar-brand-row>.wordmark').boundingBox();
   const control=await toggle.boundingBox();
   expect(brand).not.toBeNull();
   expect(control).not.toBeNull();
   await expect(toggle).toHaveCSS('position','static');
   if(collapsed){
    expect(control!.y-(brand!.y+brand!.height)).toBeGreaterThanOrEqual(10);
    expect(nav!.y-(control!.y+control!.height)).toBeGreaterThanOrEqual(8);
    const centerX=control!.x+control!.width/2;
    expect(Math.abs(centerX-(rect.sideLeft+rect.sideRight)/2)).toBeLessThanOrEqual(3);
   }else{
    expect(control!.x-(brand!.x+brand!.width)).toBeGreaterThanOrEqual(6);
   }
   // Actual brand artwork and navigation must not be covered by the toggle.
   const overlaps=(other:{x:number,y:number,width:number,height:number})=>
    rect.left<other.x+other.width&&rect.right>other.x&&
    rect.top<other.y+other.height&&rect.bottom>other.y;
   expect(overlaps(icon!)).toBe(false);
   expect(overlaps(nav!)).toBe(false);
   await toggle.click();
   await expect(page.locator('.app-frame')).toHaveClass(collapsed?/^(?!.*sidebar-collapsed)/:/sidebar-collapsed/);
  }
 }
});
test('mobile layout has no detached desktop sidebar toggle',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/#/workspace');
 await expect(page.locator('.sidebar-toggle')).toBeHidden();
 await expect(page.getByRole('button',{name:'Workspaces',exact:true})).toBeVisible();
});
