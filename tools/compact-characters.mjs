// Consolidate FBX material groups and strip vertices unused by each GLB primitive.
// This preserves skin weights, animation channels, textures and the bind pose.
import {readFile,writeFile} from 'node:fs/promises';
const sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
for(const name of ['Male_Adult_02','Male_Adult_01','Male_Adult_04']){
  const path=`public/assets/characters/${name}.glb`,file=await readFile(path),jsonSize=file.readUInt32LE(12);
  const doc=JSON.parse(file.subarray(20,20+jsonSize)),source=file.subarray(28+jsonSize);
  const parts=[source];let length=source.length;
  const append=(data)=>{const pad=(4-length%4)%4;if(pad){parts.push(Buffer.alloc(pad));length+=pad;}const offset=length;parts.push(data);length+=data.length;return offset;};
  const values=(id)=>{const a=doc.accessors[id],view=doc.bufferViews[a.bufferView],size=sizes[a.componentType],width=widths[a.type],stride=view.byteStride||size*width,offset=(view.byteOffset||0)+(a.byteOffset||0);return {a,size,width,stride,offset};};
  const readIndex=(id)=>{const {a,size,stride,offset}=values(id);return Array.from({length:a.count},(_,i)=>size===1?source.readUInt8(offset+i*stride):size===2?source.readUInt16LE(offset+i*stride):source.readUInt32LE(offset+i*stride));};
  for(const mesh of doc.meshes){
    const groups=new Map();
    for(const p of mesh.primitives){const key=JSON.stringify([p.material,p.attributes]);if(!groups.has(key))groups.set(key,{p,indices:[]});groups.get(key).indices.push(...readIndex(p.indices));}
    mesh.primitives=[];
    for(const {p,indices} of groups.values()){
      const vertices=[...new Set(indices)],lookup=new Map(vertices.map((v,i)=>[v,i])),attributes={};
      for(const [semantic,id] of Object.entries(p.attributes)){
        const {a,size,width,stride,offset}=values(id),data=Buffer.alloc(vertices.length*size*width);
        vertices.forEach((v,i)=>source.copy(data,i*size*width,offset+v*stride,offset+v*stride+size*width));
        const bufferView=doc.bufferViews.push({buffer:0,byteOffset:append(data),byteLength:data.length,target:34962})-1;
        const next={...a,bufferView,byteOffset:0,count:vertices.length};delete next.min;delete next.max;
        if(semantic==='POSITION'){next.min=[Infinity,Infinity,Infinity];next.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<vertices.length;i++)for(let k=0;k<3;k++){const v=data.readFloatLE((i*3+k)*4);next.min[k]=Math.min(next.min[k],v);next.max[k]=Math.max(next.max[k],v);}}
        attributes[semantic]=doc.accessors.push(next)-1;
      }
      const data=Buffer.alloc(indices.length*4);indices.forEach((v,i)=>data.writeUInt32LE(lookup.get(v),i*4));
      const bufferView=doc.bufferViews.push({buffer:0,byteOffset:append(data),byteLength:data.length,target:34963})-1;
      const accessor=doc.accessors.push({bufferView,componentType:5125,count:indices.length,type:'SCALAR',min:[0],max:[vertices.length-1]})-1;
      mesh.primitives.push({...p,attributes,indices:accessor});
    }
  }
  const combined=Buffer.concat(parts),accessorIds=new Set();
  for(const m of doc.meshes)for(const p of m.primitives){accessorIds.add(p.indices);Object.values(p.attributes).forEach(id=>accessorIds.add(id));}
  for(const s of doc.skins)accessorIds.add(s.inverseBindMatrices);
  for(const a of doc.animations)for(const s of a.samplers){accessorIds.add(s.input);accessorIds.add(s.output);}
  const map=new Map([...accessorIds].map((id,i)=>[id,i]));doc.accessors=[...accessorIds].map(id=>doc.accessors[id]);
  for(const m of doc.meshes)for(const p of m.primitives){p.indices=map.get(p.indices);for(const k in p.attributes)p.attributes[k]=map.get(p.attributes[k]);}
  for(const s of doc.skins)s.inverseBindMatrices=map.get(s.inverseBindMatrices);
  for(const a of doc.animations)for(const s of a.samplers){s.input=map.get(s.input);s.output=map.get(s.output);}
  const viewIds=new Set(doc.accessors.map(a=>a.bufferView));doc.images.forEach(i=>viewIds.add(i.bufferView));
  const viewMap=new Map([...viewIds].map((id,i)=>[id,i])),packed=[];let offset=0;
  doc.bufferViews=[...viewIds].map(id=>{const v=doc.bufferViews[id],pad=(4-offset%4)%4;if(pad){packed.push(Buffer.alloc(pad));offset+=pad;}const data=combined.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);const out={...v,byteOffset:offset};packed.push(data);offset+=data.length;return out;});
  doc.accessors.forEach(a=>a.bufferView=viewMap.get(a.bufferView));doc.images.forEach(i=>i.bufferView=viewMap.get(i.bufferView));
  doc.buffers[0].byteLength=offset;const bin=Buffer.concat(packed);const json=Buffer.from(JSON.stringify(doc));
  const jp=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(jp);const bp=Buffer.alloc(Math.ceil(bin.length/4)*4);bin.copy(bp);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jp.length+bp.length,8);header.writeUInt32LE(jp.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const bh=Buffer.alloc(8);bh.writeUInt32LE(bp.length);bh.writeUInt32LE(0x004e4942,4);
  await writeFile(path,Buffer.concat([header,jp,bh,bp]));
  console.log(name,{bytesBefore:file.length,bytesAfter:28+jp.length+bp.length,vertices:doc.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+doc.accessors[p.attributes.POSITION].count,0)});
}
