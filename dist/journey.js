import * as THREE from './assets/three.module.js';
export const clamp=value=>Math.max(0,Math.min(1,value));
export const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};
export const phase=(a,b,p)=>ease((p-a)/(b-a));
export const openingCamera=new THREE.Vector3(0,5.1,.3);
export const openingAim=new THREE.Vector3(-.55,7.2,0);
export const mouth=new THREE.Vector3(0,7,0);
export const lensCenter=openingCamera.clone().add(new THREE.Vector3(0,.28,0));
const axis=new THREE.Vector3(0,0,1);
export function jarRotation(time,out=new THREE.Quaternion()){return out.setFromAxisAngle(axis,1.52-1.24*ease(time/1.1));}
let knots=[],tangents=[];
function configureClock(meta){
  const contact=meta.lensContacts[0].time,landing=meta.bowlContacts[0].time;
  const lastExit=Math.max(...meta.births.filter(t=>t!==null));
  knots=[[0,0],[.12,contact*.38],[.30,contact],[.43,contact+.45],[.67,Math.max(landing+.12,contact+.75)],[.86,Math.min(meta.duration-.6,Math.max(lastExit+2.3,contact+3.7))],[.98,meta.duration],[1,meta.duration]];
  const slopes=knots.slice(1).map((k,i)=>(k[1]-knots[i][1])/(k[0]-knots[i][0]));
  tangents=knots.map((_,i)=>i===0||i===knots.length-1?0:slopes[i-1]*slopes[i]<=0?0:2/(1/slopes[i-1]+1/slopes[i]));
}
export function journeyTime(p){
  const i=Math.min(knots.length-2,Math.max(0,knots.findIndex((k,j)=>j<knots.length-1&&p<=knots[j+1][0])));
  const [x,y]=knots[i],h=knots[i+1][0]-x,t=clamp((p-x)/h),t2=t*t,t3=t2*t;
  return (2*t3-3*t2+1)*y+(t3-2*t2+t)*h*tangents[i]+(-2*t3+3*t2)*knots[i+1][1]+(t3-t2)*h*tangents[i+1];
}
export function createJourney(meta,data){
  if(meta.source!=='gravity-jar-lens-bowl'||!meta.lensContacts.length)throw new Error('A validated jar and lens simulation is required.');
  configureClock(meta);
  const stride=meta.count*7,qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),tracked=new THREE.Vector3(),rotation=new THREE.Quaternion();
  const impact=new Map(meta.lensContacts.map(c=>[c.id,{at:c.time,off:c.time+.18}]));
  const trackId=meta.lensContacts[0].id;
  function pose(id,time,pos,rot){
    const f=clamp(time/meta.duration)*(meta.frames-1),frame=Math.min(meta.frames-2,Math.floor(f)),mix=f-frame,a=frame*stride+id*7,b=a+stride;
    pos.set(THREE.MathUtils.lerp(data[a],data[b],mix)/meta.positionScale,THREE.MathUtils.lerp(data[a+1],data[b+1],mix)/meta.positionScale,THREE.MathUtils.lerp(data[a+2],data[b+2],mix)/meta.positionScale);
    qa.set(data[a+3],data[a+4],data[a+5],data[a+6]).normalize();qb.set(data[b+3],data[b+4],data[b+5],data[b+6]).normalize();rot.copy(qa).slerp(qb,mix);
  }
  function cameraPose(progress,aspect,position,target){
    const time=journeyTime(progress),f=clamp(time/meta.duration)*(meta.frames-1),frame=Math.min(meta.frames-2,Math.floor(f)),mix=f-frame;
    position.fromArray(meta.cameraFrames[frame]).lerp(new THREE.Vector3().fromArray(meta.cameraFrames[frame+1]),mix);
    const portrait=clamp((1.15-aspect)/.65),reveal=phase(.67,.98,progress);
    position.z+=portrait*1.7*reveal;position.y+=portrait*.5*reveal;
    pose(trackId,time,tracked,rotation);tracked.y=Math.max(.05,tracked.y);
    target.copy(openingAim).lerp(tracked,phase(.43,.62,progress));
    target.lerp(new THREE.Vector3(0,.22,0),phase(.66,.86,progress));
  }
  return {pose,sampleCache:pose,cameraPose,impact,births:meta.births,meta,knots};
}
