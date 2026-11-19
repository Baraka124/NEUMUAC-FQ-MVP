import {test,expect} from '@playwright/test';

/** 14H150 · The original PNG remains unmodified and visually IN the header.
 * Its 1254x1254 transparent canvas is not the painted wordmark: explicitly
 * measure non-white painted pixels so invisible image edges cannot pass.
 */
test('14H150 original brand painting stays entirely within the masthead on desktop and phones',async({page})=>{
 for(const width of [320,390,760,1024,1366,1600]){
  await page.setViewportSize({width,height:900});
  await page.goto('/#/');
  const brand=page.locator('.nfq-portal-brand');
  const logo=brand.locator('img');
  await expect(logo).toBeVisible();
  await expect.poll(()=>logo.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(100);
  const bounds=await logo.evaluate((img:HTMLImageElement)=>{
   const header=img.closest('.nfq-portal-masthead')!;
   const imgBox=img.getBoundingClientRect(),headerBox=header.getBoundingClientRect(),brandBox=img.parentElement!.getBoundingClientRect();
   const canvas=document.createElement('canvas');
   canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
   const context=canvas.getContext('2d',{willReadFrequently:true})!;
   context.drawImage(img,0,0);
   const {data}=context.getImageData(0,0,canvas.width,canvas.height);
   let loX=canvas.width,loY=canvas.height,hiX=-1,hiY=-1;
   for(let y=0;y<canvas.height;y+=3)for(let x=0;x<canvas.width;x+=3){
    const p=4*(y*canvas.width+x);
    const r=data[p],g=data[p+1],b=data[p+2],a=data[p+3];
    if(a>80&&(Math.min(r,g,b)<185||Math.max(r,g,b)-Math.min(r,g,b)>36)){
     loX=Math.min(loX,x);hiX=Math.max(hiX,x);
     loY=Math.min(loY,y);hiY=Math.max(hiY,y);
    }
   }
   if(hiX<0||hiY<0)throw new Error('Original brand ink cannot be measured');
   const painted={
    left:imgBox.left+loX/canvas.width*imgBox.width,
    right:imgBox.left+hiX/canvas.width*imgBox.width,
    top:imgBox.top+loY/canvas.height*imgBox.height,
    bottom:imgBox.top+hiY/canvas.height*imgBox.height
   };
   return {header:{left:headerBox.left,right:headerBox.right,top:headerBox.top,bottom:headerBox.bottom},
    brand:{left:brandBox.left,right:brandBox.right,top:brandBox.top,bottom:brandBox.bottom},
    painted,ink:{loX,hiX,loY,hiY},natural:{width:canvas.width,height:canvas.height}};
  });
  console.log('14H150 painted brand geometry',JSON.stringify({width,...bounds}));
  expect(bounds.painted.top).toBeGreaterThanOrEqual(bounds.header.top+4);
  expect(bounds.painted.bottom).toBeLessThanOrEqual(bounds.header.bottom-3);
  // Transparent image edges are not the wordmark: ensure that the *painted*
  // tagline itself is not clipped by its cropped brand anchor frame.
  expect(bounds.painted.top).toBeGreaterThanOrEqual(bounds.brand.top+1);
  expect(bounds.painted.bottom).toBeLessThanOrEqual(bounds.brand.bottom-1);
  expect(bounds.painted.left).toBeGreaterThanOrEqual(bounds.brand.left-1);
  expect(bounds.painted.right).toBeLessThanOrEqual(bounds.brand.right+1);
  expect(bounds.painted.right-bounds.painted.left).toBeGreaterThan(width<=420?72:width<=760?98:115);
  const signIn=page.getByRole('button',{name:/Sign in/});
  await expect(signIn).toBeVisible();
  const logoMiddle=(bounds.painted.top+bounds.painted.bottom)/2;
  const buttonMiddle=await signIn.evaluate(el=>{const b=el.getBoundingClientRect();return (b.top+b.bottom)/2});
  expect(Math.abs(logoMiddle-buttonMiddle)).toBeLessThan(17);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});

test('14H150 editorial landing keeps all five tools, calm CTA and functional sign-in',async({page})=>{
 for(const width of [320,390,760,1366]){
  await page.setViewportSize({width,height:900});
  await page.goto('/#/');
  await expect(page.getByRole('heading',{name:'CFTR variant research'})).toBeVisible();
  const rows=page.locator('.nfq-portal-index-link');
  await expect(rows).toHaveCount(5);
  await expect(page.getByRole('link',{name:/Variant records/})).toHaveAttribute('href','#/variants');
  await expect(page.getByRole('link',{name:/Scientific references/})).toHaveAttribute('href','#/evidence');
  const enter=page.getByRole('link',{name:/Explore public research/});
  const b=await enter.boundingBox();
  expect(b).not.toBeNull();expect(b!.height).toBeLessThanOrEqual(47);
  expect(b!.width).toBeLessThan(260);
  const nav=page.locator('.nfq-portal-masthead');
  const headerHeight=await nav.evaluate(el=>el.getBoundingClientRect().height);
  expect(headerHeight).toBeLessThanOrEqual(116);
  const signIn=page.getByRole('button',{name:/Sign in/});
  await signIn.click();
  await expect(page.getByRole('heading',{name:'Research sign-in'})).toBeVisible();
  await page.getByRole('button',{name:/Return to research tools/}).click();
  await expect(rows).toHaveCount(5);
  await expect.poll(()=>page.locator('html').evaluate(el=>el.scrollWidth-el.clientWidth)).toBe(0);
 }
});
