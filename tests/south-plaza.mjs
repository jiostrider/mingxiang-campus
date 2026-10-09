import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const output='artifacts/south-plaza';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
const errors=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
try {
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.campus?.ready||!document.querySelector('#fatal').hidden,null,{timeout:90000});
  assert(await page.evaluate(()=>!!window.campus?.ready),await page.locator('#fatal-message').textContent());
  await page.locator('#map-button').click();await page.locator('[data-go="square"]').click();
  await page.waitForTimeout(1200);
  await page.screenshot({path:output+'/01-plaza-walk.png'});
  const spatial=await page.evaluate(()=>{
    const open=[];
    for(let z=-162;z<=32;z+=2)for(const x of [-12,12])if(campus.blocked(x,z,.55))open.push([x,z]);
    return {blockedCenter:open,flagBlocked:campus.blocked(0,-74,.4),clockBlocked:campus.blocked(79,-78,.4),sidewalkOpen:!campus.blocked(58.5,-100,.55),gateWallBlocked:campus.blocked(0,-294,.4),gatePassagesOpen:[-22,22].every(x=>!campus.blocked(x,-294,.55))};
  });
  assert.equal(spatial.blockedCenter.length,0,'Routes on either side of the central flags must remain open');
  assert(spatial.flagBlocked&&spatial.clockBlocked&&spatial.sidewalkOpen&&spatial.gateWallBlocked&&spatial.gatePassagesOpen,'Landmarks need collisions and passable surrounding routes');
  checks.push({name:'central route and landmark collisions',passed:true,...spatial});
  const initial=await page.evaluate(()=>campus.getState());
  await page.keyboard.down('w');await page.keyboard.down('Shift');await page.waitForTimeout(1200);await page.keyboard.up('w');await page.keyboard.up('Shift');
  assert((await page.evaluate(()=>campus.getState())).position[2]>initial.position[2]+2);
  checks.push({name:'walking across plaza',passed:true});
  await page.keyboard.press('m');await page.locator('[data-go="library"]').click();
  await page.keyboard.down('w');await page.keyboard.down('Shift');await page.waitForTimeout(7000);await page.keyboard.up('w');await page.keyboard.up('Shift');
  const entrance=await page.evaluate(()=>campus.getState());
  assert(entrance.position[2]>54&&entrance.position[2]<60&&entrance.position[1]>4.3&&entrance.position[1]<4.4,'Raised steps must lead to the upper landing without entering the building');
  checks.push({name:'library stair traversal and entrance collision',passed:true,position:entrance.position});
  const floorProfile=await page.evaluate(async()=>{
    const {libraryFloorHeight}=await import('/src/library-entrance.js');
    const heights=Array.from({length:107},(_,i)=>libraryFloorHeight(0,44+i*.1));
    return {heights,middle:[libraryFloorHeight(0,48.6),libraryFloorHeight(0,49.8)],npcErrors:campus.getState().npcs.filter(p=>Math.abs(p[1]-(libraryFloorHeight(p[0],p[2])??.16))>.04)};
  });
  assert(floorProfile.heights.every((h,i)=>i===0||h>=floorProfile.heights[i-1]));
  assert.equal(floorProfile.middle[0],floorProfile.middle[1],'Rest platform must remain level');
  assert.equal(floorProfile.npcErrors.length,0,'NPC feet must follow the raised entrance');
  await page.keyboard.press('Space');await page.waitForTimeout(200);
  assert((await page.evaluate(()=>campus.getState())).position[1]>entrance.position[1]+.25,'Jump must work on raised landing');
  await page.waitForTimeout(1000);
  assert((await page.evaluate(()=>campus.getState())).grounded);
  await page.keyboard.down('s');await page.keyboard.down('Shift');await page.waitForTimeout(7000);await page.keyboard.up('s');await page.keyboard.up('Shift');
  const descended=await page.evaluate(()=>campus.getState());
  assert(descended.position[2]<44&&Math.abs(descended.position[1]-.16)<.02,'Descending must return to plaza height');
  checks.push({name:'rest landing, NPC feet, stair jump and descent',passed:true,position:descended.position});
  await page.keyboard.press('m');await page.locator('[data-go="square"]').click();await page.keyboard.press('e');
  assert((await page.evaluate(()=>campus.getState())).riding);
  await page.keyboard.down('w');await page.waitForTimeout(1500);await page.keyboard.up('w');
  assert((await page.evaluate(()=>campus.getState())).speed>3);
  await page.keyboard.down('Space');await page.waitForTimeout(900);await page.keyboard.up('Space');await page.keyboard.press('e');
  assert(!(await page.evaluate(()=>campus.getState())).riding);
  checks.push({name:'plaza cycling brake and dismount',passed:true});

  // Inspect the actual Babylon scene, without changing production camera controls.
  await page.evaluate(async()=>{
    const moduleURL=performance.getEntriesByType('resource').find(entry=>entry.name.includes('/@babylonjs_core.js?'))?.name;
    if(!moduleURL)throw new Error('Babylon module URL was not observed');
    const B=await import(moduleURL);window.reviewBabylon=B;
    const scene=B.EngineStore.LastCreatedScene;
    if(!scene)throw new Error('No active scene for visual review');
    window.reviewScene=scene;
    window.reviewCamera=scene.onBeforeRenderObservable.add(()=>{
      scene.activeCamera.position.set(55,35,-95);
      scene.activeCamera.setTarget(new B.Vector3(0,12,55));
    });
  });
  await page.waitForTimeout(600);await page.screenshot({path:output+'/02-library-and-plaza.png'});
  await page.evaluate(()=>{
    const B=window.reviewBabylon;
    reviewScene.onBeforeRenderObservable.remove(reviewCamera);
    window.reviewCamera=reviewScene.onBeforeRenderObservable.add(()=>{reviewScene.activeCamera.position.set(-8,2.1,-4);reviewScene.activeCamera.setTarget(new B.Vector3(0,12,75));});
  });
  await page.waitForTimeout(600);await page.screenshot({path:output+'/05-library-ground-view.png'});
  await page.evaluate(async()=>{
    const B=window.reviewBabylon;
    reviewScene.onBeforeRenderObservable.remove(reviewCamera);
    window.reviewCamera=reviewScene.onBeforeRenderObservable.add(()=>{reviewScene.activeCamera.position.set(8,7,-41);reviewScene.activeCamera.setTarget(new B.Vector3(79,13,-93));});
  });
  await page.waitForTimeout(600);await page.screenshot({path:output+'/03-clock-and-planting.png'});
  const flagAnimation=await page.evaluate(()=>{
    const m=reviewScene.getMeshByName('plaza-flag-1');return Array.from(m.getVerticesData('position'));
  });
  await page.waitForTimeout(250);
  assert(await page.evaluate(before=>reviewScene.getMeshByName('plaza-flag-1').getVerticesData('position').some((v,i)=>Math.abs(v-before[i])>.001),flagAnimation));
  checks.push({name:'flag mesh animates',passed:true});
  await page.evaluate(()=>{
    const B=window.reviewBabylon;
    reviewScene.onBeforeRenderObservable.remove(reviewCamera);
    window.reviewCamera=reviewScene.onBeforeRenderObservable.add(()=>{reviewScene.activeCamera.position.set(16,3,-112);reviewScene.activeCamera.setTarget(new B.Vector3(0,13,-74));});
  });
  await page.waitForTimeout(400);await page.screenshot({path:output+'/07-flags-and-square.png'});
  for(const [name,position,target] of [
    ['08-library-stairs',[18,2,30],[0,6,58]],
    ['09-south-gate',[0,7,-342],[0,4,-278]],
    ['10-lake-pavilion',[43,26,227],[0,3,168]],
    ['11-library-front',[0,2,-60],[0,18,76]],
  ]){
    await page.evaluate(({position,target})=>{
      reviewScene.onBeforeRenderObservable.remove(reviewCamera);
      window.reviewCamera=reviewScene.onBeforeRenderObservable.add(()=>{reviewScene.activeCamera.position.set(...position);reviewScene.activeCamera.setTarget(new reviewBabylon.Vector3(...target));});
    },{position,target});
    await page.waitForTimeout(450);await page.screenshot({path:output+'/'+name+'.png'});
  }
  await page.evaluate(()=>reviewScene.onBeforeRenderObservable.remove(reviewCamera));
  await page.keyboard.press('m');await page.screenshot({path:output+'/04-map.png'});
  await page.locator('[data-close="map-dialog"]').click();
  await page.locator('#settings-button').click();
  for(const quality of ['low','high','medium']){await page.selectOption('#quality',quality);assert.equal((await page.evaluate(()=>campus.getState())).quality,quality);}
  await page.locator('[data-close="settings-dialog"]').click();
  checks.push({name:'quality settings',passed:true});
  await page.waitForTimeout(1500);
  const state=await page.evaluate(()=>campus.getState());
  assert.equal(errors.length,0,errors.join('\n'));checks.push({name:'no browser errors',passed:true});
  await writeFile(output+'/results.json',JSON.stringify({passed:true,checks,state,errors},null,2));
  console.log(JSON.stringify({passed:true,checks,state:{fps:state.fps,meshes:state.meshes},errors},null,2));
}catch(error){
  await page.screenshot({path:output+'/failure.png'}).catch(()=>{});
  await writeFile(output+'/results.json',JSON.stringify({passed:false,checks,errors,failure:String(error)},null,2));
  console.error(error);process.exitCode=1;
}finally{await browser.close();}
