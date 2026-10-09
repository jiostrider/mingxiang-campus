import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const file='20261008-1410-05.7911838.mp4',output='references/user-recordings/20261008-review';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:5173/package.json');
  const metadata=await page.evaluate(file=>new Promise((resolve,reject)=>{
    const v=document.createElement('video');v.id='reference';v.muted=true;v.preload='auto';document.body.replaceChildren(v);
    v.onloadedmetadata=()=>resolve({duration:v.duration,width:v.videoWidth,height:v.videoHeight});v.onerror=()=>reject(new Error('Video cannot be decoded'));
    v.src='/references/user-recordings/'+file;
  }),file);
  const frames=[];console.log(metadata);
  for(let i=0;i<18;i++){
    const seconds=.1+(metadata.duration-.3)*i/17;
    const base64=await page.evaluate(seconds=>new Promise((resolve,reject)=>{
      const v=document.querySelector('#reference');v.pause();
      const timer=setTimeout(()=>reject(new Error('Seek timeout')),20000);
      v.onseeked=()=>{clearTimeout(timer);const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);resolve(c.toDataURL('image/jpeg',.9).split(',')[1]);};v.currentTime=seconds;
    }),seconds);
    const path=`${output}/frame-${String(i).padStart(2,'0')}.jpg`;await writeFile(path,Buffer.from(base64,'base64'));frames.push({seconds,path});
  }
  await writeFile(output+'/index.json',JSON.stringify({file,...metadata,frames},null,2));
}finally{await browser.close();}
