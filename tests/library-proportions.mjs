import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const output='artifacts/library-proportions';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>window.campus?.ready,null,{timeout:120000});await page.locator('#map-button').click();await page.locator('[data-go="library"]').click();
await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/@babylonjs_core.js?')).name;window.B=await import(url);window.s=B.EngineStore.LastCreatedScene;});
const spatial=await page.evaluate(async()=>{
const {libraryFloorHeight,libraryStairWidth}=await import('/src/library-entrance.js');
const probes=[[30,45.6],[23,49],[0,53.4],[0,56.5]].map(([x,z])=>{const ray=new B.Ray(new B.Vector3(x,15,z),new B.Vector3(0,-1,0),20),hit=s.pickWithRay(ray,m=>m.material?.name==='pale-stone');return {x,z,walking:libraryFloorHeight(x,z),visual:hit?.pickedPoint?.y};});
return {probes,widths:[44.1,48,54.2].map(libraryStairWidth),upperSideExcluded:libraryFloorHeight(30,54)===null,planterBlocked:campus.blocked(30,54,.4),wingsBlocked:campus.blocked(39,59.3,.4)&&campus.blocked(-39,59.3,.4),npcErrors:campus.getState().npcs.filter(p=>p[2]>44&&p[2]<60&&Math.abs(p[1]-(libraryFloorHeight(p[0],p[2])??.16))>.04)};
});
assert(spatial.widths[0]>spatial.widths[1]&&spatial.widths[1]>spatial.widths[2]);assert(spatial.upperSideExcluded&&spatial.planterBlocked&&spatial.wingsBlocked);assert.equal(spatial.npcErrors.length,0);
for(const p of spatial.probes)assert(Number.isFinite(p.visual)&&Math.abs(p.visual-p.walking)<.18,'Rendered stair surface must match walking height: '+JSON.stringify(p));checks.push({name:'stepped stair widths, rendered surface vs walking height, planters and wing walls',passed:true,...spatial});
for(const [name,position,target] of [['01-front-proportions',[0,1.7,-4],[0,20,70]],['02-stairs-and-planters',[38,9,34],[0,6,60]],['03-tower-and-wings',[65,38,8],[0,23,77]]]){
 await page.evaluate(({position,target})=>{if(window.cam)s.onBeforeRenderObservable.remove(cam);window.cam=s.onBeforeRenderObservable.add(()=>{s.activeCamera.position.set(...position);s.activeCamera.setTarget(new B.Vector3(...target));});},{position,target});await page.waitForTimeout(600);await page.screenshot({path:output+'/'+name+'.png'});
}
await page.evaluate(()=>s.onBeforeRenderObservable.remove(cam));assert.equal(errors.length,0,errors.join('\n'));checks.push({name:'no browser errors',passed:true});console.log(JSON.stringify({passed:true,checks,errors},null,2));
}catch(e){console.error(e);process.exitCode=1;await page.screenshot({path:output+'/failure.png'}).catch(()=>{});}
finally{await writeFile(output+'/results.json',JSON.stringify({passed:!process.exitCode,checks,errors},null,2));await browser.close();}
