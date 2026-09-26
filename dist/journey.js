import * as THREE from './assets/three.module.js';
import {SHAPE,clamp,ease,phase,lensPosition,lensDetachTime} from './physics-shape.js';
export {phase};
export const mouth=new THREE.Vector3(...SHAPE.mouth);
let knots=[],tangents=[];
export function journeyTime(p){
  const i=Math.min(knots.length-2,Math.max(0,knots.findIndex((k,j)=>j<knots.length-1&&p<=knots[j+1][0])));
  const [x,y]=knots[i],h=knots[i+1][0]-x,t=clamp((p-x)/h),t2=t*t,t3=t2*t;
  return (2*t3-3*t2+1)*y+(t3-2*t2+t)*h*tangents[i]+(-2*t3+3*t2)*knots[i+1][1]+(t3-t2)*h*tangents[i+1];
}
export function createJourney(meta,data){
  if(meta.source!=='flexible-fibers-v1'||meta.stats.landed!==meta.count)throw new Error('Unverified motion.');
  const first=meta.firstLens,contactEnd=lensDetachTime,landing=meta.firstBowl;
  knots=[[0,0],[.15,first*.26],[.30,first*.82],[.45,contactEnd],
    [.70,Math.max(contactEnd+.13,landing-.04)],[.88,meta.lastBowl+.8],[1,meta.duration]];
  const slopes=knots.slice(1).map((k,i)=>(k[1]-knots[i][1])/(k[0]-knots[i][0]));
  tangents=knots.map((_,i)=>i===0||i===knots.length-1?0:slopes[i-1]*slopes[i]<=0?0:2/(1/slopes[i-1]+1/slopes[i]));
  const stride=meta.count*meta.nodes*3;
  function sample(time,out){
    const f=clamp(time/meta.duration)*(meta.frames-1),a=Math.min(meta.frames-2,Math.floor(f)),mix=f-a,base=a*stride;
    for(let i=0;i<stride;i++)out[i]=(data[base+i]+(data[base+stride+i]-data[base+i])*mix)/meta.positionScale;
  }
  // One continuous camera, no cuts. The early view is aligned with the physical
  // lens collider; withdrawal starts after the macro contact, then a 30° orbit.
  const lens=new THREE.Vector3(...SHAPE.lens),nearPosition=new THREE.Vector3(.02,4.43,.35);
  const nearAim=new THREE.Vector3(-.22,5.93,0);
  const center=new THREE.Vector3(),offset=new THREE.Vector3();
  function cameraPose(p,aspect,position,target){
    const portrait=clamp((1.05-aspect)/.6),approach=phase(.27,.33,p);
    const start=new THREE.Vector3(.75-portrait*.4,4.48,3.5+portrait*3.4);
    const startAim=new THREE.Vector3(-.42,6.16,.02);
    position.copy(start).lerp(nearPosition,approach);target.copy(startAim).lerp(nearAim,approach);
    if(p>.45){
      const follow=phase(.45,.70,p),arrival=phase(.70,.88,p),reveal=phase(.88,1,p);
      const angle=-.15+phase(.45,.85,p)*.52;
      const y=THREE.MathUtils.lerp(4.36,.48,follow);
      const distance=THREE.MathUtils.lerp(.24,2.45,phase(.45,.59,p));
      center.set(-.05,y,0);offset.set(Math.sin(angle)*distance,.26+arrival*.55,Math.cos(angle)*distance);
      position.fromArray(lensPosition(journeyTime(p))).add(new THREE.Vector3(.01,-.20,.13));target.copy(center);
      target.lerp(new THREE.Vector3(0,-.08,0),arrival);
      position.lerp(new THREE.Vector3(.10,3.65,4.9+portrait*3.5),reveal);
      target.lerp(new THREE.Vector3(0,-.06,0),reveal);
      position.z+=portrait*1.05*follow*(1-reveal);
      // Begin from the same pose as the lens phase, with zero initial derivative.
      const detach=phase(.45,.51,p);position.lerp(nearPosition,1-detach);target.lerp(nearAim,1-detach);
    }
    return {roll:Math.sin(phase(.45,.88,p)*Math.PI)*-.052};
  }
  return {sample,cameraPose,meta,knots};
}
