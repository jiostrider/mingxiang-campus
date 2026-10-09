import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const output='artifacts/npc-and-look';await mkdir(output,{recursive:true});
const checks=[],errors=[];
// Guard the export defect that distorted the hoodie even with correct bone positions.
for(const id of ['Male_Adult_01','Male_Adult_02','Male_Adult_04']){
  const bytes=await readFile(`public/assets/characters/${id}.glb`),json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const parents=new Map();json.nodes.forEach((n,i)=>n.children?.forEach(c=>parents.set(c,i)));
  for(const skin of json.skins)for(const joint of skin.joints){let node=joint;while(node!==skin.skeleton&&parents.has(node))node=parents.get(node);assert.equal(node,skin.skeleton,`${id}: skin root must be an ancestor of every joint`);}
}
checks.push({name:'all exported skin roots contain every joint',passed:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>campus.getState());
const moveLook=async(x,y)=>{await page.mouse.down();await page.evaluate(({x,y})=>window.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y})),{x,y});await page.mouse.up();await page.waitForTimeout(700);};
const sampleSkin=()=>page.evaluate(()=>Array.from({length:16},(_,i)=>{
  const root=reviewScene.getTransformNodeByName('student-'+i),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const mesh of root.getChildMeshes().filter(m=>m.skeleton&&m.getTotalVertices())){
    const p=mesh.getPositionData(true),matrix=mesh.computeWorldMatrix(true);
    for(let j=0;j<p.length;j+=3){const v=reviewB.Vector3.TransformCoordinates(reviewB.Vector3.FromArray(p,j),matrix).subtract(root.position).asArray();for(let k=0;k<3;k++){min[k]=Math.min(min[k],v[k]);max[k]=Math.max(max[k],v[k]);}}
  }
  return {id:i,min,max,sharedTargets:reviewScene.animationGroups.filter(g=>g.name.startsWith('student-'+i+'-')).flatMap(g=>g.targetedAnimations.filter(t=>!t.target.isDescendantOf(root)).map(t=>t.target.name))};
}));
try{
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>window.campus?.ready,null,{timeout:120000});
  await page.locator('#map-button').click();await page.locator('[data-go="square"]').click();await page.waitForTimeout(1000);
  await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/@babylonjs_core.js?')).name;window.reviewB=await import(url);window.reviewScene=reviewB.EngineStore.LastCreatedScene;});
  const samples=[];
  for(const mode of ['on foot','on bicycle','after dismount']){
    if(mode!=='on foot')await page.keyboard.press('e');
    assert.equal((await state()).riding,mode==='on bicycle');
    for(let t=0;t<3;t++){await page.waitForTimeout(450);const skin=await sampleSkin();for(const p of skin){assert(p.min[1]<.23&&p.min[1]>-.25&&p.max[1]>1.35&&p.max[1]<2.1,`${mode}: NPC ${p.id} deformed bounds ${p.min} / ${p.max}`);assert.equal(p.sharedTargets.length,0);}samples.push({mode,skin});}
  }
  checks.push({name:'deformed mesh vertices stay grounded for all 16 NPCs across mounting and dismounting',passed:true,samples});
  const layout=await page.evaluate(async()=>{const {southPlaza}=await import('/src/south-plaza.js');return {clock:southPlaza.clock,eastBlocked:campus.blocked(79,-78,.4),oldWestOpen:!campus.blocked(-79,-78,.4),museumBlocked:campus.blocked(90,-131,.4),pathOpen:!campus.blocked(58.5,-100,.55)};});
  assert(layout.clock.x>0&&layout.eastBlocked&&layout.oldWestOpen&&layout.museumBlocked&&layout.pathOpen);checks.push({name:'clock east of square, museum south of clock, side route passable',passed:true,...layout});
  const neutralHead=await page.evaluate(()=>reviewScene.getTransformNodeByName('player-Bip01_Head').rotationQuaternion.asArray());
  await moveLook(0,-460);const up=await state();assert(up.viewPitch<-.6&&up.look.pitch<-.5,'Look up must reach beyond the previous -.18 limit');
  const gaze=await page.evaluate(()=>({head:reviewScene.getTransformNodeByName('player-Bip01_Head').rotationQuaternion.asArray(),forward:reviewScene.activeCamera.getForwardRay().direction.asArray(),cameraY:reviewScene.activeCamera.position.y}));
  assert(gaze.forward[1]>.2&&gaze.cameraY>.4,'Camera must look up while staying above ground');assert(gaze.head.some((v,i)=>Math.abs(v-neutralHead[i])>.08),'Actual head bone must follow pitch');
  await page.screenshot({path:output+'/01-look-up.png'});checks.push({name:'mouse pitch, actual head rotation and upward camera direction',passed:true,state:up,gaze});
  await moveLook(0,460);await page.keyboard.press('e');assert((await state()).riding);
  const mounted=await state();await moveLook(560,0);const turned=await state();assert(Math.abs(turned.viewYaw-mounted.viewYaw)>1&&Math.abs(turned.bikeHeading-mounted.bikeHeading)<.01,'Riding free look must not steer the bike');
  await page.keyboard.press('e');const off=await state();assert(!off.riding&&Math.abs(off.playerHeading-off.viewYaw)<.01,'Dismount must face the current viewing direction');
  await moveLook(480,0);await page.waitForFunction(heading=>campus.getState().playerHeading>heading+.35&&campus.getState().look.yaw>.3,off.playerHeading,{timeout:15000});const idle=await state();
  await page.screenshot({path:output+'/02-standing-turn.png'});checks.push({name:'riding free look, dismount heading and standing head/body turn',passed:true,mounted,turned,off,idle});
  // Review the corrected layout from the west; museum is right/south of the clock.
  await page.evaluate(()=>{window.reviewCamera=reviewScene.onBeforeRenderObservable.add(()=>{reviewScene.activeCamera.position.set(-30,45,-104);reviewScene.activeCamera.setTarget(new reviewB.Vector3(89,13,-104));});});
  await page.waitForTimeout(700);await page.screenshot({path:output+'/03-east-clock-and-museum.png'});
  await page.evaluate(()=>{reviewScene.onBeforeRenderObservable.remove(reviewCamera);const root=reviewScene.getTransformNodeByName('student-1');window.reviewCamera=reviewScene.onBeforeRenderObservable.add(()=>{const p=root.position;reviewScene.activeCamera.position.set(p.x+2.6,p.y+1.8,p.z+3);reviewScene.activeCamera.setTarget(p.add(new reviewB.Vector3(0,1,0)));});});
  await page.waitForTimeout(700);await page.screenshot({path:output+'/04-hoodie.png'});await page.evaluate(()=>reviewScene.onBeforeRenderObservable.remove(reviewCamera));
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{document.querySelector('#world').requestPointerLock=()=>{throw new Error('Test drag fallback');};});
  await page.locator('#resume').click();await page.mouse.move(700,500);
  const dragBefore=await state();await moveLook(120,-160);const dragAfter=await state();
  assert(Math.abs(dragAfter.viewYaw-dragBefore.viewYaw-.3)<.01&&Math.abs(dragAfter.viewPitch-dragBefore.viewPitch+.32)<.01,'Mouse drag must work when pointer lock is unavailable');
  checks.push({name:'drag fallback without pointer lock',passed:true});
  assert.equal(errors.length,0,errors.join('\n'));checks.push({name:'no browser errors',passed:true});console.log(JSON.stringify({passed:true,checks:checks.map(c=>({...c,samples:c.samples?.length})),errors},null,2));
}catch(e){await page.screenshot({path:output+'/failure.png'}).catch(()=>{});console.error(e);console.log(JSON.stringify(await state().catch(()=>null)));process.exitCode=1;}
finally{await writeFile(output+'/results.json',JSON.stringify({passed:!process.exitCode,checks,errors},null,2));await browser.close();}
