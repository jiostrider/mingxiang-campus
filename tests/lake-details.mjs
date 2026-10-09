import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const output='artifacts/lake-details';await mkdir(output,{recursive:true});
const checks=[],errors=[],video=await readFile('references/user-recordings/20261008-1410-05.7911838.mp4');
assert.equal(createHash('sha256').update(video).digest('hex'),'4cef31ac75945f5c77a5c0041e1a610bb74793d02d0ddf3de8920ae24bcc88dc');checks.push({name:'reference video preserved unchanged',passed:true,bytes:video.length});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>campus.getState());
try{
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>window.campus?.ready||!document.querySelector('#fatal').hidden,null,{timeout:120000});assert(await page.evaluate(()=>!!campus?.ready));
  await page.locator('#map-button').click();await page.locator('[data-go="datong"]').click();assert.equal((await state()).position[2],152);
  const spatial=await page.evaluate(async()=>{
    const {lakeDetails, lakeDetailFloorHeight}=await import('/src/lake-details.js');
    return {arch:lakeDetails.arch,blockedCenter:Array.from({length:89},(_,i)=>[0,138+i*.5]).filter(([x,z])=>campus.blocked(x,z,.38)),railsBlocked:[[-17,172],[17,172],[0,184]].every(([x,z])=>campus.blocked(x,z,.4)),waterBlocked:campus.blocked(0,190,.4)&&campus.blocked(30,200,.4),postBlocked:campus.blocked(2.6,166.4,.4),floor:[lakeDetailFloorHeight(0,162),lakeDetailFloorHeight(0,168),lakeDetailFloorHeight(0,179)]};
  });
  assert.equal(spatial.blockedCenter.length,0,'Approach and central arch opening must remain passable');assert(spatial.railsBlocked&&spatial.waterBlocked&&spatial.postBlocked);assert.equal(spatial.floor[1],1.56);assert.equal(spatial.floor[2],.36);checks.push({name:'passable library-side approach, steps, arch opening, stone rail and lake collisions',passed:true,...spatial});
  await page.keyboard.down('w');await page.keyboard.down('Shift');await page.waitForFunction(()=>campus.getState().position[2]>167,null,{timeout:20000});await page.keyboard.up('w');await page.keyboard.up('Shift');
  const raised=await state();assert(Math.abs(raised.position[1]-1.56)<.02);await page.screenshot({path:output+'/01-archway-walk.png'});
  await page.keyboard.down('w');await page.waitForFunction(()=>campus.getState().position[2]>179,null,{timeout:20000});await page.keyboard.up('w');const descended=await state();assert(Math.abs(descended.position[1]-.36)<.02);checks.push({name:'walk up, through the arch and down to the lakeside terrace',passed:true,raised:raised.position,descended:descended.position});
  await page.keyboard.down('w');await page.waitForTimeout(1700);await page.keyboard.up('w');assert((await state()).position[2]<183.6,'White stone rail must stop entry into water');checks.push({name:'rail stops the player before the water',passed:true});
  await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/@babylonjs_core.js?')).name;window.reviewB=await import(url);window.reviewScene=reviewB.EngineStore.LastCreatedScene;});
  for(const [name,position,target] of [['02-terrace-overview',[43,26,227],[0,3,168]],['03-archway-front',[22,5,190],[0,5,168]],['04-tile-and-brackets',[10,9,181],[0,6.5,168]]]){
    await page.evaluate(({position,target})=>{if(window.reviewCamera)reviewScene.onBeforeRenderObservable.remove(reviewCamera);window.reviewCamera=reviewScene.onBeforeRenderObservable.add(()=>{reviewScene.activeCamera.position.set(...position);reviewScene.activeCamera.setTarget(new reviewB.Vector3(...target));});},{position,target});await page.waitForTimeout(500);await page.screenshot({path:output+'/'+name+'.png'});
  }
  await page.evaluate(()=>reviewScene.onBeforeRenderObservable.remove(reviewCamera));
  await page.keyboard.press('m');await page.screenshot({path:output+'/05-map.png'});assert.equal(await page.locator('[data-go="datong"]').count(),1);
  assert.equal(errors.length,0,errors.join('\n'));checks.push({name:'map destination and browser errors',passed:true});console.log(JSON.stringify({passed:true,checks,errors},null,2));
}catch(e){await page.screenshot({path:output+'/failure.png'}).catch(()=>{});console.error(e);console.log(JSON.stringify(await state().catch(()=>null)));process.exitCode=1;}
finally{await writeFile(output+'/results.json',JSON.stringify({passed:!process.exitCode,checks,errors},null,2));await browser.close();}
