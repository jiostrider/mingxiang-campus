import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('artifacts/npc-pose',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
try{
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.campus?.ready,null,{timeout:120000});
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/@babylonjs_core.js?')).name;window.B=await import(url);window.s=B.EngineStore.LastCreatedScene;campus.goTo('square');});
 await page.waitForTimeout(2500);
 const sample=()=>page.evaluate(()=>{
  return Array.from({length:16},(_,i)=>{const root=s.getTransformNodeByName('student-'+i),bones=root.getChildTransformNodes().filter(n=>/Bip01_(Head|Pelvis|L_Foot|R_Foot|L_Calf|R_Calf)$/.test(n.name));return {id:i,model:root.getChildMeshes()[0]?.name,bones:bones.map(n=>({name:n.name,p:n.computeWorldMatrix(true).getTranslation().subtract(root.position).asArray()})),sharedTargets:s.animationGroups.filter(g=>g.name.startsWith('student-'+i+'-')).flatMap(g=>g.targetedAnimations.filter(t=>!t.target.isDescendantOf(root)).map(t=>t.target.name))};});
 });
 const before=await sample();await page.keyboard.press('e');await page.waitForTimeout(2500);const after=await sample();
 console.log(JSON.stringify({before,after},null,2));await writeFile('artifacts/npc-pose/diagnostic.json',JSON.stringify({before,after},null,2));
 const skin=await page.evaluate(()=>Array.from({length:3},(_,i)=>{const root=s.getTransformNodeByName('student-'+i),meshes=root.getChildMeshes().filter(m=>m.getTotalVertices()>0);return {id:i,meshes:meshes.map(m=>{const pos=m.getPositionData(true),matrix=m.computeWorldMatrix(true),min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let j=0;j<pos.length;j+=3){const v=B.Vector3.TransformCoordinates(B.Vector3.FromArray(pos,j),matrix).subtract(root.position);v.asArray().forEach((x,k)=>{min[k]=Math.min(min[k],x);max[k]=Math.max(max[k],x);});}return {name:m.name,min,max,skeleton:m.skeleton.name,linked:m.skeleton.bones.every(b=>b.getTransformNode()?.isDescendantOf(root)),indices:m.skeleton.bones.map(b=>b.getIndex())};})};}));
 console.log('SKIN',JSON.stringify(skin));await writeFile('artifacts/npc-pose/skin.json',JSON.stringify(skin,null,2));
 const binding=await page.evaluate(async()=>{const container=await B.LoadAssetContainerAsync('/assets/characters/Male_Adult_04.glb',s),source=container.skeletons[0],copy=s.getTransformNodeByName('student-1').getChildMeshes().find(m=>m.skeleton).skeleton;const differences=source.bones.map((b,i)=>{const other=copy.bones[i],a=b.getAbsoluteInverseBindMatrix().asArray(),c=other.getAbsoluteInverseBindMatrix().asArray();return {name:b.name,index:b.getIndex(),difference:Math.max(...a.map((v,k)=>Math.abs(v-c[k]))),parent:b.getParent()?.name};}).filter(d=>d.difference>.001);container.dispose();return differences;});
 console.log('BINDING',JSON.stringify(binding));await writeFile('artifacts/npc-pose/binding.json',JSON.stringify(binding,null,2));
 await page.evaluate(()=>{const root=s.getTransformNodeByName('student-1');window.cam=s.onBeforeRenderObservable.add(()=>{const p=root.position;s.activeCamera.position.set(p.x+2.6,p.y+1.8,p.z+3);s.activeCamera.setTarget(p.add(new B.Vector3(0,1,0)));});});
 await page.waitForTimeout(1500);await page.screenshot({path:'artifacts/npc-pose/hoodie.png'});
}finally{await browser.close();}
