import * as B from '@babylonjs/core';
import {buildWorld,destinations} from './world.js';
import {createActors} from './actors.js';
import {steerBicycle} from './bicycle-motion.js';
import {setupRendering} from './rendering.js';
import './style.css';

const $=id=>document.getElementById(id), canvas=$('world');
const V=(x,y,z)=>new B.Vector3(x,y,z),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let engine,scene,world,actors,shadow,camera,rendering;
const state={started:false,paused:true,riding:false,yaw:0,pitch:.12,distance:5.8,sensitivity:1,speed:0,steering:0,vertical:0,grounded:true,phase:0,travel:0,quality:'medium',time:0};
const keys=new Set();let drag=false,ignoreUnlock=false,toastTimer,frameTimer=0,lastFrame=performance.now(),introTime=0;
document.body.classList.add('menu');
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3600);}
function errorScreen(error){console.error(error);$('loading').hidden=true;$('fatal').hidden=false;$('fatal-message').textContent='请开启浏览器图形加速，再重新打开页面。若仍不能加载，请将以下信息发给我：'+(error?.message||String(error));}
window.addEventListener('unhandledrejection',e=>errorScreen(e.reason));

try { await initialize(); } catch(error){errorScreen(error);}

async function initialize(){
  if(!B.Engine.isSupported())throw new Error('当前浏览器不支持 WebGL。');
  engine=new B.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,powerPreference:'high-performance',antialias:true},false);
  engine.setHardwareScalingLevel(Math.max(1,window.devicePixelRatio/1.5));
  scene=new B.Scene(engine);scene.clearColor=new B.Color4(.68,.77,.8,1);scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.0008;scene.fogColor=new B.Color3(.67,.78,.9);
  camera=new B.FreeCamera('third-person-camera',V(-90,53,-113),scene);camera.minZ=.15;camera.maxZ=1900;camera.fov=.88;camera.inputs.clear();scene.activeCamera=camera;
  const sky=new B.ShaderMaterial('sky',scene,{vertexSource:`precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;varying vec3 vP;void main(){vP=position;gl_Position=worldViewProjection*vec4(position,1.);}`,fragmentSource:`precision highp float;varying vec3 vP;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}void main(){vec3 d=normalize(vP);float h=max(d.y,0.);vec3 col=mix(vec3(.62,.80,1.0),vec3(.055,.24,.65),pow(h,.42));vec2 uv=d.xz/max(.11,d.y)*1.5;float n=noise(uv)*.58+noise(uv*2.03)*.27+noise(uv*4.07)*.15;float clouds=smoothstep(.55,.79,n)*smoothstep(.015,.23,d.y)*.54;col=mix(col,vec3(1.65,1.65,1.62),clouds);vec3 sun=normalize(vec3(-.5,.65,-.4));float s=pow(max(dot(d,sun),0.),450.);col+=vec3(1.,.8,.5)*s*.5;gl_FragColor=vec4(col,1.);}`},{attributes:['position'],uniforms:['worldViewProjection']});sky.backFaceCulling=false;sky.disableDepthWrite=true;
  const skyMesh=B.MeshBuilder.CreateSphere('sky-dome',{diameter:2700,segments:24},scene);skyMesh.material=sky;skyMesh.isPickable=false;skyMesh.infiniteDistance=true;
  rendering=setupRendering(scene,engine,camera);shadow=rendering.shadow;const sun=rendering.sun;
  $('load-detail').textContent='正在构建图书馆、林荫道与明向湖';
  await new Promise(r=>setTimeout(r,40));
  world=buildWorld(scene,shadow);$('load-detail').textContent='正在加载人物、扫描材质与光照';actors=await createActors(scene,shadow);resetPosition('gate');
  actors.updateNPCs(0,actors.player.root.position,world.blocked,world.floorHeight);
  await scene.whenReadyAsync();
  attachInputs();setQuality('medium');$('loading').hidden=true;
  engine.runRenderLoop(()=>{
    const now=performance.now(),dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;state.time+=dt;
    if(!state.started){introTime+=dt;camera.position.set(-93+Math.sin(introTime*.055)*8,54,-105+Math.cos(introTime*.04)*6);camera.setTarget(V(8,22,87));sun.position.set(-100,185,-45);}
    else if(!state.paused&&!anyDialog())updatePlayer(dt);
    if(state.started&&!state.paused&&!anyDialog())actors.updateNPCs(dt,actors.player.root.position,world.blocked,world.floorHeight);
    if(state.started)updateCamera(dt);
    if(state.started){const p=actors.player.root.position;sun.position.set(p.x-100,185,p.z-100);}
    actors.player.look(state.yaw,state.pitch,dt);
    world.water.setFloat('time',state.time);world.water.setVector3('eye',camera.position);
    world.update(state.time);
    scene.render();frameTimer+=dt;
    if(frameTimer>.1){frameTimer=0;updateHUD();drawMap($('minimap'),false);if($('map-dialog').open)drawMap($('large-map'),true);}
  });
  window.addEventListener('resize',()=>engine.resize());
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('显卡上下文暂时中断，正在等待恢复。');});
  registerAgentTools();
  // Explicit observable state lets the browser checks exercise the same actions as the UI.
  window.campus={ready:true,getState:()=>({started:state.started,paused:state.paused,riding:state.riding,speed:state.speed,steering:state.steering,bikeHeading:actors.bike.root.rotation.y,playerModel:actors.player.model,playerHeading:actors.player.root.rotation.y,viewYaw:state.yaw,viewPitch:state.pitch,look:actors.player.getLookState(),position:actors.player.root.position.asArray(),bike:actors.bike.root.position.asArray(),fps:engine.getFps(),grounded:state.grounded,quality:state.quality,npcCount:actors.npcs.length,npcs:actors.npcs.map(n=>n.root.position.asArray()),meshes:scene.meshes.length}),goTo,blocked:world.blocked,exportModel};
}

function anyDialog(){return $('map-dialog').open||$('settings-dialog').open;}
function clearInputs(){keys.clear();drag=false;}
function resetPosition(id){
  const d=destinations[id];actors.player.root.position.set(d.x,world.floorHeight(d.x,d.z),d.z);actors.player.root.rotation.y=0;
  actors.bike.root.position.set(d.x+2,world.floorHeight(d.x+2,d.z+1.5),d.z+1.5);actors.bike.root.rotation.y=0;
  state.riding=false;state.speed=0;state.steering=0;state.vertical=0;state.yaw=0;state.pitch=.12;state.grounded=true;state.distance=5.8;state.phase=0;actors.player.animate(0,0);actors.bike.animate(0,0);clearInputs();
  camera.position.copyFrom(actors.player.root.position.add(V(0,2.8,-5.8)));camera.setTarget(actors.player.root.position.add(V(0,1.5,0)));
}
function start(){state.started=true;state.paused=false;document.body.classList.remove('menu');document.body.classList.add('playing');$('welcome').hidden=true;$('welcome-footer').hidden=true;$('hud').hidden=false;$('pause').hidden=true;clearInputs();canvas.focus();captureMouse();}
function captureMouse(){try{const result=canvas.requestPointerLock?.();if(result?.catch)result.catch(()=>toast('可按住鼠标拖动视角，WASD 继续移动。'));}catch{toast('可按住鼠标拖动视角，WASD 继续移动。');}}
function releaseMouse(){if(document.pointerLockElement){ignoreUnlock=true;document.exitPointerLock();}}
function pause(){if(!state.started||anyDialog())return;state.paused=true;clearInputs();$('pause').hidden=false;releaseMouse();}
function resume(){state.paused=false;$('pause').hidden=true;clearInputs();canvas.focus();captureMouse();}
function openDialog(id){clearInputs();releaseMouse();$(id).showModal();$('pause').hidden=true;if(id==='map-dialog')drawMap($('large-map'),true);}
function closeDialog(id){$(id).close();clearInputs();if(state.started){state.paused=true;$('pause').hidden=false;$('resume').focus();}}
function goTo(id){if(!destinations[id])throw new Error('未知地点');resetPosition(id);if($('map-dialog').open)$('map-dialog').close();if($('settings-dialog').open)$('settings-dialog').close();start();toast('已到达'+destinations[id].name);return {location:id};}
function setQuality(value){
  if(!['low','medium','high'].includes(value))return;state.quality=value;engine.setHardwareScalingLevel(value==='low'?1.5:1);rendering.setQuality(value);engine.resize();
}
function attachInputs(){
  $('start').onclick=start;$('resume').onclick=resume;$('map-button').onclick=() => openDialog('map-dialog');$('expand-map').onclick=() => openDialog('map-dialog');$('settings-button').onclick=()=>openDialog('settings-dialog');
  for(const e of document.querySelectorAll('[data-close]'))e.onclick=()=>closeDialog(e.dataset.close);
  for(const e of document.querySelectorAll('[data-go]'))e.onclick=()=>goTo(e.dataset.go);
  for(const id of ['map-dialog','settings-dialog'])$(id).addEventListener('cancel',e=>{e.preventDefault();closeDialog(id);});
  $('quality').onchange=e=>setQuality(e.target.value);$('sensitivity').oninput=e=>state.sensitivity=Number(e.target.value);$('reset').onclick=()=>goTo('gate');
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement){clearInputs();if(ignoreUnlock){ignoreUnlock=false;return;}if(state.started&&!anyDialog())pause();}else ignoreUnlock=false;});
  window.addEventListener('blur',()=>{clearInputs();if(state.started&&!anyDialog())pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();if(state.started&&!anyDialog())pause();}});
  window.addEventListener('keydown',e=>{
    if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
    if(e.code==='Escape'){if(!anyDialog())pause();return;}
    if(e.code==='KeyM'){if(e.repeat)return;e.preventDefault();if($('map-dialog').open)closeDialog('map-dialog');else if(!anyDialog())openDialog('map-dialog');return;}
    if(!state.started||state.paused||anyDialog())return;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    keys.add(e.code);if(e.repeat)return;
    if(e.code==='KeyE')toggleBike();
    if(e.code==='KeyR'){resetPosition('gate');toast('已返回南门');}
    if(e.code==='Space'&&!state.riding&&state.grounded){state.vertical=5.2;state.grounded=false;}
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  canvas.addEventListener('pointerdown',e=>{if(state.started&&!anyDialog()&&!state.paused){drag=true;if(document.pointerLockElement!==canvas)canvas.setPointerCapture?.(e.pointerId);}});
  canvas.addEventListener('pointerup',()=>drag=false);
  window.addEventListener('mousemove',e=>{if(!state.started||state.paused||anyDialog())return;if(document.pointerLockElement===canvas||drag){state.yaw+=e.movementX*.0025*state.sensitivity;state.pitch=clamp(state.pitch+e.movementY*.002*state.sensitivity,-1.2,1.2);}});
  canvas.addEventListener('wheel',e=>{if(!state.started||anyDialog())return;e.preventDefault();state.distance=clamp(state.distance+e.deltaY*.006,2.8,12);},{passive:false});
}
function toggleBike(){
  const p=actors.player.root.position,b=actors.bike.root.position;
  if(state.riding){
    const angle=actors.bike.root.rotation.y;let safe=null;
    for(const s of [-1,1]){const x=b.x+Math.cos(angle)*s*1.15,z=b.z-Math.sin(angle)*s*1.15;if(!world.blocked(x,z,.42)){safe=V(x,world.floorHeight(x,z),z);break;}}
    if(!safe){toast('这里空间不足，请到开阔处下车。');return;}
    state.riding=false;state.speed=0;p.copyFrom(safe);actors.player.root.rotation.y=state.yaw;actors.player.animate(0,0);toast('已下车，自行车停在身旁。');
  }else{
    if(B.Vector3.Distance(p,b)>3.5){toast('先靠近自行车，再按 E；按 R 可把车带回南门。');return;}
    state.riding=true;state.speed=0;state.vertical=0;state.grounded=true;p.copyFrom(b);state.yaw=actors.bike.root.rotation.y;toast('W 加速 · A/D 转向 · S 减速或倒车 · 空格刹车');
  }
}
function moveWithCollision(p,dx,dz,r){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));let moved=0;
  for(let i=0;i<steps;i++){const x=p.x,z=p.z;if(!world.blocked(p.x+dx/steps,p.z,r))p.x+=dx/steps;if(!world.blocked(p.x,p.z+dz/steps,r))p.z+=dz/steps;moved+=Math.hypot(p.x-x,p.z-z);}
  return moved;
}
function updatePlayer(dt){
  const p=actors.player.root.position;const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
  const side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  let moving=0;
  if(state.riding){
    let acceleration=forward>0?4.1:forward<0?(state.speed>.2?-7:-2.5):0;
    state.speed+=acceleration*dt;if(!forward)state.speed*=Math.exp(-.4*dt);if(keys.has('Space'))state.speed*=Math.exp(-7*dt);state.speed=clamp(state.speed,-2.5,11);
    const oldYaw=actors.bike.root.rotation.y,steer=steerBicycle(state.steering,side,state.speed,dt);
    state.steering=steer.angle;actors.bike.root.rotation.y+=steer.yawDelta;
    const angle=actors.bike.root.rotation.y,dist=state.speed*dt;
    moving=moveWithCollision(p,Math.sin(angle)*dist,Math.cos(angle)*dist,.55);
    if(moving<Math.abs(dist)*.35)state.speed*=.25;
    state.travel+=Math.sign(state.speed)*moving;state.phase=state.travel*1.6;actors.player.root.rotation.y=angle;actors.bike.root.position.copyFrom(p);actors.bike.root.position.y=world.floorHeight(p.x,p.z);actors.bike.animate(state.travel,state.steering);
    // Steering also turns the follow camera while preserving manual look offset.
    state.yaw+=actors.bike.root.rotation.y-oldYaw;
    actors.player.animate(state.phase,1,true,state.steering);
  }else{
    const len=Math.hypot(forward,side),run=keys.has('ShiftLeft')||keys.has('ShiftRight');const velocity=run?5.5:2.65;
    if(len){const dx=(Math.sin(state.yaw)*forward+Math.cos(state.yaw)*side)/len,dz=(Math.cos(state.yaw)*forward-Math.sin(state.yaw)*side)/len;moving=moveWithCollision(p,dx*velocity*dt,dz*velocity*dt,.38);const angle=Math.atan2(dx,dz),diff=Math.atan2(Math.sin(angle-actors.player.root.rotation.y),Math.cos(angle-actors.player.root.rotation.y));actors.player.root.rotation.y+=diff*Math.min(1,dt*14);}
    else {const diff=Math.atan2(Math.sin(state.yaw-actors.player.root.rotation.y),Math.cos(state.yaw-actors.player.root.rotation.y));actors.player.root.rotation.y+=Math.sign(diff)*Math.max(0,Math.abs(diff)-.65)*(1-Math.exp(-dt*7));}
    state.speed=moving/dt;state.phase+=moving*(run?2.2:3.8);actors.player.animate(state.phase,moving>.001?(run?1:.65):0,false);
  }
  const floor=world.floorHeight(p.x,p.z);
  if(state.riding){p.y=floor;}else{state.vertical-=13*dt;p.y+=state.vertical*dt;if(p.y<=floor){p.y=floor;state.vertical=0;state.grounded=true;}else state.grounded=false;}
}
function updateCamera(dt){
  const p=actors.player.root.position,target=p.add(V(0,state.riding?1.65:1.48,0));
  const dist=state.distance+(state.riding?1.3:0),offset=V(-Math.sin(state.yaw)*dist*Math.cos(state.pitch),1.0+Math.sin(state.pitch)*dist,-Math.cos(state.yaw)*dist*Math.cos(state.pitch));
  const orbit=target.add(offset),minHeight=world.floorHeight(orbit.x,orbit.z)+.45;
  // At upward angles keep the camera behind the player above the ground, and
  // lift the aim by the same amount instead of pushing the lens into the body.
  const lift=Math.max(0,minHeight-orbit.y);orbit.y+=lift;
  const desired=world.cameraLimit(target,orbit);camera.position=B.Vector3.Lerp(camera.position,desired,1-Math.exp(-dt*13));camera.setTarget(target.add(V(0,lift,0)));
}
function updateHUD(){
  if(!actors)return;const p=actors.player.root.position;let id=p.z< -207?'gate':p.z<13?'square':p.z<149?'library':(Math.abs(p.x)<20&&p.z<185?'datong':'lake'),d=destinations[id];
  $('area-name').textContent=d.name;$('area-caption').textContent=d.en;$('area-hint').textContent=d.hint;
  $('mode').textContent=state.riding?'骑行':(state.speed>4?'跑步':'步行');$('speed').textContent=Math.round(Math.abs(state.speed)*3.6);$('speed-fill').style.width=Math.min(100,Math.abs(state.speed)/11*100)+'%';
  const near=B.Vector3.Distance(p,actors.bike.root.position)<3.5;$('bike-prompt').hidden=!state.started||state.paused||(!state.riding&&!near);$('bike-prompt').querySelector('span').textContent=state.riding?'停下并下车':'骑上自行车';
  $('performance').textContent=`${Math.round(engine.getFps())} FPS · ${state.quality==='high'?'精细':state.quality==='low'?'流畅':'均衡'}画质 · ${actors.npcs.length} 位校园行人`;
}
function drawMap(canvas,large){
  if(!world)return;const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle=large?'#e1e6d9':'#203e37';ctx.fillRect(0,0,w,h);
  const scale=large?Math.min(w/530,h/750):w/430;const player=actors.player.root.position;
  const centerZ=large?0:player.z+22;
  const tx=x=>w/2+x*scale,ty=z=>h/2-(z-centerZ)*scale;
  const rect=(x,z,ww,dd,color)=>{ctx.fillStyle=color;ctx.fillRect(tx(x-ww/2),ty(z+dd/2),ww*scale,dd*scale);};
  rect(0,-197,80,58,large?'#cecaba':'#6c7864');
  const plaza=world.southPlaza;rect(plaza.x,plaza.z,plaza.w,plaza.d,large?'#cfc4aa':'#8c8b72');
  for(const x of [-50,50]){rect(x,-249,12,162,large?'#f7f4e8':'#9eab92');rect(x,92,12,106,large?'#f7f4e8':'#9eab92');}
  rect(0,-272,18,120,large?'#f7f4e8':'#9eab92');
  for(const z of [-231,-173,145,320])rect(0,z,400,10,large?'#f7f4e8':'#9eab92');
  for(const z of [-142,-96,-50,-4])rect(0,z,112,2.4,large?'#98978c':'#646e60');
  rect(plaza.flags.x,plaza.flags.z,14,3.4,large?'#e6e2d4':'#a6ad99');
  for(const b of world.buildings)rect(b.x,b.z,b.w,b.d,large?'#b4ac99':'#80917c');
  ctx.beginPath();for(const [i,p] of world.shorePoints.entries()){if(i)ctx.lineTo(tx(p.x),ty(p.z));else ctx.moveTo(tx(p.x),ty(p.z));}ctx.closePath();ctx.fillStyle=large?'#8cbbb4':'#447c75';ctx.fill();
  const terrace=world.lakeDetails.terrace,arch=world.lakeDetails.arch;rect(terrace.x,terrace.z,terrace.w,terrace.d,large?'#d2d1c6':'#a1aa95');rect(arch.x,arch.z,arch.w,arch.d,large?'#797f79':'#62776b');
  ctx.strokeStyle=large?'#b99154':'#c7b882';ctx.lineWidth=large?3:2;ctx.setLineDash([5,5]);ctx.beginPath();for(const [i,p] of [[0,-270],[0,32],[64,48],[64,140],[72,207]].entries()){if(i)ctx.lineTo(tx(p[0]),ty(p[1]));else ctx.moveTo(tx(p[0]),ty(p[1]));}ctx.stroke();ctx.setLineDash([]);
  if(large){ctx.font='21px "Microsoft YaHei",sans-serif';ctx.textAlign='left';for(const d of Object.values(destinations)){ctx.fillStyle='#234b3d';ctx.beginPath();ctx.arc(tx(d.x),ty(d.z),5,0,Math.PI*2);ctx.fill();ctx.fillText(d.name,tx(d.x)+15,ty(d.z)-9);}}
  for(const n of actors.npcs){ctx.fillStyle=large?'#859783':'#b8c3a1';ctx.beginPath();ctx.arc(tx(n.root.position.x),ty(n.root.position.z),large?2:1.6,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle=large?'#a97732':'#ead79a';ctx.beginPath();ctx.arc(tx(actors.bike.root.position.x),ty(actors.bike.root.position.z),large?4:3,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(tx(player.x),ty(player.z));ctx.rotate(state.yaw);ctx.fillStyle=large?'#1d604f':'#f3ecce';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(-6,7);ctx.lineTo(0,4);ctx.lineTo(6,7);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle=large?'#355848':'#dce2cf';ctx.font=`${large?20:20}px sans-serif`;ctx.textAlign='right';ctx.fillText('N ↑',w-18,28);
}
function registerAgentTools(){
  if(!document.modelContext?.registerTool)return;
  try{Promise.resolve(document.modelContext.registerTool({name:'navigate_campus',title:'前往校园地点',description:'将当前玩家和自行车移动到南门、南广场、图书馆或明向湖，并开始漫游。',inputSchema:{type:'object',properties:{destination:{type:'string',enum:Object.keys(destinations)}},required:['destination'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!destinations[input.destination])throw new Error('请选择有效校园地点');return goTo(input.destination);}})).catch(console.warn);}catch(error){console.warn(error);}
}

function exportModel(){
  const geometries={},materials={},meshes=[];
  for(const mesh of scene.meshes){
    if(!mesh.isVisible||!mesh.isEnabled()||mesh.name==='sky-dome')continue;
    const source=mesh.sourceMesh||mesh,geometry=source.geometry;
    if(!geometry)continue;
    const id=geometry.uniqueId;
    if(!geometries[id])geometries[id]={positions:Array.from(source.getVerticesData('position')||[]),indices:Array.from(source.getIndices()||[]),uvs:Array.from(source.getVerticesData('uv')||[])};
    const material=mesh.material||source.material,mid=material?.uniqueId??'default';
    if(!materials[mid]){
      const color=material?.diffuseColor?.asArray()||[.15,.35,.32];
      const texture=material?.diffuseTexture;
      materials[mid]={name:material?.name||'default',color,alpha:material?.alpha??1,doubleSided:material?.backFaceCulling===false,texture:texture?.getContext?texture.getContext().canvas.toDataURL('image/png'):null,uScale:texture?.uScale||1,vScale:texture?.vScale||1,hasAlpha:texture?.hasAlpha||false};
    }
    mesh.computeWorldMatrix(true);meshes.push({name:mesh.name,geometry:id,material:mid,matrix:Array.from(mesh.getWorldMatrix().m)});
  }
  return {format:'mingxiang-scene-1',note:'根据用户全景录屏估算建模，非测绘模型。X 东，Z 北，Y 高程；单位米。',geometries,materials,meshes};
}

