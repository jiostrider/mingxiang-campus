import {readFile,writeFile,readdir} from 'node:fs/promises';
// Keep imported locomotion in place: gameplay owns X/Z movement and collisions.
for(const file of (await readdir('public/assets/characters')).filter(n=>n.endsWith('.glb'))){
  const path='public/assets/characters/'+file,b=await readFile(path);
  const jsonLength=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+jsonLength).toString());
  const binary=b.subarray(28+jsonLength);
  for(const animation of j.animations)for(const channel of animation.channels){
    if(channel.target.path!=='translation'||j.nodes[channel.target.node].name!=='Bip01')continue;
    const accessor=j.accessors[animation.samplers[channel.sampler].output],view=j.bufferViews[accessor.bufferView];
    const offset=(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||12;
    for(let i=0;i<accessor.count;i++){binary.writeFloatLE(0,offset+i*stride);binary.writeFloatLE(0,offset+i*stride+8);}
    accessor.min[0]=accessor.max[0]=accessor.min[2]=accessor.max[2]=0;
  }
  const text=JSON.stringify(j),newJSON=Buffer.from(text+' '.repeat((4-Buffer.byteLength(text)%4)%4));
  const output=Buffer.alloc(28+newJSON.length+binary.length);
  b.copy(output,0,0,12);output.writeUInt32LE(output.length,8);output.writeUInt32LE(newJSON.length,12);output.writeUInt32LE(0x4E4F534A,16);newJSON.copy(output,20);
  output.writeUInt32LE(binary.length,20+newJSON.length);output.writeUInt32LE(0x004E4942,24+newJSON.length);binary.copy(output,28+newJSON.length);
  await writeFile(path,output);console.log('Root motion fixed: '+file);
}
