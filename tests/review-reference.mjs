import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

await mkdir('artifacts/south-plaza-reference', {recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto('http://127.0.0.1:5173/references/south-plaza/reference.mp4');
  const video=page.locator('video');
  await video.evaluate(v=>new Promise(resolve=>{
    if(v.readyState>=2)resolve();else v.addEventListener('loadeddata',resolve,{once:true});
  }));
  const metadata=await video.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight}));
  console.log(JSON.stringify(metadata));
  for(const fraction of [0,.2,.4,.6,.8,.97]) {
    await video.evaluate((v,t)=>new Promise(resolve=>{
      v.pause();v.addEventListener('seeked',resolve,{once:true});v.currentTime=Math.max(.01,t);
    }),metadata.duration*fraction);
    await video.screenshot({path:`artifacts/south-plaza-reference/frame-${Math.round(fraction*100)}.png`});
  }
} finally {await browser.close();}
