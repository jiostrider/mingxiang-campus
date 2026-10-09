import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.CAMPUS_TEST_URL||'https://jiostrider.github.io/mingxiang-campus/';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],failures=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
await mkdir('artifacts/published',{recursive:true});
try{
  await page.goto(url,{waitUntil:'networkidle',timeout:180000});
  await page.waitForFunction(()=>window.campus?.ready,null,{timeout:180000});
  await page.locator('#start').click();
  const before=await page.evaluate(()=>campus.getState());
  await page.keyboard.down('w');await page.waitForTimeout(1500);await page.keyboard.up('w');
  const after=await page.evaluate(()=>campus.getState());
  assert(after.position[2]>before.position[2]+1,'Walking must work');
  await page.locator('#map-button').click();await page.locator('[data-go="library"]').click();
  assert((await page.evaluate(()=>campus.getState())).position[2]>0,'Library teleport must work');
  assert.equal(errors.length,0,errors.join('\n'));assert.equal(failures.length,0,JSON.stringify(failures));
  await page.screenshot({path:'artifacts/published/online.png'});
  await writeFile('artifacts/published/results.json',JSON.stringify({passed:true,url,checks:['scene ready','walk','library teleport','no missing resources or page errors'],errors,failures},null,2));
  console.log('Published build passed: '+url);
}finally{await browser.close();}
