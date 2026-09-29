import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import { MathUtils, Vector3, ACESFilmicToneMapping } from 'three';
import { JarModel } from './JarModel';
import { SaffronSystem } from './SaffronSystem';
import { Flower } from './Flower';
import { Lighting } from './Lighting';
import { QualityManager } from './QualityManager';
import { stepInteraction } from './InteractionController';
function CameraRig({state,interaction,reduced,tier,onReady}){
  const group=useRef(),frames=useRef(0);const {camera,size,gl,invalidate}=useThree();
  const pose=useRef({yaw:-.36,tilt:.055,scale:1,x:.95,y:0,jar:1});
  const [look]=useState(()=>new Vector3());
  useEffect(()=>{if(reduced){Object.assign(pose.current,{yaw:-.36,tilt:.055,scale:1,x:.95,y:0,jar:1});frames.current=0;invalidate();}},[reduced,invalidate]);
  useFrame((_,delta)=>{
    if(++frames.current===3)onReady();
    if(reduced&&(frames.current<4||interaction.active||Math.abs(interaction.yaw)+Math.abs(interaction.pitch)>.0005))invalidate();
    const dt=Math.min(delta,.05),authored=state.current,mobile=size.width<700;
    stepInteraction(interaction,dt,reduced);
    const a=pose.current,influence=interaction.active?.35:performance.now()-interaction.lastRelease<900?1.3:6,blend=1-Math.exp(-dt*influence);
    for(const k of ['yaw','tilt','scale','x','y','jar'])a[k]=MathUtils.lerp(a[k],authored[k],blend);
    camera.position.set(0,mobile?.15:.45,mobile?8.9:8.1);camera.lookAt(look);
    if(!group.current)return;
    const g=group.current;g.visible=a.jar>.025;
    g.scale.setScalar((mobile?.65:.95)*a.scale*Math.max(.01,a.jar));
    g.position.set(mobile?0:a.x,mobile?-.75:a.y,0);
    g.rotation.set(a.tilt+interaction.pitch,a.yaw+interaction.yaw,mobile?.01:-.045);
    gl.toneMappingExposure=.78+authored.reveal*.24+authored.amber*.04;
  });
  return <><group ref={group}><JarModel tier={tier}/></group><SaffronSystem state={state} reduced={reduced} tier={tier}/><Flower state={state}/></>;
}
function PauseOutsideStory({active,reduced}){
  const {setFrameloop,invalidate}=useThree();
  useEffect(()=>{const fn=()=>{setFrameloop(document.hidden||!active?'never':reduced?'demand':'always');if(!document.hidden&&active)invalidate();};const wake=()=>{if(active&&!document.hidden)invalidate();};fn();document.addEventListener('visibilitychange',fn);for(const event of ['pointerdown','pointermove','keydown'])window.addEventListener(event,wake);return()=>{document.removeEventListener('visibilitychange',fn);for(const event of ['pointerdown','pointermove','keydown'])window.removeEventListener(event,wake);};},[active,reduced,setFrameloop,invalidate]);return null;
}
export default function Scene({state,interaction,reduced,onReady,onFailure,active}){
  const [tier,setTier]=useState(()=>window.innerWidth<700?'low':'high');
  return <Canvas camera={{fov:35,near:.1,far:40}} dpr={tier==='low'?1:[1,1.65]} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=ACESFilmicToneMapping;gl.domElement.addEventListener('webglcontextlost',onFailure,{once:true});}}>
    <color attach="background" args={['#10110f']}/>
    <Suspense fallback={null}><Lighting state={state}/><CameraRig state={state} interaction={interaction} reduced={reduced} tier={tier} onReady={onReady}/><QualityManager setTier={setTier}/><PauseOutsideStory active={active} reduced={reduced}/></Suspense>
  </Canvas>;
}

