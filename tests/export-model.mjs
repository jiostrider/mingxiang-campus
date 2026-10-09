import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('models',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
try{
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForFunction(()=>window.campus?.ready,null,{timeout:90000});
  await page.waitForTimeout(1000);
  await page.screenshot({path:'artifacts/01-welcome.png'});
  const data=await page.evaluate(()=>window.campus.exportModel());
  await writeFile('models/campus-scene.json',JSON.stringify(data));
  console.log(JSON.stringify({meshes:data.meshes.length,geometries:Object.keys(data.geometries).length,materials:Object.keys(data.materials).length}));
}finally{await browser.close();}
