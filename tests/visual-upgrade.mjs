import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const output='artifacts/visual-upgrade';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>campus.getState());
const navigate=async id=>{await page.keyboard.press('Escape');await page.keyboard.press('m');await page.locator(`[data-go="${id}"]`).click();await page.waitForTimeout(500);};
try{
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.campus?.ready||!document.querySelector('#fatal').hidden,null,{timeout:120000});
  assert(await page.evaluate(()=>!!window.campus?.ready),await page.locator('#fatal-message').textContent());
  await page.waitForFunction(()=>campus.getState().fps>12,null,{timeout:120000});
  await navigate('square');
  assert.equal((await state()).playerModel,'Male_Adult_02');
  await page.keyboard.press('e');assert((await state()).riding);
  await page.waitForTimeout(1500);
  await page.waitForFunction(()=>campus.getState().fps>12,null,{timeout:120000});
  await page.keyboard.down('d');await page.waitForFunction(()=>campus.getState().steering>.4,null,{timeout:15000});await page.keyboard.up('d');
  assert((await state()).steering>.4,'Front wheel must visibly steer at rest');
  const pose=await page.evaluate(async()=>{
    const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/@babylonjs_core.js?')).name;
    const B=await import(url),scene=B.EngineStore.LastCreatedScene,steering=scene.getTransformNodeByName('bicycle-steering');
    return ['L','R'].map((side,i)=>{const hand=scene.getTransformNodeByName(`player-Bip01_${side}_Hand`),target=B.Vector3.TransformCoordinates(new B.Vector3(i===0?-.3:.3,1.48,-.29),steering.computeWorldMatrix(true));hand.computeWorldMatrix(true);return B.Vector3.Distance(hand.getAbsolutePosition(),target);});
  });
  assert(pose.every(d=>d<.08),'Both hands must follow the turned handlebar: '+pose);
  checks.push({name:'riding hands follow the handlebar',passed:true,distances:pose});
  await page.keyboard.down('w');await page.keyboard.down('d');await page.waitForTimeout(2300);await page.keyboard.up('d');await page.keyboard.up('w');
  const right=await state();assert(right.bikeHeading>.5&&right.position[0]>3,'Right steering must curve the actual bicycle path');
  checks.push({name:'standing front wheel and forward right turn',passed:true,state:right});
  await page.keyboard.down('a');await page.waitForTimeout(1900);await page.keyboard.up('a');
  const left=await state();assert(left.bikeHeading<right.bikeHeading-.4,'Left turn must reverse heading change while coasting');
  checks.push({name:'left turn while coasting',passed:true,heading:left.bikeHeading});
  await page.keyboard.down('Space');await page.waitForTimeout(1000);await page.keyboard.up('Space');
  assert(Math.abs((await state()).speed)<.4);
  await page.screenshot({path:output+'/01-riding.png'});
  await page.keyboard.press('e');assert(!(await state()).riding);
  await navigate('square');await page.keyboard.press('e');
  await page.keyboard.down('s');await page.keyboard.down('d');await page.waitForTimeout(1900);await page.keyboard.up('s');await page.keyboard.up('d');
  const reverse=await state();assert(reverse.speed<-.5&&reverse.bikeHeading<-.25,'Reverse steering must curve in the opposite direction');
  checks.push({name:'brake dismount and reverse steering',passed:true,heading:reverse.bikeHeading});
  await navigate('library');
  const sceneInfo=await page.evaluate(async()=>{
    const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/@babylonjs_core.js?')).name;
    const B=await import(url);window.reviewB=B;window.reviewScene=B.EngineStore.LastCreatedScene;
    const scene=reviewScene,sg=scene.getLightByName('afternoon-sun').getShadowGenerator();
    const avatarMeshes=scene.getTransformNodeByName('player').getChildMeshes();
    const material=scene.getMaterialByName('south-plaza-aggregate');
    return {shadow:sg.getClassName(),environment:scene.environmentTexture?.name,pbr:material.getClassName(),avatarVertices:avatarMeshes.reduce((n,m)=>n+m.getTotalVertices(),0),skeletons:scene.skeletons.length,animations:scene.animationGroups.length,rootMotion:scene.animationGroups.filter(g=>g.name.startsWith('player-')&&/walk|run/.test(g.name)).flatMap(g=>g.targetedAnimations.filter(t=>t.target.name==='player-Bip01'&&t.animation.targetProperty==='position').map(t=>t.animation.getKeys().every(k=>Math.abs(k.value.x)<.001&&Math.abs(k.value.z)<.001)))};
  });
  assert.equal(sceneInfo.pbr,'PBRMaterial');assert(sceneInfo.environment&&sceneInfo.avatarVertices>15000&&sceneInfo.skeletons>=17&&sceneInfo.animations>=51);
  assert(sceneInfo.rootMotion.length===2&&sceneInfo.rootMotion.every(Boolean),'Visual avatar must stay aligned with collision root');
  checks.push({name:'real local skinned avatars, PBR environment, in-place locomotion',passed:true,...sceneInfo});
  await page.keyboard.down('w');await page.waitForTimeout(900);await page.keyboard.up('w');await page.waitForTimeout(600);
  const playerRoot=await page.evaluate(()=>campus.getState().position);
  const cameras=[
    ['02-library',[28,6,-18],[0,16,76]],
    ['03-character',[playerRoot[0]+1.8,1.7,playerRoot[2]+2.6],[playerRoot[0],1.2,playerRoot[2]]],
    ['04-clock-plaza',[4,3,-25],[79,17,-78]],
  ];
  for(const [name,position,target] of cameras){
    await page.evaluate(({position,target})=>{
      if(window.reviewCamera)reviewScene.onBeforeRenderObservable.remove(reviewCamera);
      window.reviewCamera=reviewScene.onBeforeRenderObservable.add(()=>{reviewScene.activeCamera.position.set(...position);reviewScene.activeCamera.setTarget(new reviewB.Vector3(...target));});
    },{position,target});
    await page.waitForTimeout(500);await page.screenshot({path:output+'/'+name+'.png'});
  }
  await page.evaluate(()=>reviewScene.onBeforeRenderObservable.remove(reviewCamera));
  await page.keyboard.press('Escape');await page.locator('#settings-button').click();
  for(const quality of ['low','high','medium']){await page.selectOption('#quality',quality);await page.waitForTimeout(500);assert.equal((await state()).quality,quality);}
  await page.locator('[data-close="settings-dialog"]').click();
  assert.equal(errors.length,0,errors.join('\n'));checks.push({name:'quality switches without browser errors',passed:true});
  console.log(JSON.stringify({passed:true,checks,errors},null,2));
}catch(e){await page.screenshot({path:output+'/failure.png'}).catch(()=>{});console.error(e);console.log(JSON.stringify(await state().catch(()=>null)));process.exitCode=1;}
finally{await writeFile(output+'/results.json',JSON.stringify({passed:!process.exitCode,checks,errors},null,2));await browser.close();}

