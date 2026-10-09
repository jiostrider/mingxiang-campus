import * as B from '@babylonjs/core';
import {loadHumanFactory} from './humans.js';
import {surfaceMaterial} from './materials.js';

const V=(x,y,z)=>new B.Vector3(x,y,z);
export async function createActors(scene,shadow){
  const human=await loadHumanFactory(scene,shadow);
  const material=(name,color,spec=.08)=>surfaceMaterial(scene,name,color,1-spec,/metal|frame/.test(name)?.7:0);
  const frameMat=material('bicycle-frame','#c29b55',.3),rubber=material('bicycle-tires','#252e2c'),metal=material('bicycle-metal','#adb9b6',.55),saddleMat=material('bicycle-saddle','#4a3e30');
  function own(mesh,parent,mat){mesh.parent=parent;mesh.material=mat;mesh.isPickable=false;mesh.receiveShadows=true;shadow.addShadowCaster(mesh);return mesh;}
  function box(name,parent,x,y,z,w,h,d,mat){const m=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);return own(m,parent,mat);}
  function ellipsoid(name,parent,x,y,z,sx,sy,sz,mat){const m=B.MeshBuilder.CreateSphere(name,{diameter:2,segments:8},scene);m.position.set(x,y,z);m.scaling.set(sx,sy,sz);return own(m,parent,mat);}
  function rod(name,parent,a,b,r,mat){const delta=b.subtract(a);const m=B.MeshBuilder.CreateCylinder(name,{height:delta.length(),diameter:r*2,tessellation:8},scene);m.position=a.add(b).scale(.5);m.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,delta.normalize(),new B.Quaternion());return own(m,parent,mat);}
  function bicycle(){
    const root=new B.TransformNode('bicycle',scene),wheels=[],steering=new B.TransformNode('bicycle-steering',scene);
    root.scaling.setAll(.72);
    steering.parent=root;steering.position.set(0,0,.84);
    for(const z of [-.84,.84]){
      const hub=new B.TransformNode('wheel',scene);hub.parent=z>0?steering:root;hub.position.set(0,.56,z>0?0:z);wheels.push(hub);
      const tire=B.MeshBuilder.CreateTorus('tire',{diameter:1.03,thickness:.07,tessellation:40},scene);tire.rotation.z=Math.PI/2;own(tire,hub,rubber);
      const rim=B.MeshBuilder.CreateTorus('rim',{diameter:.94,thickness:.027,tessellation:40},scene);rim.rotation.z=Math.PI/2;own(rim,hub,metal);
      for(let j=0;j<16;j++){const a=j/16*Math.PI*2;rod('spoke',hub,V(0,0,0),V(0,Math.sin(a)*.47,Math.cos(a)*.47),.007,metal);}
      rod('axle',hub,V(-.08,0,0),V(.08,0,0),.035,metal);
    }
    const rear=V(0,.56,-.84),crank=V(0,.45,-.03),seat=V(0,1.13,-.34),steer=V(0,1.20,.56),front=V(0,.56,.84);
    for(const [a,b] of [[rear,seat],[seat,crank],[crank,rear],[seat,steer],[steer,crank]])rod('frame-tube',root,a,b,.03,frameMat);
    const local=p=>p.subtract(V(0,0,.84));
    for(const x of [-.065,.065])rod('front-fork',steering,local(V(x,1.06,.62)),local(V(x,.56,.84)),.023,metal);
    rod('seatpost',root,seat,V(0,1.3,-.39),.025,metal);ellipsoid('saddle',root,0,1.32,-.39,.145,.045,.23,saddleMat);
    rod('handlebar-stem',steering,local(steer),local(V(0,1.48,.5)),.025,metal);rod('handlebar',steering,local(V(-.32,1.48,.5)),local(V(.32,1.48,.5)),.025,metal);
    for(const x of [-.3,.3])rod('grip',steering,local(V(x,1.48,.48)),local(V(x,1.48,.64)),.04,rubber);
    const pedal=new B.TransformNode('crankset',scene);pedal.position=crank;pedal.parent=root;
    rod('cranks',pedal,V(-.12,-.18,0),V(.12,.18,0),.02,metal);box('pedal',pedal,-.2,-.18,0,.17,.04,.1,rubber);box('pedal',pedal,.2,.18,0,.17,.04,.1,rubber);
    rod('chain',root,V(.08,.5,-.05),V(.08,.6,-.84),.012,darkMetal());
    function darkMetal(){return rubber;}
    box('rear-reflector',root,0,1.02,-.93,.12,.08,.04,material('reflector','#9b3b30'));
    return {root,wheels,pedal,steering,animate:(distance,angle=0)=>{for(const w of wheels)w.rotation.x=distance/.52;pedal.rotation.x=distance*1.6;steering.rotation.y=angle;}};
  }
  const player=human('player',0,true),bike=bicycle();
  const routes=[
    [[-29,-252],[-29,1],[-22,1],[-22,-252]],
    [[29,-239],[29,1],[22,1],[22,-239]],
    [[-16,-145],[16,-145],[16,-75],[-16,-75]],
    [[-30,42],[30,42],[18,53],[-18,53]],
    [[60,65],[64,140],[72,171],[72,248],[82,260],[87,192],[70,145]],
    [[-63,-230],[-63,-32],[-72,-32],[-72,-230]],
  ];
  const npcs=[];
  for(let i=0;i<16;i++){
    const h=human('student-'+i,1+i%5,i%3===0),route=routes[i%routes.length],index=Math.floor(i/routes.length)%route.length;
    const a=route[index],b=route[(index+1)%route.length],t=(i*.173)%1;
    h.root.position.set(a[0]+(b[0]-a[0])*t,.16,a[1]+(b[1]-a[1])*t);h.root.scaling.setAll(.93+(i%4)*.025);
    npcs.push({...h,route,index:(index+1)%route.length,speed:1.05+(i%4)*.15,phase:i*1.7});
  }
  function updateNPCs(dt,playerPosition,blocked,floorHeight){
    for(const n of npcs){const p=n.root.position,target=n.route[n.index];let dx=target[0]-p.x,dz=target[1]-p.z;const len=Math.hypot(dx,dz);if(len<.65){n.index=(n.index+1)%n.route.length;continue;}dx/=len;dz/=len;
      const nearby=Math.hypot(p.x-playerPosition.x,p.z-playerPosition.z)<1.2;const amount=nearby?0:1;
      const nx=p.x+dx*n.speed*dt*amount,nz=p.z+dz*n.speed*dt*amount;
      if(!blocked(nx,nz,.24)){p.x=nx;p.z=nz;}else n.index=(n.index+1)%n.route.length;
      p.y=floorHeight(p.x,p.z);n.root.rotation.y=Math.atan2(dx,dz);n.phase+=dt*5.1*amount;n.animate(n.phase,amount*.7);
    }
  }
  return {player,bike,npcs,updateNPCs};
}
