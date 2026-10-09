import * as B from '@babylonjs/core';
import {scannedSurface} from './materials.js';

// Video 24–32s: Datong archway on a rectangular terrace nearest the library.
// Dimensions remain photograph-based estimates, not construction measurements.
export const lakeDetails={terrace:{x:0,z:172,w:34,d:24,y:.36},arch:{x:0,z:168,w:17,d:7,y:1.56},approach:{x:0,z:148,w:34,d:24},steps:{count:8,rise:.15,tread:.4}};
export function lakeTerraceContains(x,z,inset=0){const t=lakeDetails.terrace;return Math.abs(x-t.x)<t.w/2-inset&&Math.abs(z-t.z)<t.d/2-inset;}
export function lakeAccessContains(x,z,inset=0){const a=lakeDetails.approach;return lakeTerraceContains(x,z,inset)||(Math.abs(x-a.x)<a.w/2-inset&&Math.abs(z-a.z)<a.d/2+inset);}
export function lakeDetailFloorHeight(x,z){
  if(!lakeTerraceContains(x,z))return null;
  const {arch:a,steps:s,terrace:t}=lakeDetails;
  if(Math.abs(x)<a.w/2){
    const distance=Math.abs(z-a.z)-a.d/2;
    if(distance<=0)return a.y;
    if(distance<s.count*s.tread)return t.y+(s.count-Math.floor(distance/s.tread))*s.rise;
  }
  return t.y;
}

export function buildLakeDetails(scene,{box,cyl,rod,sphere,queue,collider,mat,V,random,rockMat,gravel,shorePoint}){
  const {terrace:t,arch:a,steps:s,approach}=lakeDetails;
  const pale=mat('lake-carved-stone','#c7c7bd',.93),slate=mat('datong-grey-tiles','#505856',.85),red=mat('datong-red-columns','#6e261d',.83),timber=mat('datong-dark-timber','#302e27',.89),gold=mat('datong-gilt-detail','#b89d53',.68),foundation=mat('lake-terrace-masonry','#777b70',.96),reeds=mat('lakeside-reeds','#69733c',.97);
  scannedSurface(scene,pale,'concrete_floor_01',1,1,'#e5e4dd',.13);pale.metadata={stoneTileSize:2};
  // The scan supplies grain/roughness; its brown aggregate colour does not match
  // the white carved stone visible at 28.6s in the recording.
  pale.albedoTexture.dispose();pale.albedoTexture=null;pale.albedoColor=B.Color3.FromHexString('#c7cdc8');pale.bumpTexture.level=.055;
  scannedSurface(scene,foundation,'concrete_layers_02',1,1,'#a6afa2',.22);foundation.metadata={stoneTileSize:2};
  box('lake-library-terrace-approach',approach.x,.07,approach.z,approach.w,.18,approach.d,gravel,false);
  box('datong-lake-platform-foundation',t.x,.05,t.z,t.w,.5,t.d,foundation);
  box('datong-lake-platform-paving',t.x,t.y-.06,t.z,t.w,.12,t.d,pale,false);
  // Fine paving joints, coping and corner stones give the terrace a legible scale.
  const joints=mat('lake-paving-joints','#979e93',.97);
  for(let x=-16;x<=16;x+=2)box('terrace-paving-joint',x,t.y+.002,t.z,.018,.004,t.d,joints,false);
  for(let z=161;z<=183;z+=2)box('terrace-paving-joint',0,t.y+.002,z,t.w,.004,.018,joints,false);
  box('datong-central-podium',0,(a.y+t.y)/2,a.z,a.w,a.y-t.y,a.d,pale);
  for(const side of [-1,1])for(let i=0;i<s.count;i++){
    const height=t.y+(s.count-i)*s.rise,z=a.z+side*(a.d/2+s.tread*(i+.5));
    box('datong-step',0,(height+t.y)/2,z,a.w,height-t.y,s.tread,pale,false);
    box('datong-step-nosing',0,height+.009,z+side*(s.tread/2-.025),a.w,.018,.06,pale,false);
  }
  function balustrade(x1,z1,x2,z2){
    const length=Math.hypot(x2-x1,z2-z1),count=Math.ceil(length/1.85);
    for(let i=0;i<=count;i++){
      const x=x1+(x2-x1)*i/count,z=z1+(z2-z1)*i/count;
      box('white-stone-railing-foot',x,t.y+.09,z,.4,.18,.4,pale);
      box('white-stone-railing-post',x,t.y+.65,z,.21,1.1,.21,pale);
      box('white-stone-railing-cap',x,t.y+1.24,z,.29,.12,.29,pale);
      sphere('white-stone-railing-finial',x,t.y+1.36,z,.12,.14,.12,pale,10);
      if(i<count){
        const nx=x1+(x2-x1)*(i+1)/count,nz=z1+(z2-z1)*(i+1)/count;
        rod('white-stone-railing-upper',V(x,t.y+1.08,z),V(nx,t.y+1.08,nz),.07,pale);
        rod('white-stone-railing-lower',V(x,t.y+.32,z),V(nx,t.y+.32,nz),.065,pale);
        for(let k=1;k<4;k++)box('white-stone-railing-spindle',x+(nx-x)*k/4,t.y+.68,z+(nz-z)*k/4,.06,.68,.06,pale);
      }
    }
    collider((x1+x2)/2,(z1+z2)/2,Math.max(.25,Math.abs(x2-x1)),Math.max(.25,Math.abs(z2-z1)),'临湖白石栏杆');
  }
  balustrade(-17,160,-17,184);balustrade(17,160,17,184);balustrade(-17,184,17,184);
  // Red pillar pairs leave a clear central opening beneath the layered roofs.
  for(const x of [-6.2,-2.6,2.6,6.2])for(const dz of [-1.6,1.6]){
    const z=a.z+dz;
    box('datong-column-plinth',x,a.y+.26,z,.94,.52,.94,pale);
    box('datong-column-plinth-cap',x,a.y+.57,z,1.08,.13,1.08,pale);
    cyl('datong-red-pillar',x,a.y+2.2,z,3.25,.21,.27,red,20);
    collider(x,z,.95,.95,'大同坊柱座');
    for(let i=0;i<3;i++){
      box('datong-bracket',x,a.y+3.62+i*.19,z,.6+i*.32,.16,.72+i*.25,timber);
      for(const side of [-1,1])box('datong-bracket-gold-end',x+side*(.24+i*.16),a.y+3.62+i*.19,z,.12,.13,.8+i*.25,gold);
    }
  }
  for(const dz of [-1.65,1.65]){
    box('datong-crossbeam',0,a.y+3.48,a.z+dz,13.5,.4,.3,red);
    for(let x=-6;x<=6;x+=.35)box('datong-beam-carving',x,a.y+3.49,a.z+dz+Math.sign(dz)*.16,.11,.2,.025,gold,false);
  }
  box('datong-plaque',0,a.y+3.49,a.z+1.84,3,.5,.12,timber);
  const texture=new B.DynamicTexture('datong-plaque-text',{width:512,height:128},scene,true),ctx=texture.getContext();ctx.clearRect(0,0,512,128);ctx.font='bold 82px "KaiTi", "Microsoft YaHei", serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#d2bb74';ctx.fillText('大同坊',256,67);texture.update();texture.hasAlpha=true;
  const ink=mat('datong-plaque-ink','#ffffff');ink.albedoTexture=texture;ink.useAlphaFromAlbedoTexture=true;ink.transparencyMode=B.Material.MATERIAL_ALPHATEST;ink.backFaceCulling=false;
  const sign=B.MeshBuilder.CreatePlane('datong-plaque-lettering',{width:2.7,height:.43},scene);sign.position.set(0,a.y+3.49,a.z+1.913);sign.rotation.y=Math.PI;queue(sign,ink,false);
  function curvedRoof(cx,cz,w,d,y,rise){
    const rx=w/2,rz=d/2,ridge=Math.max(.1,rx-rz),positions=[],indices=[],uvs=[];
    // Each panel follows a curved slope, with the corner tips lifted near eaves.
    const panels=[[[cx-ridge,y+rise,cz],[cx+ridge,y+rise,cz],[cx-rx,y,cz-rz],[cx+rx,y,cz-rz]],[[cx+ridge,y+rise,cz],[cx-ridge,y+rise,cz],[cx+rx,y,cz+rz],[cx-rx,y,cz+rz]],[[cx-ridge,y+rise,cz],[cx-ridge,y+rise,cz],[cx-rx,y,cz+rz],[cx-rx,y,cz-rz]],[[cx+ridge,y+rise,cz],[cx+ridge,y+rise,cz],[cx+rx,y,cz-rz],[cx+rx,y,cz+rz]]];
    const point=(p,u,v)=>{const inner=p[0].map((x,i)=>x*(1-u)+p[1][i]*u),outer=p[2].map((x,i)=>x*(1-u)+p[3][i]*u);return V(inner[0]*(1-v)+outer[0]*v,y+rise*(1-v)**1.45+.48*v**7*(Math.abs(u-.5)*2)**3,inner[2]*(1-v)+outer[2]*v);};
    for(const p of panels){
      const start=positions.length/3,nu=Math.ceil(w/.4),nv=12;
      for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const v=point(p,i/nu,j/nv);positions.push(...v.asArray());uvs.push(i/nu*w/2,j/nv*d/2);}
      for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const k=start+j*(nu+1)+i;indices.push(k,k+1,k+nu+1,k+1,k+nu+2,k+nu+1);}
      // Tile ribs follow the roof slope; consolidated by the world material batch.
      for(let i=0;i<=nu;i++)for(let j=0;j<4;j++)rod('datong-roof-tile-rib',point(p,i/nu,j/4),point(p,i/nu,(j+1)/4),.025,slate);
      for(let i=0;i<nu;i++)rod('datong-curved-eave',point(p,i/nu,1),point(p,(i+1)/nu,1),.09,slate);
      for(const u of [0,1])for(let j=0;j<8;j++)rod('datong-hip-ridge',point(p,u,j/8).add(V(0,.07,0)),point(p,u,(j+1)/8).add(V(0,.07,0)),.085,slate);
    }
    const normals=[];B.VertexData.ComputeNormals(positions,indices,normals);const vd=new B.VertexData();vd.positions=positions;vd.indices=indices;vd.normals=normals;vd.uvs=uvs;const mesh=new B.Mesh('datong-curved-roof',scene);vd.applyToMesh(mesh);slate.backFaceCulling=false;queue(mesh,slate);
    rod('datong-roof-top-ridge',V(cx-ridge,y+rise+.12,cz),V(cx+ridge,y+rise+.12,cz),.13,slate);
    for(const side of [-1,1]){sphere('datong-ridge-end',cx+side*ridge,y+rise+.25,cz,.13,.2,.13,slate);}
  }
  curvedRoof(0,a.z,16.8,6,a.y+3.95,1.8);
  for(const x of [-5.4,5.4])curvedRoof(x,a.z,5.7,6.6,a.y+3.8,1.05);
  curvedRoof(0,a.z,9.4,4.9,a.y+5.1,1.45);
  // Natural rock edge instead of a continuous metal fence around the whole lake.
  for(let i=0;i<130;i++){
    const p=shorePoint(i/130*Math.PI*2,1.3);if(lakeTerraceContains(p.x,p.z,-1))continue;
    const scale=.35+random()*.5,m=B.MeshBuilder.CreateIcoSphere('lake-layered-shore-rock',{radius:1,subdivisions:1,flat:true},scene),positions=m.getVerticesData(B.VertexBuffer.PositionKind),radial=new Map();
    for(let j=0;j<positions.length;j+=3){const key=positions.slice(j,j+3).map(v=>v.toFixed(4)).join(',');if(!radial.has(key))radial.set(key,.7+random()*.5);for(let k=0;k<3;k++)positions[j+k]*=radial.get(key);}
    const normals=[];B.VertexData.ComputeNormals(positions,m.getIndices(),normals);m.setVerticesData(B.VertexBuffer.PositionKind,positions);m.setVerticesData(B.VertexBuffer.NormalKind,normals);m.position.set(p.x,.2+random()*.12,p.z);m.scaling.set(scale,.3+random()*.3,scale*1.25);m.rotation.set(random()*.25,random()*Math.PI,random()*.3);queue(m,rockMat);
    if(i%3===0)for(let j=0;j<5;j++)cyl('lakeside-reed-clump',p.x+.2+random()*.4,.38+random()*.1,p.z+random()*.4,.5+random()*.4,.012,.024,reeds,5);
  }
  return {terrace:t,arch:a};
}
