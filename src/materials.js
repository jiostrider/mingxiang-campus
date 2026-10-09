import * as B from '@babylonjs/core';

export function surfaceMaterial(scene,name,hex,roughness=.85,metallic=0){
  const m=new B.PBRMaterial(name,scene);
  m.albedoColor=B.Color3.FromHexString(hex);m.roughness=roughness;m.metallic=metallic;
  m.environmentIntensity=.75;
  // Keep existing procedural texture authoring helpers compatible with PBR.
  Object.defineProperties(m,{
    diffuseColor:{get:()=>m.albedoColor,set:v=>{m.albedoColor=v;}},
    diffuseTexture:{get:()=>m.albedoTexture,set:v=>{m.albedoTexture=v;}},
    specularColor:{get:()=>m.reflectivityColor,set:v=>{m.reflectivityColor=v;}},
    useAlphaFromDiffuseTexture:{get:()=>m.useAlphaFromAlbedoTexture,set:v=>{m.useAlphaFromAlbedoTexture=v;}},
  });
  return m;
}

export function scannedSurface(scene,material,id,u=1,v=1,tint='#ffffff',normalStrength=.25){
  material.albedoTexture?.dispose();material.bumpTexture?.dispose();
  const texture=(suffix,gamma=true)=>{
    const t=new B.Texture(`/assets/surfaces/${id}-${suffix}.jpg`,scene);
    t.wrapU=t.wrapV=B.Texture.WRAP_ADDRESSMODE;t.uScale=u;t.vScale=v;t.anisotropicFilteringLevel=16;t.gammaSpace=gamma;return t;
  };
  material.albedoTexture=texture('Diffuse');material.albedoColor=B.Color3.FromHexString(tint);
  material.bumpTexture=texture('nor_gl',false);material.bumpTexture.level=normalStrength;
  material.invertNormalMapX=true;material.invertNormalMapY=true;
  if(id!=='clay_roof_tiles'){
    material.metallicTexture=texture('Rough',false);
    material.useRoughnessFromMetallicTextureGreen=true;material.useRoughnessFromMetallicTextureAlpha=false;
    material.useMetallnessFromMetallicTextureBlue=false;
  }
}
