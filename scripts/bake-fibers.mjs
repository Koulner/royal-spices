import fs from 'node:fs';
import zlib from 'node:zlib';
import {SHAPE as S,jarAngle,fromJar,toJar,jarSideDistance,crossSection,bowlSurface,lensPosition} from '../dist/physics-shape.js';

// Flexible discrete rods, fixed substeps, constraint contacts. No per-fiber release
// times, destination attraction, render-time projection or replacement geometry.
const count=800,nodes=13,N=count*nodes,hz=180,fps=60,dt=1/hz,duration=10;
const radius=S.collisionRadius,spacing=radius*2,frames=duration*fps+1;
const p=new Float64Array(N*3),prev=new Float64Array(N*3),velocity=new Float64Array(N*3);
const rest=new Float64Array(count*(nodes-1)),bend=new Float64Array(count*(nodes-2));
const exited=new Uint8Array(N),contacts=new Uint8Array(N),normal=new Float64Array(N*3);
const asleep=new Uint8Array(count),quiet=new Float64Array(count);
const records=Array.from({length:count},(_,id)=>({id:`saffron-${String(id+1).padStart(4,'0')}`,start:[],exit:null,lens:null,bowl:null,pile:null,sleep:null,final:null}));
let seed=83019;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const local=[0,0,0],world=[0,0,0],lens=[0,0,0];
for(let id=0;id<count;id++){
  const leading=id<72;
  const cy=leading?.055+random()*.19:.45+random()*.91;
  const [w,d]=crossSection(cy);
  const cx=(random()-.5)*(w-.13)*1.55,cz=(random()-.5)*(d-.12)*1.55;
  const a=random()*Math.PI*2,b=leading?0:random()*Math.PI;
  const length=.27+random()*.13,curve=.016+random()*.025;
  for(let j=0;j<nodes;j++){
    const u=j/(nodes-1)-.5,along=u*length;
    const x=cx+Math.sin(a)*Math.sin(b)*along+Math.cos(a)*Math.sin(u*5)*curve;
    const y=cy+Math.cos(b)*along;
    const z=cz+Math.cos(a)*Math.sin(b)*along+Math.sin(a)*Math.sin(u*5)*curve;
    fromJar(x,y,z,0,world);p.set(world,(id*nodes+j)*3);
  }
  for(let j=0;j<nodes-1;j++){const a=(id*nodes+j)*3;rest[id*(nodes-1)+j]=Math.hypot(p[a]-p[a+3],p[a+1]-p[a+4],p[a+2]-p[a+5]);}
  for(let j=0;j<nodes-2;j++){const a=(id*nodes+j)*3;bend[id*(nodes-2)+j]=Math.hypot(p[a]-p[a+6],p[a+1]-p[a+7],p[a+2]-p[a+8]);}
}
function distance(a,b,length,stiffness){
  const dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2],d=Math.hypot(dx,dy,dz);
  if(d<1e-10)return;const f=Math.max(-.18,Math.min(.18,(d-length)/d*.5*stiffness));
  p[a]+=dx*f;p[a+1]+=dy*f;p[a+2]+=dz*f;p[b]-=dx*f;p[b+1]-=dy*f;p[b+2]-=dz*f;
}
function rods(){
  for(let id=0;id<count;id++){
    if(asleep[id])continue;
    for(let j=0;j<nodes-1;j++)distance((id*nodes+j)*3,(id*nodes+j+1)*3,rest[id*(nodes-1)+j],1);
    for(let j=nodes-2;j>=0;j--)distance((id*nodes+j)*3,(id*nodes+j+1)*3,rest[id*(nodes-1)+j],1);
    for(let j=0;j<nodes-2;j++)distance((id*nodes+j)*3,(id*nodes+j+2)*3,bend[id*(nodes-2)+j],.38);
  }
}
const cell=spacing,grid=new Map();
const hash=(x,y,z)=>x+2048*y+4194304*z;
function fibers(){
  grid.clear();
  for(let i=0;i<N;i++){
    const a=i*3,x=Math.floor(p[a]/cell),y=Math.floor(p[a+1]/cell),z=Math.floor(p[a+2]/cell);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
      const list=grid.get(hash(x+dx,y+dy,z+dz));if(!list)continue;
      for(const k of list){if(Math.floor(k/nodes)===Math.floor(i/nodes))continue;
        const b=k*3,rx=p[a]-p[b],ry=p[a+1]-p[b+1],rz=p[a+2]-p[b+2],d2=rx*rx+ry*ry+rz*rz;
        if(d2<spacing*spacing&&d2>1e-12){
          const ia=Math.floor(i/nodes),ib=Math.floor(k/nodes);
          if(time>0&&p[a+1]<.4&&p[b+1]<.4){
            if((records[ia].bowl!==null||records[ia].pile!==null)&&records[ib].pile===null)records[ib].pile=time;
            if((records[ib].bowl!==null||records[ib].pile!==null)&&records[ia].pile===null)records[ia].pile=time;
          }
          const wa=asleep[ia]?0:1,wb=asleep[ib]?0:1;if(!wa&&!wb)continue;
          const d=Math.sqrt(d2),f=Math.min(.15,(spacing-d)/d*.49);
          const fa=f*wa*2/(wa+wb),fb=f*wb*2/(wa+wb);
          p[a]+=rx*fa;p[a+1]+=ry*fa;p[a+2]+=rz*fa;p[b]-=rx*fb;p[b+1]-=ry*fb;p[b+2]-=rz*fb;
          contacts[i]|=8;contacts[k]|=8;
        }
      }
    }
    const key=hash(x,y,z),list=grid.get(key);if(list)list.push(i);else grid.set(key,[i]);
  }
}
let time=0;
function surfaces(t,record=true){
  const angle=jarAngle(t),c=Math.cos(angle),s=Math.sin(angle);
  lensPosition(t,lens);
  for(let i=0;i<N;i++){
    const a=i*3,id=Math.floor(i/nodes);
    if(asleep[id])continue;
    if(!exited[i]){
      toJar(p[a],p[a+1],p[a+2],t,local);
      const glassMargin=radius+.014;
      if(local[1]<-glassMargin-.035){exited[i]=1;}
      else {
        const [w,d,r]=crossSection(local[1]),qx=Math.abs(local[0])-(w-r),qz=Math.abs(local[2])-(d-r);
        const dist=jarSideDistance(...local)+glassMargin;
        if(dist>0){
          let nx,nz;
          if(qx>0&&qz>0){const l=Math.hypot(qx,qz);nx=Math.sign(local[0])*qx/l;nz=Math.sign(local[2])*qz/l;}
          else if(qx>qz){nx=Math.sign(local[0]);nz=0;}else{nx=0;nz=Math.sign(local[2]);}
          local[0]-=nx*dist;local[2]-=nz*dist;
          contacts[i]|=1;normal[a]=-c*nx;normal[a+1]=-s*nx;normal[a+2]=-nz;
        }
        if(local[1]>S.bottom-glassMargin){local[1]=S.bottom-glassMargin;contacts[i]|=1;normal[a]=s;normal[a+1]=-c;normal[a+2]=0;}
        fromJar(...local,t,world);p.set(world,a);
      }
    }
    // A stationary convex front element. Camera withdraws only after all contacts.
    const dx=p[a]-lens[0],dy=p[a+1]-lens[1],dz=p[a+2]-lens[2],dist=Math.hypot(dx,dy,dz),lr=S.lensRadius+radius;
    if(dist<lr){
      const nx=dx/dist,ny=dy/dist,nz=dz/dist;
      p[a]=lens[0]+nx*lr;p[a+1]=lens[1]+ny*lr;p[a+2]=lens[2]+nz*lr;
      contacts[i]|=2;normal[a]=nx;normal[a+1]=ny;normal[a+2]=nz;
      if(record&&records[id].lens===null)records[id].lens=t;
    }
    const radial=Math.hypot(p[a],p[a+2]);
    if(radial<1.38){
      const [y,slope]=bowlSurface(radial),floor=y+radius*Math.sqrt(1+slope*slope)+.001;
      if(p[a+1]<floor){
        p[a+1]=floor;contacts[i]|=4;
        const l=Math.sqrt(1+slope*slope);normal[a]=-slope*p[a]/Math.max(radial,1e-6)/l;normal[a+1]=1/l;normal[a+2]=-slope*p[a+2]/Math.max(radial,1e-6)/l;
        if(record&&records[id].bowl===null)records[id].bowl=t;
      }
    }
  }
}
// Relax the initial pack before exposing frame zero; nothing is generated later.
for(let n=0;n<65;n++){rods();fibers();surfaces(0,false);}
exited.fill(0);contacts.fill(0);
for(let id=0;id<count;id++)records[id].start=Array.from(p.subarray(id*nodes*3,(id+1)*nodes*3));
const samples=new Int16Array(frames*N*3),scale=4000;
function capture(frame){for(let k=0;k<p.length;k++)samples[frame*p.length+k]=Math.round(p[k]*scale);}
capture(0);
let maxSpeed=0;
for(let step=1;step<=duration*hz;step++){
  time=step*dt;prev.set(p);contacts.fill(0);normal.fill(0);
  for(let i=0;i<N;i++){
    if(asleep[Math.floor(i/nodes)])continue;
    const a=i*3;velocity[a+1]-=9.81*dt;
    // Dry, light fibers have appreciable aerodynamic drag; it damps lateral
    // launch velocity from the rotating glass without steering toward a target.
    for(let k=0;k<3;k++){velocity[a+k]*=.988;p[a+k]+=velocity[a+k]*dt;}
  }
  for(let iteration=0;iteration<7;iteration++){rods();if(iteration%2===0)fibers();surfaces(time);}
  // Final surface projection is part of the constraint solve, never a renderer fix.
  surfaces(time);
  maxSpeed=0;
  for(let i=0;i<N;i++){
    const a=i*3;for(let k=0;k<3;k++)velocity[a+k]=(p[a+k]-prev[a+k])/dt;
    if(contacts[i]&7){
      const dot=velocity[a]*normal[a]+velocity[a+1]*normal[a+1]+velocity[a+2]*normal[a+2];
      for(let k=0;k<3;k++)velocity[a+k]=(velocity[a+k]-Math.min(0,dot)*normal[a+k])*(contacts[i]&4?.52:.86);
    }
    if(contacts[i]&8)for(let k=0;k<3;k++)velocity[a+k]*=.97;
    // Distributed dry contact dissipates bending oscillations once the rod is
    // supported by metal or by the pile. This is solver damping, not a target path.
    const record=records[Math.floor(i/nodes)];
    if(p[a+1]<0&&(record.bowl!==null||record.pile!==null))for(let k=0;k<3;k++)velocity[a+k]*=.65;
    maxSpeed=Math.max(maxSpeed,Math.hypot(velocity[a],velocity[a+1],velocity[a+2]));
  }
  for(let id=0;id<count;id++)if(records[id].exit===null&&exited.subarray(id*nodes,(id+1)*nodes).every(Boolean))records[id].exit=time;
  for(let id=0;id<count;id++){
    if(asleep[id]||(records[id].bowl===null&&records[id].pile===null))continue;
    let vx=0,vy=0,vz=0,max=0,ymax=-Infinity;
    for(let j=0;j<nodes;j++){const a=(id*nodes+j)*3;vx+=velocity[a];vy+=velocity[a+1];vz+=velocity[a+2];max=Math.max(max,Math.hypot(...velocity.subarray(a,a+3)));ymax=Math.max(ymax,p[a+1]);}
    quiet[id]=Math.hypot(vx,vy,vz)/nodes<.055&&max<.45&&ymax<.38?quiet[id]+dt:0;
    if(quiet[id]>.65){asleep[id]=1;records[id].sleep=time;velocity.fill(0,id*nodes*3,(id+1)*nodes*3);}
  }
  if(step%(hz/fps)===0)capture(step/(hz/fps));
  if(step%hz===0)console.log(JSON.stringify({time,released:records.filter(r=>r.exit!==null).length,lens:records.filter(r=>r.lens!==null).length,bowl:records.filter(r=>r.bowl!==null).length,maxSpeed:+maxSpeed.toFixed(4)}));
}
for(let id=0;id<count;id++){
  let speed=0,rmax=0,ymax=-Infinity,minClearance=Infinity;
  for(let j=0;j<nodes;j++){
    const a=(id*nodes+j)*3,r=Math.hypot(p[a],p[a+2]);rmax=Math.max(rmax,r);ymax=Math.max(ymax,p[a+1]);
    minClearance=Math.min(minClearance,p[a+1]-bowlSurface(r)[0]);speed=Math.max(speed,Math.hypot(...velocity.subarray(a,a+3)));
  }
  records[id].final={inside:rmax+S.maxVisualRadius<1.38&&ymax+S.maxVisualRadius<.45&&minClearance>=S.maxVisualRadius,speed,rmax,ymax,minClearance};
}
const stats={count,nodesPerFiber:nodes,released:records.filter(r=>r.exit!==null).length,lensContacts:records.filter(r=>r.lens!==null).length,directMetalContacts:records.filter(r=>r.bowl!==null).length,bowlContacts:records.filter(r=>r.bowl!==null||r.pile!==null).length,sleeping:asleep.reduce((a,b)=>a+b,0),landed:records.filter(r=>r.final.inside).length,maxFinalSpeed:Math.max(...records.map(r=>r.final.speed))};
fs.writeFileSync('diagnostics/bake-diagnostic.json',JSON.stringify({stats,records},null,2));
if(stats.released!==count||stats.landed!==count||stats.bowlContacts!==count||stats.lensContacts===0||stats.maxFinalSpeed>.06)throw new Error('Motion acceptance failed: '+JSON.stringify(stats));
const firstLens=Math.min(...records.filter(r=>r.lens!==null).map(r=>r.lens)),lastLens=Math.max(...records.filter(r=>r.lens!==null).map(r=>r.lens));
const firstBowl=Math.min(...records.filter(r=>r.bowl!==null).map(r=>r.bowl)),lastBowl=Math.max(...records.map(r=>r.bowl??r.pile));
const meta={source:'flexible-fibers-v1',encoding:'delta-int16',count,nodes,frames,fps,duration,positionScale:scale,stats,firstLens,lastLens,firstBowl,lastBowl,records};
for(let k=samples.length-1;k>=N*3;k--)samples[k]-=samples[k-N*3];
fs.writeFileSync('./dist/assets/saffron-motion.json',JSON.stringify(meta));
fs.writeFileSync('./dist/assets/saffron-motion.bin.gz',zlib.gzipSync(Buffer.from(samples.buffer),{level:9}));
console.log(JSON.stringify({status:'accepted',...stats,firstLens,lastLens,firstBowl,lastBowl}));
