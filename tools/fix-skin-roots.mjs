import {readFile,writeFile} from 'node:fs/promises';
// glTF skin.skeleton must be a common ancestor of every joint. Some Rocketbox
// FBX files list a spine bone first; GLTFExporter uses that first joint as root.
// That splits the leg and torso branches when a loader builds the bone tree.
for(const name of ['Male_Adult_01','Male_Adult_02','Male_Adult_04']){
 const path=`public/assets/characters/${name}.glb`,file=await readFile(path),jsonLength=file.readUInt32LE(12);
 const doc=JSON.parse(file.subarray(20,20+jsonLength)),binary=file.subarray(28+jsonLength),parents=new Map();
 doc.nodes.forEach((node,i)=>node.children?.forEach(child=>parents.set(child,i)));
 const ancestry=id=>{const chain=[];for(let i=id;i!==undefined;i=parents.get(i))chain.push(i);return chain;};
 for(const skin of doc.skins){
  const root=ancestry(skin.joints[0]).find(candidate=>skin.joints.every(joint=>ancestry(joint).includes(candidate)));
  if(root===undefined)throw new Error(`No common skin root for ${name}`);
  console.log(name,{oldRoot:doc.nodes[skin.skeleton]?.name,root:doc.nodes[root].name});skin.skeleton=root;
 }
 const json=Buffer.from(JSON.stringify(doc)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
 const output=Buffer.alloc(28+padded.length+binary.length);file.copy(output,0,0,12);output.writeUInt32LE(output.length,8);
 output.writeUInt32LE(padded.length,12);output.writeUInt32LE(0x4e4f534a,16);padded.copy(output,20);
 output.writeUInt32LE(binary.length,20+padded.length);output.writeUInt32LE(0x004e4942,24+padded.length);binary.copy(output,28+padded.length);
 await writeFile(path,output);
}
