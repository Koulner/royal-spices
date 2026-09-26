// Dried stigma morphology. The entire profile stays inside the audited envelope.
export const MORPHOLOGY_VERSION='dried-stigma-v2';
export const noise=id=>{const v=Math.sin(id*127.1+311.7)*43758.5453123;return v-Math.floor(v);};
const smooth=(a,b,t)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
export function fiberProfile(id,t,theta,out){
  const seed=noise(id+1),variant=noise(id+719),flare=smooth(.64+variant*.12,1,t);
  const root=smooth(0,.075,t),body=(.0019+seed*.00125)*(.38+.62*root);
  const width=(body+(.0061-body)*flare)*(.82+.18*variant);
  const thickness=(.00072+variant*.00038)*(.3+.7*root)+.00055*flare;
  const twist=seed*6.283+(variant-.5)*5.5*t+.26*Math.sin(t*13+seed*9);
  const c=Math.cos(theta),s=Math.sin(theta);
  const wrinkle=1+.08*Math.sin(t*61+seed*19+theta*3)+.045*Math.sin(t*137+theta*5);
  // A folded, flattened bell at the distal end, with a scalloped lip.
  const lip=1+.10*flare*Math.cos(theta*3+seed*6);
  const x=c*width*wrinkle*lip;
  const y=s*thickness+flare*width*.24*(c*c-.5);
  out[0]=x*Math.cos(twist)-y*Math.sin(twist);
  out[1]=x*Math.sin(twist)+y*Math.cos(twist);
  out[2]=smooth(.86,1,t)*(.0017*Math.sin(theta*3+seed*11)-.0014*c*c+.0004*Math.sin(theta*7));
  const nx=c/width,ny=s/thickness,nl=Math.hypot(nx,ny);
  out[3]=(nx*Math.cos(twist)-ny*Math.sin(twist))/nl;
  out[4]=(nx*Math.sin(twist)+ny*Math.cos(twist))/nl;
  return out;
}
