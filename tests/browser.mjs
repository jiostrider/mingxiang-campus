import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>window.campus?.ready||!document.getElementById('fatal').hidden,null,{timeout:120000});
  assert(await page.evaluate(()=>!!window.campus?.ready),await page.locator('#fatal-message').textContent());
  await page.waitForTimeout(2000);
  await page.screenshot({path:'artifacts/01-welcome.png'});
  checks.push({name:'scene initialized',state:await page.evaluate(()=>campus.getState())});
  await page.locator('#start').click();await page.waitForTimeout(800);
  await page.screenshot({path:'artifacts/02-south-gate.png'});
  const initial=await page.evaluate(()=>campus.getState());assert(initial.started);assert(!initial.paused);
  await page.keyboard.down('w');await page.waitForTimeout(1100);await page.keyboard.up('w');
  const afterWalk=await page.evaluate(()=>campus.getState());assert(afterWalk.position[2]>initial.position[2]+1,'W must move forward');checks.push({name:'walk',passed:true});
  await page.keyboard.press('Space');await page.waitForTimeout(180);
  const airborne=await page.evaluate(()=>campus.getState());assert(airborne.position[1]>initial.position[1]+.25,'jump must leave ground');
  await page.waitForTimeout(1100);assert((await page.evaluate(()=>campus.getState())).grounded);checks.push({name:'jump and landing',passed:true});
  await page.keyboard.press('r');await page.keyboard.press('e');
  assert((await page.evaluate(()=>campus.getState())).riding,'E must mount nearby bicycle');
  await page.keyboard.down('w');await page.waitForTimeout(1700);await page.keyboard.up('w');
  const cycling=await page.evaluate(()=>campus.getState());assert(cycling.speed>3,'bicycle must accelerate');checks.push({name:'cycling',speed:cycling.speed,passed:true});
  await page.screenshot({path:'artifacts/03-cycling.png'});
  await page.keyboard.down('Space');await page.waitForTimeout(1000);await page.keyboard.up('Space');assert(Math.abs((await page.evaluate(()=>campus.getState())).speed)<.4);
  await page.keyboard.press('e');assert(!(await page.evaluate(()=>campus.getState())).riding);checks.push({name:'brake and dismount',passed:true});
  await page.keyboard.press('m');await page.locator('[data-go="library"]').click();await page.waitForTimeout(800);
  await page.screenshot({path:'artifacts/04-library.png'});
  const atLibrary=await page.evaluate(()=>campus.getState());assert(Math.abs(atLibrary.position[2]-32)<1);
  await page.keyboard.down('w');await page.keyboard.down('Shift');await page.waitForTimeout(6600);await page.keyboard.up('w');await page.keyboard.up('Shift');
  const atWall=await page.evaluate(()=>campus.getState());assert(atWall.position[2]<60,'library walls must stop player');assert(atWall.position[2]>53,'player should reach entrance');checks.push({name:'library collision',position:atWall.position,passed:true});
  await page.keyboard.press('m');await page.locator('[data-go="lake"]').click();await page.waitForTimeout(900);await page.screenshot({path:'artifacts/05-lake.png'});
  const lakeStart=await page.evaluate(()=>campus.getState());await page.keyboard.down('a');await page.waitForTimeout(2300);await page.keyboard.up('a');
  const lakeEnd=await page.evaluate(()=>campus.getState());assert(lakeEnd.position[0]>60,'lake shore must prevent entering water');checks.push({name:'lake collision',position:lakeEnd.position,passed:true});
  await page.keyboard.press('m');await page.screenshot({path:'artifacts/06-map.png'});await page.locator('[data-close="map-dialog"]').click();
  const pauseAt=await page.evaluate(()=>campus.getState());assert(pauseAt.paused);await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');assert.deepEqual((await page.evaluate(()=>campus.getState())).position,pauseAt.position);checks.push({name:'pause clears input',passed:true});
  await page.locator('#settings-button').click();await page.selectOption('#quality','low');assert.equal((await page.evaluate(()=>campus.getState())).quality,'low');await page.selectOption('#quality','medium');await page.locator('[data-close="settings-dialog"]').click();
  checks.push({name:'quality settings',passed:true});
  const npcStart=initial.npcs;assert(afterWalk.npcs.some((p,i)=>Math.hypot(p[0]-npcStart[i][0],p[2]-npcStart[i][2])>.1),'NPCs should move');checks.push({name:'NPC movement',passed:true});
  assert.equal(errors.length,0,errors.join('\n'));checks.push({name:'no browser errors',passed:true});
  await page.setViewportSize({width:1000,height:700});await page.waitForTimeout(500);await page.screenshot({path:'artifacts/07-small-desktop.png'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push({name:'small desktop layout',passed:true});
  console.log(JSON.stringify({passed:true,checks,errors},null,2));
}catch(e){await page.screenshot({path:'artifacts/failure.png'}).catch(()=>{});console.error(e);console.log(JSON.stringify({checks,errors,state:await page.evaluate(()=>window.campus?.getState()).catch(()=>null)},null,2));process.exitCode=1;}
finally{await writeFile('artifacts/test-results.json',JSON.stringify({checks,errors,passed:!process.exitCode},null,2));await browser.close();}
