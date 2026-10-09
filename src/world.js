import * as B from '@babylonjs/core';
import {buildSouthPlaza,southPlaza} from './south-plaza.js';
import {libraryEntrance,flightLength,upperFlightZ,stairEndZ,entranceY,libraryFloorHeight,libraryStairWidth} from './library-entrance.js';
import {surfaceMaterial,scannedSurface} from './materials.js';
import {buildLakeDetails,lakeDetails,lakeAccessContains,lakeDetailFloorHeight} from './lake-details.js';

export const destinations = {
  gate: { name: '南门', en: 'SOUTH ENTRANCE', x: 0, z: -270, hint: '沿中轴向北，穿过南广场' },
  square: { name: '南广场', en: 'SOUTH SQUARE', x: 0, z: -110, hint: '穿过开阔广场，沿中轴前往图书馆' },
  library: { name: '图书馆', en: 'THE LIBRARY', x: 0, z: 32, hint: '沿图书馆东侧道路，继续前往明向湖' },
  lake: { name: '明向湖', en: 'MINGXIANG LAKE', x: 70, z: 207, hint: '沿岸慢行，湖畔的风景值得停留' },
  datong: { name: '大同坊', en: 'DATONG ARCHWAY', x: 0, z: 152, hint: '登上石阶，穿过牌坊到达临湖台地' },
};

export function buildWorld(scene, shadow) {
  let seed = 73521;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const colliders = [], batches = new Map(), buildings = [], trees = [];
  const c = hex => B.Color3.FromHexString(hex);
  const V = (x,y,z) => new B.Vector3(x,y,z);
  const mat = (name, hex, rough = 0.85) => {
    return surfaceMaterial(scene,name,hex,rough);
  };
  const stone=mat('limestone','#c8bba4'), trim=mat('pale-stone','#e5dcc8'), base=mat('foundation','#8c887c'),
    roof=mat('terracotta','#873b32'), roofEdge=mat('roof-edge','#a65743'), dark=mat('metal','#313d3b'),
    glass=mat('deep-blue-glass','#2b4851',.46), glass2=mat('reflected-glass','#53717b',.4),
    wood=mat('warm-wood','#76533b'), white=mat('road-markings','#d8d2b2'), grass=mat('lawn','#69804c'),
    paving=mat('plaza','#c9c1a9'), pavingDark=mat('plaza-bands','#827e71'), asphalt=mat('asphalt','#777977'),
    gravel=mat('lakeside-path','#c8bba0'), soil=mat('soil','#76654d'), bark=mat('tree-bark','#6a5840'),
    silver=mat('railings','#9ba7a0',.52), hedgeMat=mat('hedges','#465c35'), rockMat=mat('shore-rock','#8c917c');
  glass.emissiveColor=c('#14262b').scale(.15); glass2.emissiveColor=c('#304951').scale(.12);
  glass.diffuseColor=c('#3e6577');glass.emissiveColor=c('#294652').scale(.18);

  function noiseTexture(name, material, color, repeat, tile=false) {
    const tex=new B.DynamicTexture(name,{width:256,height:256},scene,true);
    const ctx=tex.getContext();ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
    for(let i=0;i<15000;i++){const v=random()>.5?255:0;ctx.fillStyle=`rgba(${v},${v},${v},${random()*.16})`;ctx.fillRect(random()*256,random()*256,1+random()*2,1+random()*2);}
    if(tile){ctx.strokeStyle='#504c432b';ctx.lineWidth=1;for(let i=0;i<=256;i+=64){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();}}
    tex.update();tex.wrapU=tex.wrapV=B.Texture.WRAP_ADDRESSMODE;tex.uScale=repeat;tex.vScale=repeat;tex.anisotropicFilteringLevel=8;material.diffuseTexture=tex;material.diffuseColor=B.Color3.White();
  }
  noiseTexture('grass-grain',grass,'#68794a',100);
  noiseTexture('pavement-grain',paving,'#bcb6a3',28,true);
  noiseTexture('road-grain',asphalt,'#777977',16);
  noiseTexture('sand-grain',gravel,'#bdb29a',8);
  // Sandstone cladding is tiled in world metres, so a small pier and a wide wall
  // have the same grain and joint scale after static geometry is merged.
  const wallTexture=new B.DynamicTexture('sandstone-cladding',{width:512,height:512},scene,true),wallContext=wallTexture.getContext();
  wallContext.fillStyle='#c8bba4';wallContext.fillRect(0,0,512,512);
  for(let i=0;i<26000;i++){wallContext.fillStyle=random()>.5?'rgba(245,237,216,.09)':'rgba(77,68,54,.08)';wallContext.fillRect(random()*512,random()*512,1,1);}
  wallContext.strokeStyle='rgba(81,73,62,.22)';wallContext.lineWidth=1.2;
  for(let row=0;row<4;row++){
    const y=row*128;wallContext.beginPath();wallContext.moveTo(0,y);wallContext.lineTo(512,y);wallContext.stroke();
    for(let x=(row%2)*128;x<=512;x+=256){wallContext.beginPath();wallContext.moveTo(x,y);wallContext.lineTo(x,y+128);wallContext.stroke();}
  }
  wallTexture.update();wallTexture.wrapU=wallTexture.wrapV=B.Texture.WRAP_ADDRESSMODE;wallTexture.anisotropicFilteringLevel=8;
  stone.diffuseTexture=wallTexture;stone.diffuseColor=B.Color3.White();stone.metadata={stoneTileSize:2};
  scannedSurface(scene,grass,'grass_ground',210,210,'#87957a',.3);
  scannedSurface(scene,asphalt,'asphalt_02',1,1,'#aaa9a2',.35);asphalt.metadata={stoneTileSize:3};
  scannedSurface(scene,stone,'beige_wall_001',1,1,'#ffedce',.08);stone.albedoTexture.level=1.3;stone.metadata={stoneTileSize:3};
  scannedSurface(scene,trim,'beige_wall_001',1,1,'#fff4df',.05);trim.albedoTexture.level=1.5;trim.metadata={stoneTileSize:2};
  scannedSurface(scene,base,'concrete_layers_02',1,1,'#b9b6a8',.12);base.metadata={stoneTileSize:2};
  scannedSurface(scene,roof,'clay_roof_tiles',1,1,'#c5ada0',.38);
  silver.metallic=.72;silver.roughness=.34;glass.metallic=.65;glass.roughness=.19;
  glass2.metallic=.55;glass2.roughness=.25;

  const queue=(mesh,material,cast=true)=>{
    mesh.material=material;mesh.receiveShadows=true;mesh.isPickable=false;
    const key=material.name+'_'+cast;if(!batches.has(key))batches.set(key,{material,cast,meshes:[]});batches.get(key).meshes.push(mesh);return mesh;
  };
  const box=(name,x,y,z,w,h,d,material,cast=true)=>{
    const m=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);
    const tile=material.metadata?.stoneTileSize;
    if(tile){
      const p=m.getVerticesData(B.VertexBuffer.PositionKind),n=m.getVerticesData(B.VertexBuffer.NormalKind),uv=[];
      for(let i=0;i<p.length;i+=3){
        if(Math.abs(n[i+1])>.5)uv.push((p[i]+w/2)/tile,(p[i+2]+d/2)/tile);
        else if(Math.abs(n[i])>.5)uv.push((p[i+2]+d/2)/tile,(p[i+1]+h/2)/tile);
        else uv.push((p[i]+w/2)/tile,(p[i+1]+h/2)/tile);
      }
      m.setVerticesData(B.VertexBuffer.UVKind,uv);
    }
    m.position.set(x,y,z);return queue(m,material,cast);
  };
  const sphere=(name,x,y,z,sx,sy,sz,material,segments=8)=>{const m=B.MeshBuilder.CreateSphere(name,{diameter:2,segments},scene);m.position.set(x,y,z);m.scaling.set(sx,sy,sz);return queue(m,material);};
  const cyl=(name,x,y,z,h,r1,r2,material,n=12)=>{const m=B.MeshBuilder.CreateCylinder(name,{height:h,diameterTop:r1*2,diameterBottom:r2*2,tessellation:n},scene);m.position.set(x,y,z);return queue(m,material);};
  function rod(name,a,b,r,material){const diff=b.subtract(a);const m=cyl(name,0,0,0,diff.length(),r,r,material,8);m.position=a.add(b).scale(.5);m.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,diff.normalize(),new B.Quaternion());return m;}
  function collider(x,z,w,d,name){colliders.push({x,z,w:w/2,d:d/2,name});}
  function hipRoof(x,z,w,d,y,h,roofMaterial=roof,edgeMaterial=roofEdge){
    const pos=[x-w/2,y,z-d/2,x+w/2,y,z-d/2,x+w/2,y,z+d/2,x-w/2,y,z+d/2,x-w*.29,y+h,z,x+w*.29,y+h,z];
    const ind=[0,5,4,0,1,5,1,2,5,2,4,5,2,3,4,3,0,4];
    const n=[];B.VertexData.ComputeNormals(pos,ind,n);const vd=new B.VertexData();vd.positions=pos;vd.indices=ind;vd.normals=n;vd.uvs=pos.flatMap((_,i)=>i%3===0?[pos[i]/2,pos[i+2]/2]:[]);
    const m=new B.Mesh('hip-roof',scene);vd.applyToMesh(m);roofMaterial.backFaceCulling=false;queue(m,roofMaterial);
    box('roof-eave',x,y-.2,z,w+.5,.5,d+.5,edgeMaterial);
    // Raised seams carry the ridges seen in the panorama.
    rod('roof-ridge',V(x-w*.29,y+h+.06,z),V(x+w*.29,y+h+.06,z),.08,edgeMaterial);
  }
  function facadeBuilding(name,x,z,w,d,floors,options={}){
    const y0=options.y||0,h=floors*3.8+1.5;
    box(name,x,y0+h/2,z,w,h,d,stone);box('stone-base',x,y0+.65,z,w+.5,1.3,d+.5,base);
    for(let f=0;f<floors;f++){
      const yy=y0+2.7+f*3.8;
      for(let xx=x-w/2+2.3;xx<x+w/2-1.4;xx+=3.8){
        for(const side of [-1,1]){box('window',xx,yy,z+side*(d/2+.035),1.85,2.25,.1,random()>.25?glass:glass2,false);box('sill',xx,yy-1.18,z+side*(d/2+.18),2.12,.17,.35,trim);box('mullion',xx,yy,z+side*(d/2+.11),.06,2.22,.08,trim,false);}
      }
      for(let zz=z-d/2+2.5;zz<z+d/2-1.3;zz+=3.8)for(const side of [-1,1]){box('side-window',x+side*(w/2+.04),yy,zz,.1,2.25,1.85,glass,false);box('side-sill',x+side*(w/2+.2),yy-1.18,zz,.35,.17,2.1,trim);}
      if(f===floors-1||f===0)box('string-course',x,yy+1.4,z,w+.4,.24,d+.4,trim);
    }
    for(const side of [-1,1])for(const edge of [-1,1])box('corner-pilaster',x+side*(w/2-.48),y0+h/2,z+edge*(d/2+.1),.95,h,.35,trim);
    if(options.flatRoof)box('flat-stone-parapet',x,y0+h+.3,z,w+.8,.6,d+.8,trim);
    else hipRoof(x,z,w+2,d+2,y0+h+.2,options.roofHeight??3.2);
    collider(x,z,w+1,d+1,name);buildings.push({name,x,z,w,d});return h;
  }
  function textSign(text,x,y,z,width,height,materialColor='#ded7bd'){
    const dt=new B.DynamicTexture('sign-'+text,{width:1024,height:128},scene,true);const ctx=dt.getContext();ctx.clearRect(0,0,1024,128);ctx.font='bold 66px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=materialColor;ctx.fillText(text,512,66);dt.update();dt.hasAlpha=true;
    const m=new B.StandardMaterial('sign-ink',scene);m.diffuseTexture=dt;m.emissiveColor=B.Color3.White().scale(.4);m.useAlphaFromDiffuseTexture=true;m.backFaceCulling=false;m.specularColor=B.Color3.Black();
    const p=B.MeshBuilder.CreatePlane('sign',{width,height},scene);p.position.set(x,y,z);p.material=m;p.isPickable=false;return p;
  }

  // North is +Z. All dimensions are estimates inferred from the supplied panorama.
  box('terrain',0,-.4,0,1450,.6,1450,grass,false);
  box('south-entry-promenade',0,.005,-197,80,.16,58,paving,false);
  box('entry-road',0,.02,-272,18,.16,120,asphalt,false);
  for(const x of [-50,50]){
    box('south-approach-road',x,.03,-249,12,.16,162,asphalt,false);
    box('library-side-road',x,.03,92,12,.16,106,asphalt,false);
  }
  for(const z of [-231,-173,145,320])box('cross-road',0,.035,z,400,.16,10,asphalt,false);
  for(const x of [-41.2,41.2])box('south-approach-sidewalk',x,.13,-249,4,.28,162,gravel,false);
  for(const x of [-57.5,57.5])box('south-outer-sidewalk',x,.12,-249,3,.25,162,gravel,false);
  for(const z of [-205,-175])box('entry-plaza-band',0,.1,z,80,.025,1.3,pavingDark,false);
  for(const x of [-50,50])for(let z=-310;z<139;z+=14)if(z< -168||z>38)box('road-dash',x,.125,z,.14,.012,5,white,false);
  for(const z of [-236,139])for(let x=-54;x<=54;x+=2.3)if(Math.abs(x)>43)box('crosswalk',x,.13,z,1.3,.02,4.5,white,false);
  for(const x of [-40,40,-59.4,59.4])box('south-approach-curb',x,.22,-249,.3,.38,162,trim,false);

  // South river and approach bridge.
  const river=mat('river','#547f7e',.25);
  box('south-water',0,-.26,-331,1100,.1,32,river,false);
  box('bridge',0,.06,-331,23,.24,46,pavingDark,false);
  for(const x of [-11.6,11.6]){box('bridge-wall',x,.7,-331,.55,1.3,46,trim);for(let z=-352;z<-310;z+=3.5)box('bridge-post',x,1.15,z,.7,2.1,.7,trim);box('bridge-rail',x,1.9,-331,.6,.2,46,trim);}
  box('gate-forecourt',0,.08,-301,88,.16,27,paving,false);
  for(const side of [-1,1]){
    const x=side*38;
    box('gatehouse',x,2.6,-278,24,5.2,11,stone);
    hipRoof(x,-278,26,13,5.3,1.2);
    box('gatehouse-tower',side*28,4.8,-275,7.2,9.6,9,stone);
    for(const y of [7.4,9.6])box('gatehouse-tower-cornice',side*28,y,-275,7.7,.3,9.5,trim);
    box('gatehouse-tower-window',side*28,7.9,-279.58,2,1.8,.12,glass);
    for(let dx=-6;dx<=6;dx+=3)box('gatehouse-window',x+dx,2.6,-283.58,1.5,2.2,.12,glass);
    box('gate-entry-lane',side*22,.12,-289,9,.08,31,asphalt,false);
    collider(x,-278,24,11,'南门门房');collider(side*28,-275,7.2,9,'南门塔楼');
    buildings.push({name:'南门门房',x,z:-278,w:24,d:11});
  }
  box('campus-name-wall',0,1.3,-294,32,2.6,1.5,trim);
  box('campus-name-wall-foot',0,.25,-294,33.5,.5,2.6,base);
  textSign('太 原 理 工 大 学',0,1.45,-294.81,28,1.55,'#893e36');
  collider(0,-294,33.5,2.6,'南门校名墙');
  for(const x of [-52,52])box('entry-planter',x,.5,-259,13,1,16,base);

  // The library: tall central stack with vertical glazing, low symmetric wings.
  for(const x of [-28,28])box('library-wing-foundation',x,entranceY/2,91,27,entranceY,43,base);
  facadeBuilding('图书馆西翼',-28,91,27,43,3,{flatRoof:true,y:entranceY});
  facadeBuilding('图书馆东翼',28,91,27,43,3,{flatRoof:true,y:entranceY});
  // The stack rises directly behind the central podium; the old deep setback
  // hid its lower storeys from the entrance and made the tower look squat.
  facadeBuilding('图书馆主楼',0,79,32,34,11,{roofHeight:2.4});
  box('library-podium',0,8.1,70,76,16.2,20,stone);
  collider(0,70,76,20,'图书馆门厅');buildings.push({name:'图书馆',x:0,z:82,w:84,d:62});
  function archedOpening(x,z,w,h,y=entranceY){
    const radius=w/2,center=y+h-radius;
    box('arched-window-lower',x,(y+center)/2,z,w,center-y,.12,glass,false);
    const positions=[x,center,z-.07],indices=[],uvs=[.5,.5];
    for(let i=0;i<=24;i++){const a=i*Math.PI/24;positions.push(x+Math.cos(a)*radius,center+Math.sin(a)*radius,z-.07);uvs.push(.5+Math.cos(a)*.5,.5+Math.sin(a)*.5);if(i<24)indices.push(0,i+1,i+2);}
    const normals=[];B.VertexData.ComputeNormals(positions,indices,normals);
    const vd=new B.VertexData();vd.positions=positions;vd.indices=indices;vd.normals=normals;vd.uvs=uvs;
    const mesh=new B.Mesh('arched-window-top',scene);vd.applyToMesh(mesh);glass.backFaceCulling=false;queue(mesh,glass,false);
    for(let i=0;i<24;i++){
      const a=i*Math.PI/24,b=(i+1)*Math.PI/24,r=radius+.19;
      rod('arch-stone-surround',V(x+Math.cos(a)*r,center+Math.sin(a)*r,z-.14),V(x+Math.cos(b)*r,center+Math.sin(b)*r,z-.14),.2,trim);
    }
    for(const side of [-1,1])box('arch-stone-jamb',x+side*(radius+.18),(y+center)/2,z-.12,.4,center-y,.35,trim);
    for(const dx of [-w*.25,0,w*.25])box('door-mullion',x+dx,(y+center)/2,z-.15,.075,center-y,.12,dark,false);
    for(const yy of [y+2.6,center])box('door-transom',x,yy,z-.15,w,.085,.12,dark,false);
    for(const side of [-1,1])box('door-pull',x+side*.17,y+1.5,z-.22,.045,.55,.05,silver,false);
  }
  box('library-raised-foundation',0,entranceY/2,59.7,76,entranceY,.5,base);
  for(let x=-15.6;x<=15.7;x+=5.2)archedOpening(x,59.77,3.8,7.5);
  for(const x of [-29,29]){
    box('library-wing-front',x,10.6,59.3,23,12.48,1.4,stone);
    collider(x,59.3,23,1.4,'图书馆两翼前墙');
    archedOpening(x,58.52,5.8,11.3);
    for(const side of [-1,1]){
      box('library-wing-tall-side-window',x+side*7.8,8.9,58.5,3.7,8.6,.16,glass,false);
      box('library-wing-upper-side-window',x+side*7.8,16,58.5,2.8,2.2,.16,glass,false);
      box('library-wing-window-mullion',x+side*7.8,8.9,58.37,.09,8.6,.1,dark,false);
      for(const yy of [6.7,9,11.3])box('library-wing-window-transom',x+side*7.8,yy,58.37,3.7,.08,.1,dark,false);
    }
    box('library-wing-parapet',x,18,59.3,24,.8,2.1,trim);
  }
  for(const x of [-40,-33,-25,-18.2,-13,-7.8,-2.6,2.6,7.8,13,18.2,25,33,40])box('library-square-pier',x,10.25,59.3,.85,11.78,.8,trim);
  for(let x=-15.6;x<=15.7;x+=5.2)box('library-upper-small-window',x,14.1,59.05,2.3,1.55,.12,glass,false);
  box('library-entablature',0,16,59,78,1.05,2.8,trim);
  // Cover central front with the uninterrupted tall bays visible in the reference.
  box('tower-front',0,29.8,61.8,31,26.8,.5,stone);
  for(const x of [-8.4,-4.2,0,4.2,8.4]){
    box('tower-glass-bay',x,27.8,61.45,2.5,23.2,.22,glass);
    for(let y=18.1;y<39.4;y+=2.65)box('tower-bay-divider',x,y,61.25,2.5,.28,.12,trim,false);
    for(const dx of [-1.4,1.4])box('tower-bay-stone-frame',x+dx,27.8,61.2,.22,23.6,.24,trim);
  }
  for(const x of [-13,13]){
    box('tower-outer-narrow-bay',x,27.8,61.45,1.05,23.2,.22,glass,false);
    for(let y=40.05;y<42.5;y+=.23)box('tower-top-louver',x,y,61.36,3.1,.08,.16,base,false);
  }
  for(const x of [-8.4,-4.2,0,4.2,8.4])box('tower-top-window',x,41.1,61.42,2.7,3.2,.22,glass,false);
  box('tower-top-cornice',0,43.4,79,33.5,.7,35.5,trim);
  const entry=libraryEntrance;
  for(let flight=0;flight<2;flight++)for(let i=0;i<entry.stepsPerFlight;i++){
    const top=entry.groundY+(flight*entry.stepsPerFlight+i+1)*entry.riser;
    const front=(flight?upperFlightZ:entry.startZ)+i*entry.tread;
    const width=libraryStairWidth(front+.001);
    box('library-step',0,top/2,front+entry.tread/2,width,top,entry.tread,trim,false);
    box('library-step-nosing',0,top+.01,front+.05,width,.018,.1,trim,false);
  }
  const midY=entry.groundY+entry.stepsPerFlight*entry.riser;
  box('library-middle-landing',0,midY/2,entry.startZ+flightLength+entry.middleLanding/2,entry.middleWidth,midY,entry.middleLanding,trim,false);
  box('library-upper-landing',0,entranceY/2,(stairEndZ+entry.doorZ)/2,entry.upperWidth,entranceY,entry.doorZ-stairEndZ,trim,false);
  // Stepped terrace is traversable using the separate height field.
  for(const side of [-1,1])for(let i=0;i<3;i++){
    const half=[34,27,20][i],w=42-half-.7,x=side*(half+.7+w/2),z=[45.7,49.7,54.1][i],d=[3.4,4.5,4][i],y=[.65,1.3,1.95][i];
    box('library-terraced-planter',x,y,z,w,y*2,d,base);
    box('library-terraced-hedge',x,y*2+.25,z,w-.45,.5,d-.35,hedgeMat);collider(x,z,w,d,'花坛');
  }

  // Flanking administrative and teaching buildings, using the same campus palette.
  facadeBuilding('行政楼',-100,-221,51,24,9);facadeBuilding('科技楼',100,-221,51,24,9);
  for(const x of [-100,100]){facadeBuilding('低层裙楼',x,-247,68,17,3);box('building-court',x,.09,-269,65,.16,24,paving,false);}
  // User aerials: museum and clock are east of the square, museum south of clock.
  facadeBuilding('校史馆',90,-131,42,56,3,{roofHeight:1.6});facadeBuilding('校史馆侧翼',120,-99,24,68,3,{roofHeight:1.6});
  const museumGranite=mat('museum-dark-granite','#6c6b64',.94);
  box('museum-colonnade-back',68.9,3.6,-131,.6,6.8,56,museumGranite);
  for(let z=-156;z<=-106;z+=3.6){
    if(Math.abs(z+131)<4)continue;
    box('museum-deep-window',68.5,3.5,z,.14,4.8,2.25,glass,false);
    box('museum-colonnade-pier',68.2,3.5,z+1.5,1.4,6.2,.6,museumGranite);
  }
  box('museum-colonnade-beam',68.2,6.9,-131,1.8,.85,58,museumGranite);
  // Turn the large arched entrance toward the plaza (west).
  const beforeArch=new Map([...batches].map(([key,batch])=>[key,batch.meshes.length]));
  archedOpening(0,0,4.8,8,.16);
  for(const [key,batch] of batches)for(const mesh of batch.meshes.slice(beforeArch.get(key)||0)){
    const p=mesh.position.clone();mesh.position.set(68.65+p.z,p.y,-131-p.x);mesh.rotate(B.Axis.Y.clone(),Math.PI/2,B.Space.WORLD);
  }
  box('museum-clock-connector',96,3.5,-78,30,7,7,stone);
  collider(96,-78,30,7,'校史馆钟楼连廊');
  facadeBuilding('西侧学院楼',-102,-121,70,20,5);facadeBuilding('西侧学院楼侧翼',-130,-84,18,56,5);
  facadeBuilding('行思楼',-99,4,72,20,3,{roofHeight:1.4});facadeBuilding('行思楼侧翼',-128,39,18,52,5);
  facadeBuilding('明向会堂',101,12,47,30,3);facadeBuilding('教学楼',93,-179,36,18,3);
  // Tall arched side-building windows and a projecting entrance, visible from the plaza.
  for(const side of [-1,1]){
    const x=side<0?-62.9:77.3,centerZ=side<0?4:12;
    for(const z of [centerZ-7,centerZ,centerZ+7]){
      box('plaza-side-building-tall-window',x,4.2,z,.13,6.1,3,glass,false);
      for(const dz of [-1.7,1.7])box('plaza-side-building-pier',x-side*.25,4.2,z+dz,.55,6.9,.4,trim);
      box('plaza-side-building-lintel',x-side*.25,7.8,z,.55,.55,3.8,trim);
    }
  }
  for(let z=-210;z<300;z+=83)for(const x of [-197,197])facadeBuilding('远景教学楼',x,z,48,20,5+(z%2===0?1:0));
  for(const x of [-112,113])facadeBuilding('北侧教学楼',x,309,69,22,5);

  // Lake: an irregular, gently scalloped shore, ring path, garden and pavilion.
  const lake={x:0,z:227,rx:63,rz:69};
  const shoreFactor=a=>.93+.045*Math.cos(3*a)+.025*Math.sin(5*a);
  const shorePoint=(a,offset=0)=>({x:lake.x+Math.cos(a)*(lake.rx*shoreFactor(a)+offset),z:lake.z+Math.sin(a)*(lake.rz*shoreFactor(a)+offset)});
  const shorePoints=Array.from({length:100},(_,i)=>shorePoint(i*Math.PI*2/100));
  function lakeSurface(name,offset,y,material){
    const positions=[lake.x,y,lake.z],indices=[],normals=[],uvs=[.5,.5];
    for(let i=0;i<=100;i++){const p=shorePoint(i*Math.PI*2/100,offset);positions.push(p.x,y,p.z);uvs.push((p.x-lake.x)/(lake.rx*2)+.5,(p.z-lake.z)/(lake.rz*2)+.5);if(i<100)indices.push(0,i+2,i+1);}
    B.VertexData.ComputeNormals(positions,indices,normals);const vd=new B.VertexData();vd.positions=positions;vd.indices=indices;vd.normals=normals;vd.uvs=uvs;
    const m=new B.Mesh(name,scene);vd.applyToMesh(m);queue(m,material,false);return m;
  }
  lakeSurface('lake-path',8,.06,gravel);lakeSurface('shore-bank',2,.11,rockMat);
  const water=new B.ShaderMaterial('moving-water',scene,{vertexSource:`precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;uniform mat4 world;varying vec3 vP;void main(){vP=(world*vec4(position,1.)).xyz;gl_Position=worldViewProjection*vec4(position,1.);}`,fragmentSource:`precision highp float;varying vec3 vP;uniform float time;uniform vec3 eye;void main(){float a=sin(vP.x*1.2+vP.z*.6+time*1.1);float b=sin(vP.z*1.7-vP.x*.2+time*.8);vec3 n=normalize(vec3(a*.075,1.,b*.085));vec3 v=normalize(eye-vP);float fres=pow(1.-max(dot(v,n),0.),3.);vec3 deep=vec3(.13,.28,.25);vec3 sky=vec3(.55,.70,.72);vec3 col=mix(deep,sky,.18+fres*.68);vec3 l=normalize(vec3(-.5,.7,-.4));float spec=pow(max(dot(reflect(-l,n),v),0.),150.);col+=vec3(1.,.86,.61)*spec*.65;col+=.012*(a+b);gl_FragColor=vec4(col,1.);}`},{attributes:['position'],uniforms:['worldViewProjection','world','time','eye']});
  water.backFaceCulling=false;
  lakeSurface('mingxiang-water',0,.14,water);
  // Supplied video: Datong archway is on the library-side terrace. The shore is
  // lined with rocks and planting; white balustrades surround the terrace only.
  buildLakeDetails(scene,{box,cyl,rod,sphere,queue,collider,mat,V,random,rockMat,gravel,shorePoint});
  // East path takes players from the library around to the lake.
  box('lake-approach',72,.07,167,8,.12,61,gravel,false);
  box('lake-approach-link',65,.07,140,22,.12,8,gravel,false);
  box('library-east-path',64,.1,105,8,.2,52,gravel,false);
  box('library-front-link',47,.1,48,38,.2,7,gravel,false);

  function bench(x,z,rotation=0){
    const parts=[];const make=(dx,y,dz,w,h,d,m)=>{const p=box('bench',x+dx,y,z+dz,w,h,d,m);parts.push(p);};
    for(const xx of [-.85,.85])make(xx,.37,0,.13,.74,.55,dark);
    for(let j=0;j<3;j++)make(0,.78,-.22+j*.2,2.25,.12,.16,wood);
    for(let j=0;j<3;j++)make(0,1.06+j*.17,.34,2.25,.12,.1,wood);
    for(const xx of [-.9,.9])make(xx,1,.34,.09,1,.09,dark);
    if(rotation)for(const p of parts){const dx=p.position.x-x,dz=p.position.z-z;p.position.x=x+dx*Math.cos(rotation)+dz*Math.sin(rotation);p.position.z=z-dx*Math.sin(rotation)+dz*Math.cos(rotation);p.rotation.y=rotation;}
    collider(x,z,2.4,1,'长椅');
  }
  function lamp(x,z){cyl('lamp-pole',x,3.3,z,6.6,.06,.11,dark,8);cyl('lamp-base',x,.24,z,.48,.16,.21,dark,8);box('lamp-arm',x+.5,6.55,z,1.1,.1,.1,dark);box('lamp-head',x+1,6.5,z,.65,.13,.3,silver);}
  for(let z=-253;z< -168;z+=25)for(const x of [-37,37]){lamp(x,z);if(z%2===0)bench(x+Math.sign(x)*.4,z+7,Math.sign(x)*Math.PI/2);}
  for(const x of [-58.5,58.5])for(const z of [-126,-82,-38,24])bench(x,z,Math.sign(x)*Math.PI/2);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;bench(Math.cos(a)*75,lake.z+Math.sin(a)*81,-a+Math.PI/2);}
  for(let z=75;z<303;z+=30)lamp(77,z);
  for(const side of [-1,1])for(let z=-211;z<-20;z+=60){const x=side*(z< -168?35:58.5);cyl('bin',x,.5,z,1,.3,.3,dark);cyl('bin-lid',x,1.05,z,.1,.33,.33,silver);colliders.push({x,z,r:.33,name:'垃圾桶'});}

  // Leaf cards with transparent, individually drawn foliage keep trees rich but affordable.
  const treePrototypes=[];
  for(let type=0;type<3;type++){
    const tex=new B.DynamicTexture('leaf-cluster-'+type,{width:128,height:128},scene,true);const ctx=tex.getContext();ctx.clearRect(0,0,128,128);
    for(let i=0;i<300;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*53,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r*.82;const g=85+Math.floor(random()*70);ctx.fillStyle=`rgba(${g*.71|0},${g},${g*.38|0},.95)`;ctx.beginPath();ctx.ellipse(x,y,2+random()*4,1.5+random()*3,random()*Math.PI,0,Math.PI*2);ctx.fill();}
    tex.update();tex.hasAlpha=true;const lm=mat('leaf-'+type,'#ffffff',.95);lm.diffuseTexture=tex;lm.useAlphaFromDiffuseTexture=true;lm.transparencyMode=B.Material.MATERIAL_ALPHATEST;lm.alphaCutOff=.45;lm.backFaceCulling=false;lm.twoSidedLighting=true;lm.emissiveColor=new B.Color3(.018,.033,.009);
    const leafParts=[];
    for(let i=0;i<64;i++){const m=B.MeshBuilder.CreatePlane('leaf',{size:1.45+random()*.85,sideOrientation:B.Mesh.DOUBLESIDE},scene);const a=i*2.399,r=Math.sqrt(random())*2.4;m.position.set(Math.cos(a)*r,4.1+random()*3.4,Math.sin(a)*r);m.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);leafParts.push(m);}
    const leaves=B.Mesh.MergeMeshes(leafParts,true,true);leaves.material=lm;leaves.isVisible=false;leaves.isPickable=false;
    treePrototypes.push(leaves);
  }
  function tree(x,z,scale=1){
    cyl('trunk',x,2.05*scale,z,4.1*scale,.13*scale,.23*scale,bark,7);
    for(let i=0;i<3;i++){const a=i*2.1;rod('branch',V(x,2.1*scale,z),V(x+Math.cos(a)*1.5*scale,4.9*scale,z+Math.sin(a)*1.5*scale),.07*scale,bark);}
    const t=treePrototypes[Math.floor(random()*3)].createInstance('tree-foliage');t.position.set(x,0,z);t.scaling.setAll(scale);t.rotation.y=random()*6.28;t.isPickable=false;t.receiveShadows=true;shadow.addShadowCaster(t);trees.push({x,z});
    colliders.push({x,z,r:.3*scale,name:'树干'});
    box('tree-bed',x,.07,z,1.9*scale,.12,1.9*scale,soil,false);
  }
  for(let z=-254;z< -168;z+=12)for(const x of [-33,33])tree(x,z,.9+random()*.38);
  for(let z=-280;z<315;z+=16)for(const x of [-63,63])if(z< -168||(z>36&&z<140)||z>310)tree(x,z,1.1+random()*.4);
  for(let i=0;i<75;i++){const a=random()*Math.PI*2;const rr=82+random()*24;const x=Math.cos(a)*rr,z=lake.z+Math.sin(a)*rr;if(z>143&&z<308&&Math.abs(x)>72)tree(x,z,.8+random()*.8);}
  for(const x of [-165,164])for(let z=-291;z<319;z+=18)tree(x+random()*7,z,1.2+random()*.6);
  for(let i=0;i<24;i++){const x=(i%2?1:-1)*(68+random()*80),z=-294+random()*12;tree(x,z,1+random()*.4);}

  const plazaDetails=buildSouthPlaza(scene,{box,cyl,sphere,rod,queue,collider,random,V,mat,glass,trim,dark,silver,soil,stone,colliders,trees,buildings,shadow});

  // Distant hills, kept low and desaturated like the panorama skyline.
  const hills=mat('horizon-hills','#8c9f9e');hills.specularColor=B.Color3.Black();hills.backFaceCulling=false;
  const ridge=[];for(let i=0;i<=90;i++){const x=-1500+i*34;ridge.push(V(x,11+Math.sin(i*.21)*13+Math.sin(i*.083)*18,830));}
  const hillMesh=B.MeshBuilder.CreateRibbon('distant-ridge',{pathArray:[ridge.map(p=>V(p.x,-20,790)),ridge,ridge.map(p=>V(p.x,-10,1020))],sideOrientation:B.Mesh.DOUBLESIDE},scene);queue(hillMesh,hills,false);

  let staticMeshes=0;
  for(const {material,cast,meshes} of batches.values()){
    if(!meshes.length)continue;
    const m=B.Mesh.MergeMeshes(meshes,true,true,undefined,false,false);m.name='campus-'+material.name;m.material=material;m.isPickable=false;m.receiveShadows=true;m.freezeWorldMatrix();if(cast)shadow.addShadowCaster(m);staticMeshes++;
  }
  // Walkable library steps, with a gentle invisible ramp over the visible treads.
  function floorHeight(x,z){
    const stairHeight=libraryFloorHeight(x,z);if(stairHeight!==null)return stairHeight;
    const terraceHeight=lakeDetailFloorHeight(x,z);if(terraceHeight!==null)return terraceHeight;
    if(Math.abs(x-southPlaza.flags.x)<7&&Math.abs(z-southPlaza.flags.z)<1.7)return .24;
    return .16;
  }
  function blocked(x,z,r=.4){
    if(Math.abs(x)>224||z< -351||z>339)return true;
    if(z< -314&&Math.abs(x)>10.6)return true;
    const angle=Math.atan2((z-lake.z)/lake.rz,(x-lake.x)/lake.rx),factor=shoreFactor(angle);
    if(!lakeAccessContains(x,z,r)&&((x-lake.x)/(lake.rx*factor+3.5+r))**2+((z-lake.z)/(lake.rz*factor+3.5+r))**2<1)return true;
    for(const b of colliders){if(b.r!==undefined){if((x-b.x)**2+(z-b.z)**2<(r+b.r)**2)return true;}else if(Math.abs(x-b.x)<b.w+r&&Math.abs(z-b.z)<b.d+r)return true;}
    return false;
  }
  function cameraLimit(from,to){
    let max=1;const delta=to.subtract(from),len=delta.length();
    for(let t=.3;t<len;t+=.25){const p=from.add(delta.scale(t/len));if(p.y<.5){max=t/len;break;}for(const b of colliders){if(b.r===undefined&&b.name!=='长椅'&&b.name!=='花坛'&&Math.abs(p.x-b.x)<b.w+.25&&Math.abs(p.z-b.z)<b.d+.25){max=t/len;break;}}if(max<1)break;}
    return from.add(delta.scale(Math.max(.08,max-.03)));
  }
  return {colliders,buildings,trees,lake,shorePoints,lakeDetails,blocked,floorHeight,cameraLimit,water,staticMeshes,southPlaza,update:plazaDetails.update};
}
