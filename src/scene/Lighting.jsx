import { Environment } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { asset } from '../asset.js';
export function Lighting({state}){
  const amber=useRef();
  useFrame(()=>{if(amber.current)amber.current.intensity=state.current.amber*6;});
  return <>
    <ambientLight intensity={.16}/>
    <directionalLight position={[-3,5,6]} intensity={1.4} color="#fff5e7"/>
    <directionalLight position={[4,1,-3]} intensity={1.1} color="#e0ebf0"/>
    <pointLight ref={amber} position={[-1,.5,3]} intensity={0} color="#edac54" distance={8}/>
    <Environment files={asset('royal-studio.exr')} environmentIntensity={.75} environmentRotation={[0,1.57,0]} background backgroundBlurriness={.8} backgroundIntensity={.035}/>
  </>;
}

