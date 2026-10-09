import * as B from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

const ids=['Male_Adult_02','Male_Adult_01','Male_Adult_04'];
export async function loadHumanFactory(scene,shadow){
  const templates=await Promise.all(ids.map(async id=>{
    const [container,info]=await Promise.all([
      B.LoadAssetContainerAsync(`/assets/characters/${id}.glb?v=skin-root-2`,scene),
      fetch(`/assets/characters/${id}.json`).then(r=>r.json()),
    ]);
    for(const m of container.materials){
      if(m instanceof B.PBRMaterial){
        m.metallic=0;m.roughness=/head/i.test(m.name)?.62:.86;m.environmentIntensity=.7;
        m.albedoColor=B.Color3.White();
        if(/opacity/i.test(m.name)){m.transparencyMode=B.Material.MATERIAL_ALPHATEST;m.alphaCutOff=.42;m.backFaceCulling=false;}
      }
    }
    return {container,info};
  }));
  return function human(name,color=0){
    const {container,info}=templates[color%templates.length];
    const entry=container.instantiateModelsToScene(n=>name+'-'+n,false,{doNotInstantiate:true});
    const root=new B.TransformNode(name,scene),visual=new B.TransformNode(name+'-visual',scene);
    visual.parent=root;const scale=1.78/(info.bounds.max[1]-info.bounds.min[1]);
    visual.scaling.setAll(scale);visual.position.y=-info.bounds.min[1]*scale;
    for(const node of entry.rootNodes)node.parent=visual;
    for(const mesh of root.getChildMeshes()){mesh.isPickable=false;mesh.receiveShadows=true;shadow.addShadowCaster(mesh);}
    const groups=Object.fromEntries(entry.animationGroups.map(g=>[g.name.split('-').pop(),g]));
    for(const group of Object.values(groups)){group.enableBlending=true;group.blendingSpeed=.12;}
    const boneNodes=new Map(entry.skeletons.flatMap(s=>s.bones).map(b=>[b.name.split(name+'-').pop(),b.getTransformNode()]));
    const rest=new Map([...boneNodes].filter(([,node])=>node).map(([n,node])=>[n,node.rotationQuaternion.clone()]));
    const lookState={yaw:0,pitch:0},lookBase=new Map();
    function look(yaw,pitch,dt){
      const diff=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y));
      const blend=1-Math.exp(-dt*10);
      lookState.yaw+=(Math.max(-.95,Math.min(.95,diff))-lookState.yaw)*blend;
      lookState.pitch+=(Math.max(-.85,Math.min(.85,pitch))-lookState.pitch)*blend;
    }
    if(name==='player'){
      scene.onBeforeAnimationsObservable.add(()=>{for(const [node,q] of lookBase)node.rotationQuaternion.copyFrom(q);});
      // Locomotion writes neck/head tracks during scene animation. Apply the gaze
      // afterwards, restoring the base next frame so paused poses cannot accumulate.
      scene.onAfterAnimationsObservable.add(()=>{
        const yaw=root.rotation.y,axisX=new B.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
        for(const [bone,weight] of [['Bip01_Neck',.35],['Bip01_Head',.65]]){
          const node=boneNodes.get(bone);if(!node)continue;
          lookBase.set(node,node.rotationQuaternion.clone());
          node.rotate(B.Axis.Y.clone(),lookState.yaw*weight,B.Space.WORLD);
          node.rotate(axisX.clone(),lookState.pitch*weight,B.Space.WORLD);
        }
      });
    }
    let active=null;
    function align(node,child,target){
      // Solve in the parent's local coordinates, including the mirrored glTF root.
      // A world-axis rotation can otherwise flip the elbow or knee on import.
      node.computeWorldMatrix(true);child.computeWorldMatrix(true);
      const inverse=node.parent.computeWorldMatrix(true).clone().invert();
      const origin=node.position,from=B.Vector3.TransformCoordinates(child.getAbsolutePosition(),inverse).subtract(origin).normalize(),to=B.Vector3.TransformCoordinates(target,inverse).subtract(origin).normalize();
      const delta=B.Quaternion.FromUnitVectorsToRef(from,to,new B.Quaternion());
      delta.multiplyToRef(node.rotationQuaternion,node.rotationQuaternion);
      node.computeWorldMatrix(true);child.computeWorldMatrix(true);
    }
    function limb(upperName,lowerName,endName,target,pole){
      const upper=boneNodes.get(upperName),lower=boneNodes.get(lowerName),end=boneNodes.get(endName);
      if(!upper||!lower||!end)return;
      upper.computeWorldMatrix(true);lower.computeWorldMatrix(true);end.computeWorldMatrix(true);
      const a=upper.getAbsolutePosition(),b=lower.getAbsolutePosition(),c=end.getAbsolutePosition(),l1=B.Vector3.Distance(a,b),l2=B.Vector3.Distance(b,c);
      const delta=target.subtract(a),distance=Math.max(.001,Math.min(delta.length(),l1+l2-.002)),direction=delta.normalize();
      const bend=pole.subtract(direction.scale(B.Vector3.Dot(pole,direction))).normalize();
      const along=Math.max(-1,Math.min(1,(l1*l1+distance*distance-l2*l2)/(2*l1*distance)));
      const elbow=a.add(direction.scale(l1*along)).add(bend.scale(l1*Math.sqrt(1-along*along)));
      align(upper,lower,elbow);align(lower,end,a.add(direction.scale(distance)));
    }
    function animate(phase,amount,riding=false,steering=0){
      if(riding){
        active?.stop();active=null;
        // Pose the imported skeleton, retaining the skinned clothing and hands.
        for(const [n,q] of rest)boneNodes.get(n).rotationQuaternion.copyFrom(q);
        const yaw=root.rotation.y,axisX=new B.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),axisZ=new B.Vector3(Math.sin(yaw),0,Math.cos(yaw));
        const pose=(name,x,z=0)=>{
          const node=boneNodes.get(name);if(node){if(z)node.rotate(axisZ,z,B.Space.WORLD);if(x)node.rotate(axisX,x,B.Space.WORLD);}
        };
        visual.position.set(0,.015-info.bounds.min[1]*scale,-.28);
        pose('Bip01_Spine',.5);pose('Bip01_Spine1',.2);
        const forward=new B.Vector3(Math.sin(yaw),0,Math.cos(yaw));
        const point=(x,y,z)=>root.position.add(new B.Vector3(x*Math.cos(yaw)+z*Math.sin(yaw),y,z*Math.cos(yaw)-x*Math.sin(yaw)));
        for(const [i,side] of ['L','R'].entries()){
          const sign=i===0?-1:1;
          limb(`Bip01_${side}_Thigh`,`Bip01_${side}_Calf`,`Bip01_${side}_Foot`,point(sign*.144,.324+sign*.1296*Math.cos(phase)+.095,-.0216+sign*.1296*Math.sin(phase)-.04),forward);
          const foot=boneNodes.get(`Bip01_${side}_Foot`),toe=boneNodes.get(`Bip01_${side}_Toe0`);
          if(foot&&toe)align(foot,toe,foot.getAbsolutePosition().add(forward.scale(.14)).add(new B.Vector3(0,-.025,0)));
          const gripX=sign*.3,gripZ=-.29;
          const hand=point((gripX*Math.cos(steering)+gripZ*Math.sin(steering))*.72,1.48*.72,(.84+gripZ*Math.cos(steering)-gripX*Math.sin(steering))*.72);
          limb(`Bip01_${side}_UpperArm`,`Bip01_${side}_Forearm`,`Bip01_${side}_Hand`,hand,new B.Vector3(sign*Math.cos(yaw),-.4,-sign*Math.sin(yaw)));
        }
      }else{
        visual.position.set(0,-info.bounds.min[1]*scale,0);
        const walk=amount>.01?(amount>.9?'run':'walk'):'idle';
        const next=groups[walk];
        if(active!==next){active?.stop();active=next;active?.start(true,walk==='walk'?.9:1);}
      }
    }
    animate(0,0);
    return {root,visual,animate,look,getLookState:()=>({...lookState}),model:info.name,skeletons:entry.skeletons};
  };
}
