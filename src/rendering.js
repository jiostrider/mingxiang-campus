import * as B from '@babylonjs/core';

export function setupRendering(scene,engine,camera){
  scene.environmentTexture=new B.HDRCubeTexture(`${import.meta.env.BASE_URL}assets/surfaces/campus-daylight.hdr`,scene,128,false,true,false,true);
  scene.environmentIntensity=1.05;
  const fill=new B.HemisphericLight('sky-light',new B.Vector3(0,1,0),scene);
  fill.intensity=.55;fill.diffuse=new B.Color3(.77,.87,1);fill.groundColor=new B.Color3(.28,.25,.2);
  const sun=new B.DirectionalLight('afternoon-sun',new B.Vector3(.42,-.68,.52),scene);
  sun.intensity=7;sun.diffuse=new B.Color3(1,.96,.87);
  sun.position=new B.Vector3(-100,185,-45);
  const shadow=engine.webGLVersion>1?new B.CascadedShadowGenerator(1536,sun):new B.ShadowGenerator(1536,sun);
  if(shadow instanceof B.CascadedShadowGenerator){
    shadow.numCascades=2;shadow.shadowMaxZ=180;shadow.lambda=.78;
    shadow.stabilizeCascades=true;shadow.cascadeBlendPercentage=.08;
  }
  shadow.usePercentageCloserFiltering=true;shadow.filteringQuality=B.ShadowGenerator.QUALITY_MEDIUM;
  shadow.bias=.001;shadow.normalBias=.025;shadow.darkness=0;
  let ao=null;
  if(B.SSAO2RenderingPipeline.IsSupported){
    ao=new B.SSAO2RenderingPipeline('contact-occlusion',scene,{ssaoRatio:.35,blurRatio:.5},[camera]);
    ao.radius=.5;ao.totalStrength=.45;ao.samples=8;ao.maxZ=80;ao.expensiveBlur=false;
  }
  const pipeline=new B.DefaultRenderingPipeline('camera-finish',true,scene,[camera]);
  pipeline.fxaaEnabled=true;pipeline.samples=1;pipeline.bloomEnabled=true;
  pipeline.bloomThreshold=1.65;pipeline.bloomWeight=.075;pipeline.bloomKernel=32;
  pipeline.sharpenEnabled=false;
  const processing=scene.imageProcessingConfiguration;
  processing.toneMappingEnabled=true;processing.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
  processing.exposure=1.05;processing.contrast=1.04;
  return {sun,shadow,pipeline,ao,setQuality(quality){
    scene.shadowsEnabled=quality!=='low';pipeline.bloomEnabled=quality==='high';
    shadow.filteringQuality=quality==='high'?B.ShadowGenerator.QUALITY_HIGH:B.ShadowGenerator.QUALITY_MEDIUM;
    if(ao){
      if(quality==='low')scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(ao.name,camera);
      else {scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(ao.name,camera,true);ao.samples=quality==='high'?16:8;}
    }
  }};
}
