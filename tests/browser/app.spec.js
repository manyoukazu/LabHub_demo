import {test,expect} from '@playwright/test';

test('node positions survive reload and stay separate between demo and shared mode',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/ideas',route=>route.fulfill({json:[{id:'s1',title:'Shared node',kind:'spark',body:'',author:'',tags:[],related:[],source:'',updated_at:'2026-11-07'}]}));
 await page.goto('/');
 const node=page.locator('.graph-node[data-id=s1]');
 await expect(node).toBeVisible();
 const initial=await node.getAttribute('transform');
 await page.locator('#zoom-in').click();
 const box=await node.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();await page.mouse.move(box.x+box.width/2+65,box.y+box.height/2+40,{steps:8});await page.mouse.up();
 const moved=await node.getAttribute('transform');expect(moved).not.toBe(initial);
 await page.reload();await expect(node).toHaveAttribute('transform',moved);
 const point=moved.match(/translate\(([^,]+),([^\)]+)\)/).slice(1);
 const edge=page.locator('.edge[data-a=s1],.edge[data-b=s1]').first();
 const side=await edge.getAttribute('data-a')==='s1'?'1':'2';
 await expect(edge).toHaveAttribute('x'+side,point[0]);await expect(edge).toHaveAttribute('y'+side,point[1]);
 await page.locator('#settings').click();await page.locator('#token').fill('local-development-key');await page.locator('#connect').click();
 await expect(page.locator('#settings-dialog')).not.toBeVisible();await expect(node).toHaveAttribute('transform',initial);
 const sharedBox=await node.boundingBox();
 await page.mouse.move(sharedBox.x+sharedBox.width/2,sharedBox.y+sharedBox.height/2);
 await page.mouse.down();await page.mouse.move(sharedBox.x+sharedBox.width/2-60,sharedBox.y+sharedBox.height/2-30,{steps:8});await page.mouse.up();
 const sharedMoved=await node.getAttribute('transform');expect(sharedMoved).not.toBe(initial);
 await page.locator('#settings').click();await page.locator('#demo-mode').click();await expect(node).toHaveAttribute('transform',moved);
 await page.reload();await expect(node).toHaveAttribute('transform',moved);
 await page.locator('#settings').click();await page.locator('#token').fill('local-development-key');await page.locator('#connect').click();await expect(node).toHaveAttribute('transform',sharedMoved);
 expect(errors).toEqual([]);
});

test('invalid saved positions fall back to the initial layout',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('labhub-node-positions-v1-demo',JSON.stringify([null,['s1',['bad',90]],['l1',[200,180]]])));
 await page.goto('/');await expect(page.locator('.graph-node[data-id=s1]')).toHaveAttribute('transform','translate(490,290)');await expect(page.locator('.graph-node[data-id=l1]')).toHaveAttribute('transform','translate(200,180)');
});
test('production starts without sample data and requires the shared key',async({page})=>{
 await page.route('**/api/config',route=>route.fulfill({json:{allowDemo:false}}));
 await page.goto('/');await expect(page.locator('#settings-dialog')).toBeVisible();
 await expect(page.locator('#demo-mode')).toBeHidden();await expect(page.locator('.graph-node')).toHaveCount(0);await expect(page.locator('#add')).toBeDisabled();
 await page.locator('#token').fill('wrong-key');await page.locator('#connect').click();await expect(page.locator('#toast')).toContainText('アクセスキー');await expect(page.locator('#settings-dialog')).toBeVisible();
 await page.locator('#token').fill('local-development-key');await page.locator('#connect').click();await expect(page.locator('#settings-dialog')).not.toBeVisible();await expect(page.locator('#add')).toBeEnabled();await expect(page.locator('.graph-node')).toHaveCount(0);
});
test('demo capture, edit, search, favorite, export and persistence',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.locator('.graph-node')).toHaveCount(11);
 await page.locator('#add').click();await page.locator('[name=title]').fill('ブラウザ検証のアイデア');await page.locator('[name=body]').fill('発言を記録して、後からつなぐ。');await page.locator('[name=tags]').fill('テスト, 知識共有');await page.locator('#idea-form [type=submit]').click();
 await expect(page.locator('#detail h2')).toHaveText('ブラウザ検証のアイデア');await expect(page.locator('#total')).toHaveText('12');
 await page.reload();await expect(page.locator('#total')).toHaveText('12');await page.locator('#search').fill('ブラウザ検証');await expect(page.locator('.graph-node')).toHaveCount(1);
 await page.locator('#edit-source').click();await expect(page.locator('[name=source]')).toBeFocused();await page.locator('[name=source]').fill('https://example.com/research');await page.locator('[name=title]').fill('検証済みアイデア');await page.locator('#idea-form [type=submit]').click();await expect(page.locator('#detail h2')).toHaveText('検証済みアイデア');await expect(page.locator('.source-link')).toHaveAttribute('href','https://example.com/research');
 await page.locator('#favorite').click();await page.locator('.view-tabs [data-view=favorites]').click();await expect(page.locator('.idea-card')).toHaveCount(1);
 const download=page.waitForEvent('download');await page.locator('#export').click();expect((await download).suggestedFilename()).toMatch(/labhub-.*\.json/);
 page.once('dialog',d=>d.accept());await page.locator('#delete').click();await expect(page.locator('#total')).toHaveText('11');expect(errors).toEqual([]);
});
test('graph interactions, filters, and mobile layout',async({page})=>{
 await page.goto('/');await page.locator('.graph-node[data-id=l1]').click();await expect(page.locator('#detail h2')).toContainText('発想支援');await page.locator('#zoom-in').click();await expect(page.locator('#zoom-reset')).toHaveText('110%');await page.locator('#zoom-reset').click();
 await page.locator('[data-kind=spark]').click();await expect(page.locator('.graph-node')).toHaveCount(6);
 await page.setViewportSize({width:390,height:844});await expect(page.locator('#add')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'test-results/mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1040});await page.locator('[data-kind=spark]').click();await page.locator('.graph-node[data-id=s1]').click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'test-results/desktop.png',fullPage:true});
});
test('local D1 API is protected and shared data survives a new browser context',async({page,request})=>{
 expect((await request.get('/api/ideas')).status()).toBe(401);
 const headers={Authorization:'Bearer local-development-key'};const result=await request.post('/api/ideas',{headers,data:{title:'D1 integration test',kind:'spark',body:'Temporary test record',author:'test',tags:[],source:'',related:[]}});expect(result.status()).toBe(201);const {id}=await result.json();
 try {
  await page.goto('/');await page.locator('#settings').click();await page.locator('#token').fill('local-development-key');await page.locator('#connect').click();await expect(page.locator('#settings-dialog')).not.toBeVisible();
  await page.locator('#search').fill('D1 integration test');await expect(page.locator('#detail h2')).toHaveText('D1 integration test');
  await page.locator('#edit').click();await page.locator('[name=body]').fill('Updated in browser');await page.locator('#idea-form [type=submit]').click();await expect(page.locator('.detail-body')).toHaveText('Updated in browser');
  await page.reload();await expect(page.locator('.graph-node')).toHaveCount(11);
  const list=await (await request.get('/api/ideas',{headers})).json();expect(list.find(v=>v.id===id)?.body).toBe('Updated in browser');
 } finally {await request.delete('/api/ideas/'+id,{headers});}
});
