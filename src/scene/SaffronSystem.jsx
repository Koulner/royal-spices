import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { DoubleSide } from 'three';
export function SaffronSystem({state,reduced,tier}){
  const {scene}=useGLTF('/assets/saffron-thread-web.glb');const {size}=useThree();const group=useRef();
  const threads=useMemo(()=>Array.from({length:5},(_,i)=>{
    const obj=scene.clone(true);obj.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.side=DoubleSide;o.material.color.setRGB(.70-i*.025,.28-i*.016,.25-i*.014);o.material.envMapIntensity=.45;}});return obj;
  }),[scene]);
  useEffect(()=>()=>threads.forEach(o=>o.traverse(m=>{if(m.isMesh)m.material.dispose();})),[threads]);
  useFrame(({clock})=>{
    if(!group.current)return;const a=state.current,mobile=size.width<700;
    group.current.visible=a.thread>.01;group.current.scale.setScalar((mobile?.50:.80)*a.thread);
    group.current.rotation.set(.15,a.threadYaw,mobile?-.8:-.44);
    group.current.position.set(mobile?0:1.05,mobile?-.65:-.15,1.2);
    threads.forEach((o,i)=>{
      o.visible=i===0||(a.spread>.08&&(tier!=='low'||i<3));
      o.scale.setScalar(i===0?1:.35+i*.08);
      o.position.set(i===0?0:Math.sin(i*2.5)*a.spread*1.4,i===0?0:(i-2.5)*.50*a.spread,i===0?0:-.1-i*.18);
      o.rotation.z=i===0?0:(i-2)*.45*a.spread;
      if(!reduced)o.position.y+=Math.sin(clock.elapsedTime*.35+i)*.012*a.spread;
    });
  });
  return <group ref={group} visible={false}>{threads.map((obj,i)=><primitive key={i} object={obj}/>)}</group>;
}

