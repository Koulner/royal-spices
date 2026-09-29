import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { asset } from '../asset.js';
export function Flower({state}){
  const {scene}=useGLTF(asset('crocus-web.glb'));const group=useRef();const {size}=useThree();
  useFrame(()=>{const a=state.current;if(!group.current)return;const mobile=size.width<700;
    group.current.visible=a.flower>.01;group.current.scale.setScalar((mobile?.72:1.05)*a.flower);
    group.current.position.set(mobile?0:1.05,mobile?-.8:-.05,0);
    group.current.rotation.set(.38,Math.PI*.08+(a.progress-.6)*.5,-.12);
  });
  return <group ref={group} visible={false}><primitive object={scene}/></group>;
}

