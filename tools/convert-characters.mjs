import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('public/assets/characters',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage();
  page.on('console',m=>console.log(m.type()+': '+m.text()));
  page.on('requestfailed',r=>console.error('request: '+r.url()+' '+r.failure()?.errorText));
  page.on('pageerror',e=>console.error(e));
  await page.goto('http://127.0.0.1:5173/tools/character-converter.html');
  await page.waitForFunction(()=>window.convertCharacter);
  for(const name of ['Male_Adult_02','Male_Adult_01','Male_Adult_04']){
    console.log('Converting '+name);
    const info=await page.evaluate(name=>window.convertCharacter(name),name);
    const bytes=await page.evaluate(()=>window.convertedGLB);
    await writeFile('public/assets/characters/'+name+'.glb',Buffer.from(bytes));
    await writeFile('public/assets/characters/'+name+'.json',JSON.stringify(info,null,2));
    console.log(JSON.stringify(info));
  }
  // Every skin must use a common ancestor, rather than the first exported joint.
  await import('./fix-skin-roots.mjs');
}finally{await browser.close();}
