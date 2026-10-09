import * as B from '@babylonjs/core';
import {scannedSurface} from './materials.js';

// Photo-based reconstruction. Coordinates remain estimates, not survey measurements.
export const southPlaza = {x:0,z:-66,w:112,d:204,surfaceY:.16,clock:{x:79,z:-78},flags:{x:0,z:-74}};

export function buildSouthPlaza(scene, tools) {
  const {box,cyl,sphere,rod,queue,collider,random,V,mat,glass,trim,dark,silver,soil}=tools;
  const ground=mat('south-plaza-aggregate','#b5aa92',.96);
  const bands=mat('south-plaza-dark-aggregate','#68675f',.96);
  const granite=mat('south-plaza-granite','#bcb9ad',.9);
  const sandstone=mat('south-plaza-sandstone','#cbbda4',.88);
  sandstone.diffuseTexture=tools.stone.diffuseTexture;sandstone.diffuseColor=B.Color3.White();sandstone.metadata={stoneTileSize:2};
  const bronze=mat('south-plaza-bronze','#9d8550',.55);
  const globes=mat('south-plaza-ivory-globes','#ebe4c7',.7);
  const needles=mat('south-plaza-evergreen','#344b32',.98);
  const bark=mat('south-plaza-bark','#615547',.98);
  globes.emissiveColor=new B.Color3(.045,.038,.02);
  const foliage=new B.DynamicTexture('plaza-pine-needles',{width:384,height:512},scene,true),pc=foliage.getContext();
  pc.clearRect(0,0,384,512);
  // Fine needle clusters on crossed cards give a soft silhouette instead of solid cones.
  for(let tier=0;tier<28;tier++){
    const y=25+tier*16,span=8+tier*5.7;
    for(const side of [-1,1])for(let j=0;j<40;j++){
      const t=j/40,xx=192+side*t*span,yy=y+t*15;
      const g=53+Math.floor(random()*46);pc.strokeStyle=`rgba(${Math.floor(g*.59)},${g},${Math.floor(g*.45)},.95)`;pc.lineWidth=1.4+random()*1.8;
      pc.beginPath();pc.moveTo(xx,yy);pc.lineTo(xx+side*(4+random()*10),yy-4-random()*15);pc.stroke();
      pc.beginPath();pc.moveTo(xx,yy);pc.lineTo(xx-side*(2+random()*6),yy-3-random()*10);pc.stroke();
    }
  }
  foliage.update();foliage.hasAlpha=true;needles.diffuseTexture=foliage;needles.diffuseColor=B.Color3.White();
  needles.useAlphaFromDiffuseTexture=true;needles.transparencyMode=B.Material.MATERIAL_ALPHATEST;needles.alphaCutOff=.4;needles.backFaceCulling=false;needles.twoSidedLighting=true;needles.emissiveColor=new B.Color3(.015,.023,.008);

  function aggregateTexture(material,name,color,w,d) {
    const texture=new B.DynamicTexture(name,{width:512,height:512},scene,true);
    const ctx=texture.getContext();ctx.fillStyle=color;ctx.fillRect(0,0,512,512);
    for(let i=0;i<65;i++) {
      const x=random()*512,y=random()*512,r=12+random()*68;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,random()>.5?'rgba(54,48,37,.035)':'rgba(238,231,209,.04)');g.addColorStop(1,'rgba(100,90,70,0)');
      ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    for(let i=0;i<65000;i++) {
      const light=random()>.51;ctx.fillStyle=light?`rgba(244,238,222,${.07+random()*.25})`:`rgba(54,50,43,${.07+random()*.27})`;
      const size=.6+random()*2.2;ctx.fillRect(random()*512,random()*512,size,size);
    }
    texture.update();texture.wrapU=texture.wrapV=B.Texture.WRAP_ADDRESSMODE;texture.uScale=w/4;texture.vScale=d/4;texture.anisotropicFilteringLevel=16;
    material.diffuseTexture=texture;material.diffuseColor=B.Color3.White();
    const normal=new B.DynamicTexture(name+'-normal',{width:256,height:256},scene,true);
    const nc=normal.getContext(),pixels=nc.createImageData(256,256);
    for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=128+(random()-.5)*25;pixels.data[i+1]=128+(random()-.5)*25;pixels.data[i+2]=254;pixels.data[i+3]=255;}
    nc.putImageData(pixels,0,0);normal.update();normal.wrapU=normal.wrapV=B.Texture.WRAP_ADDRESSMODE;normal.uScale=w/4;normal.vScale=d/4;normal.level=.3;normal.anisotropicFilteringLevel=16;material.bumpTexture=normal;
  }
  aggregateTexture(ground,'south-plaza-aggregate-grain','#b6aa91',southPlaza.w,southPlaza.d);
  aggregateTexture(bands,'south-plaza-band-grain','#6b6a62',southPlaza.w,2.4);
  scannedSurface(scene,ground,'concrete_floor_01',southPlaza.w/3,southPlaza.d/3,'#e8d7b7',.14);
  scannedSurface(scene,bands,'asphalt_02',southPlaza.w/5,2.4/5,'#96938a',.18);
  const plaza=B.MeshBuilder.CreateGround('south-plaza-open-ground',{width:southPlaza.w,height:southPlaza.d,subdivisions:1},scene);
  plaza.position.set(0,southPlaza.surfaceY,southPlaza.z);queue(plaza,ground,false);
  // Broad cross bands, rather than the previous decorative checkerboard.
  for(const z of [-142,-96,-50,-4]) {
    const strip=B.MeshBuilder.CreateGround('south-plaza-cross-band',{width:112,height:2.4},scene);
    strip.position.set(0,.163,z);queue(strip,bands,false);
  }
  for(const x of [-56.2,56.2])box('south-plaza-edge',x,.18,-66,.4,.24,204,granite,false);
  for(const x of [-58.5,58.5])box('south-plaza-sidewalk',x,.1,-66,4,.12,204,granite,false);
  for(const x of [-55.2,55.2]) {
    for(let z=-158;z<32;z+=14) {
      box('south-plaza-drain',x,.168,z,.32,.02,1.1,dark,false);
      for(let i=0;i<5;i++)box('south-plaza-drain-slat',x,.181,z-.4+i*.2,.35,.01,.055,granite,false);
    }
  }
  // Sparse debris and wear remain flush with the surface and do not impede movement.
  const worn=mat('south-plaza-surface-wear','#857962',1);
  const wearTexture=new B.DynamicTexture('south-plaza-wear',{width:128,height:128},scene,true),wc=wearTexture.getContext();
  wc.clearRect(0,0,128,128);const fade=wc.createRadialGradient(64,64,5,64,64,60);
  fade.addColorStop(0,'rgba(120,103,77,.11)');fade.addColorStop(.6,'rgba(120,103,77,.035)');fade.addColorStop(1,'rgba(120,103,77,0)');wc.fillStyle=fade;wc.fillRect(0,0,128,128);
  wearTexture.update();wearTexture.hasAlpha=true;worn.diffuseTexture=wearTexture;worn.useAlphaFromDiffuseTexture=true;worn.backFaceCulling=false;
  for(let i=0;i<44;i++){
    const spot=B.MeshBuilder.CreateGround('plaza-wear-mark',{width:1.4+random()*2,height:.7+random()*1.4},scene);
    spot.position.set((random()-.5)*106,.166,-163+random()*193);spot.rotation.y=random()*Math.PI;queue(spot,worn,false);
  }
  const debris=mat('south-plaza-dry-leaves','#5a503c',1);
  for(let i=0;i<100;i++){
    const x=(random()-.5)*106,z=-163+random()*193;
    const chip=box('plaza-small-debris',x,.169,z,.015+random()*.045,.006,.025+random()*.1,debris,false);chip.rotation.y=random()*Math.PI;
  }
  // Thin slab joints in the apron in front of the library.
  box('library-front-apron',0,.075,42,78,.17,12,granite,false);
  for(let x=-36;x<=36;x+=3)box('library-apron-joint',x,.165,42,.014,.005,12,bands,false);
  for(const z of [36,39,42,45])box('library-apron-cross-joint',0,.165,z,78,.005,.014,bands,false);

  function gardenLamp(x,z) {
    cyl('plaza-lamp-foot',x,.3,z,.6,.24,.34,granite,12);
    cyl('plaza-lamp-white-stem',x,2.8,z,5,.07,.105,trim,12);
    cyl('plaza-lamp-gold-collar',x,4.65,z,.65,.2,.13,bronze,12);
    sphere('plaza-lamp-central-globe',x,5.4,z,.29,.29,.29,globes,12);
    for(let i=0;i<5;i++) {
      const a=i*Math.PI*2/5,dx=Math.cos(a)*.63,dz=Math.sin(a)*.63;
      rod('plaza-lamp-arm',V(x,4.7,z),V(x+dx,5.04,z+dz),.046,bronze);
      cyl('plaza-lamp-cup',x+dx,5.06,z+dz,.15,.16,.09,bronze,10);
      sphere('plaza-lamp-globe',x+dx,5.32,z+dz,.24,.24,.24,globes,12);
    }
    tools.colliders.push({x,z,r:.3,name:'广场景观灯'});
  }
  for(const x of [-59,59])for(const z of [-150,-110,-70,-30,12])gardenLamp(x,z);
  for(const x of [-36,36])gardenLamp(x,40);

  function evergreen(x,z,h=7) {
    cyl('plaza-pine-trunk',x,1.4,z,2.8,.11,.22,bark,8);
    for(let i=0;i<3;i++) {
      const card=B.MeshBuilder.CreatePlane('plaza-pine-needle-card',{width:h*.55,height:h,sideOrientation:B.Mesh.DOUBLESIDE},scene);
      card.position.set(x,h/2+.7,z);card.rotation.y=i*Math.PI/3+random()*.18;queue(card,needles);
    }
    tools.colliders.push({x,z,r:.26,name:'树干'});
    tools.trees.push({x,z});
  }
  // Layered evergreen planting behind the open plaza's edge.
  for(const side of [-1,1])for(let z=-157;z<=19;z+=11) {
    evergreen(side*(63.2+random()*1.4),z,5.5+random()*2);
  }
  // Braced young trees visible in the supplied photos.
  for(const side of [-1,1])for(let z=-154;z<=25;z+=22) {
    const x=side*60.7;
    cyl('plaza-young-tree',x,3.2,z,6.3,.045,.13,bark,7);
    box('plaza-tree-pit',x,.12,z,1.6,.05,1.6,soil,false);
    for(let i=0;i<3;i++) {
      const a=i*Math.PI*2/3;
      rod('plaza-tree-support',V(x+Math.cos(a)*1.15,.2,z+Math.sin(a)*1.15),V(x,2.2,z),.035,bark);
    }
    for(let i=0;i<7;i++) {
      const a=i*2.4,y=2.7+i*.45;
      const end=V(x+Math.cos(a)*(1.3+i*.1),y+1.3,z+Math.sin(a)*(1.3+i*.1));
      rod('plaza-young-branch',V(x,y,z),end,.025,bark);
      rod('plaza-young-twig',end,end.add(V(.35,.7,-.2)),.012,bark);
    }
    tools.colliders.push({x,z,r:.2,name:'树干'});tools.trees.push({x,z});
  }

  // Three poles on a low base; positions are provisional from ground photographs.
  const {x:fx,z:fz}=southPlaza.flags;
  box('plaza-flag-base',fx,.2,fz,14,.08,3.4,granite,false);
  const red=mat('plaza-national-flag','#a82725',.8),navy=mat('plaza-university-flag','#243a56',.8),ivory=mat('plaza-white-flag','#e2e2d8',.85);
  const animatedFlags=[];
  for(const [i,material] of [ivory,red,navy].entries()) {
    const x=fx+(i-1)*4,h=i===1?24:23;
    cyl('plaza-flagpole',x,h/2+.16,fz,h,.055,.09,trim,12);
    sphere('plaza-flagpole-finial',x,h+.22,fz,.12,.12,.12,bronze,12);
    cyl('plaza-flagpole-socket',x,.33,fz,.34,.2,.27,granite,12);
    tools.colliders.push({x,z:fz,r:.28,name:'旗杆'});
    const positions=[],uvs=[],indices=[],segments=16;
    for(let row=0;row<2;row++)for(let j=0;j<=segments;j++) {
      const u=j/segments;positions.push(x+u*3.15,h-row*1.85,fz+Math.sin(u*8)*.16*u);uvs.push(u,1-row);
    }
    for(let j=0;j<segments;j++){const a=j,b=j+1,c=j+segments+1,d=j+segments+2;indices.push(a,c,b,b,c,d);}
    const mesh=new B.Mesh('plaza-flag-'+i,scene),vd=new B.VertexData(),normals=[];
    B.VertexData.ComputeNormals(positions,indices,normals);vd.positions=positions;vd.indices=indices;vd.normals=normals;vd.uvs=uvs;vd.applyToMesh(mesh,true);
    material.backFaceCulling=false;mesh.material=material;mesh.isPickable=false;tools.shadow.addShadowCaster(mesh);
    animatedFlags.push({mesh,positions,indices,normals,x,h,z:fz,segments});
  }
  // Add the five stars to the national flag as part of its texture.
  const flagTexture=new B.DynamicTexture('national-flag-stars',{width:512,height:320},scene,true),fc=flagTexture.getContext();
  fc.fillStyle='#b62b26';fc.fillRect(0,0,512,320);fc.fillStyle='#edd279';
  function star(x,y,r,angle=-Math.PI/2){fc.beginPath();for(let i=0;i<10;i++){const a=angle+i*Math.PI/5,rr=i%2?r*.4:r;const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;i?fc.lineTo(px,py):fc.moveTo(px,py);}fc.closePath();fc.fill();}
  star(84,83,32);for(const [x,y] of [[135,34],[157,63],[157,103],[135,134]])star(x,y,11,Math.atan2(83-y,84-x));
  flagTexture.update();red.diffuseTexture=flagTexture;red.diffuseColor=B.Color3.White();

  // Slender clock tower: stone piers, blue vertical glazing, crown and four clock faces.
  const {x:cx,z:cz}=southPlaza.clock;
  box('plaza-clock-plinth',cx,.7,cz,8,1.1,8,granite);
  box('plaza-clock-core',cx,16.6,cz,5.6,31.5,5.6,sandstone);
  for(const dx of [-2.7,2.7])for(const dz of [-2.7,2.7])box('plaza-clock-pier',cx+dx,17,cz+dz,.58,32,.58,trim);
  for(const side of [-1,1]) {
    box('plaza-clock-blue-bay',cx,15.5,cz+side*2.84,2.1,25,.08,glass,false);
    box('plaza-clock-blue-bay-side',cx+side*2.84,15.5,cz,.08,25,2.1,glass,false);
    for(let y=3;y<28;y+=1.4) {
      box('plaza-clock-bay-divider',cx,y,cz+side*2.9,2.1,.055,.07,dark,false);
      box('plaza-clock-bay-divider-side',cx+side*2.9,y,cz,.07,.055,2.1,dark,false);
    }
    for(const dx of [-.35,.35])box('clock-glass-vertical-mullion',cx+dx,15.5,cz+side*2.92,.045,25,.08,silver,false);
    for(const dz of [-.35,.35])box('clock-glass-side-mullion',cx+side*2.92,15.5,cz+dz,.08,25,.045,silver,false);
  }
  box('plaza-clock-capital',cx,31.9,cz,6.5,1.1,6.5,trim);
  box('plaza-clock-crown',cx,34.3,cz,6,3.8,6,sandstone);
  for(const y of [32.5,36.1])box('plaza-clock-cornice',cx,y,cz,6.6,.35,6.6,trim);
  for(const dx of [-2.8,2.8])for(const dz of [-2.8,2.8]){
    box('plaza-clock-pinnacle',cx+dx,36.6,cz+dz,.4,1.8,.4,trim);
    box('plaza-clock-pinnacle-pair',cx+dx-Math.sign(dx)*.7,36.6,cz+dz,.32,1.8,.4,trim);
  }
  const clockTexture=new B.DynamicTexture('plaza-clock-face',{width:256,height:256},scene,true),cc=clockTexture.getContext();
  cc.clearRect(0,0,256,256);cc.fillStyle='#e6e4d7';cc.beginPath();cc.arc(128,128,120,0,Math.PI*2);cc.fill();
  cc.strokeStyle='#3c4546';cc.lineWidth=7;cc.stroke();
  for(let i=0;i<60;i++){const a=i*Math.PI/30;cc.lineWidth=1.4;cc.beginPath();cc.moveTo(128+Math.sin(a)*110,128-Math.cos(a)*110);cc.lineTo(128+Math.sin(a)*115,128-Math.cos(a)*115);cc.stroke();}
  cc.fillStyle='#303a3b';cc.textAlign='center';cc.textBaseline='middle';cc.font='bold 23px Georgia,serif';
  const roman=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
  for(let i=0;i<12;i++){const a=i*Math.PI/6;cc.fillText(roman[i],128+Math.sin(a)*91,128-Math.cos(a)*91);}
  cc.lineWidth=7;cc.beginPath();cc.moveTo(128,128);cc.lineTo(93,100);cc.moveTo(128,128);cc.lineTo(128,48);cc.stroke();
  clockTexture.update();clockTexture.hasAlpha=true;
  const clockMat=mat('plaza-clock-dial','#ffffff');clockMat.diffuseTexture=clockTexture;clockMat.useAlphaFromDiffuseTexture=true;clockMat.backFaceCulling=false;
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;const face=B.MeshBuilder.CreatePlane('plaza-clock-dial-'+i,{size:2.3},scene);face.position.set(cx+Math.sin(a)*3.03,34.5,cz-Math.cos(a)*3.03);face.rotation.y=-a;face.material=clockMat;face.isPickable=false;
    const point=(u,y)=>V(cx+Math.sin(a)*3.13+Math.cos(a)*u,y,cz-Math.cos(a)*3.13+Math.sin(a)*u);
    for(let j=0;j<20;j++){const p=j*Math.PI/20,q=(j+1)*Math.PI/20;rod('clock-dial-stone-arch',point(Math.cos(p)*1.34,34.5+Math.sin(p)*1.34),point(Math.cos(q)*1.34,34.5+Math.sin(q)*1.34),.13,trim);}
    for(const u of [-1.34,1.34])rod('clock-dial-stone-jamb',point(u,32.8),point(u,34.5),.13,trim);
  }
  collider(cx,cz,8,8,'钟塔');tools.buildings.push({name:'钟塔',x:cx,z:cz,w:8,d:8});

  return {update(time){
    for(const flag of animatedFlags) {
      const {positions,segments,x,h,z}=flag;
      for(let row=0;row<2;row++)for(let j=0;j<=segments;j++) {
        const u=j/segments,index=(row*(segments+1)+j)*3;
        positions[index]=x+u*3.15;positions[index+1]=h-row*1.85-Math.sin(u*Math.PI)*.12;
        positions[index+2]=z+(Math.sin(u*8-time*2.2)*.22+Math.sin(u*15-time*3.1)*.055)*u;
      }
      B.VertexData.ComputeNormals(positions,flag.indices,flag.normals);
      flag.mesh.updateVerticesData(B.VertexBuffer.PositionKind,positions);flag.mesh.updateVerticesData(B.VertexBuffer.NormalKind,flag.normals);
    }
  }};
}
