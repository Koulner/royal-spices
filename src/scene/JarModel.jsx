import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { DoubleSide, FrontSide } from 'three';
export function JarModel({tier}) {
  const {scene}=useGLTF('/assets/royal-jar-web.glb');
  const model=useMemo(()=>{
    const copy=scene.clone(true);
    copy.traverse(o=>{
      if(!o.isMesh)return;
      o.material=o.material.clone();
      if(o.name.includes('Glass')){
        o.material.transmission=1;o.material.thickness=.055;o.material.ior=1.46;
        o.material.envMapIntensity=1.7;o.material.side=FrontSide;
        o.material.attenuationDistance=8;o.material.attenuationColor.set('#f5f7ef');
      }else{
        o.material.side=DoubleSide;o.material.envMapIntensity=.55;
        if(o.name.includes('Saffron'))o.material.color.setRGB(.70,.30,.26);
      }
      o.frustumCulled=true;
    });return copy;
  },[scene]);
  useEffect(()=>()=>model.traverse(o=>{if(o.isMesh)o.material.dispose();}),[model]);
  useEffect(()=>model.traverse(o=>{
    if(o.name.includes('Contained_Saffron'))o.visible=true;
  }),[tier,model]);
  return <primitive object={model} position={[0,-1.69,0]}/>;
}

