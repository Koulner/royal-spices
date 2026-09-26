import fs from 'node:fs';import zlib from 'node:zlib';import assert from 'node:assert/strict';
import {SHAPE as S,toJar,jarSideDistance,bowlSurface,lensPosition} from '../dist/physics-shape.js';
import {sampleFiber} from '../dist/fiber-curve.js';
const root='./',meta=JSON.parse(fs.readFileSync(root+'dist/assets/saffron-motion.json'));
const bytes=zlib.gunzipSync(fs.readFileSync(root+'dist/assets/saffron-motion.bin.gz')),data=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.length/2);
const stride=meta.count*meta.nodes*3;for(let i=stride;i<data.length;i++)data[i]+=data[i-stride];
const failures={glass:0,bowl:0,room:0,lens:0,exit:0},examples=[];
let maxGlass=0,maxBowl=0,maxLens=0,maxMotion=0,protruding=0,checked=0;
const local=[0,0,0],prevLocal=[0,0,0],nodeExited=new Uint8Array(meta.count*meta.nodes);
const points=new Float32Array(stride),smooth=[0,0,0];
function fail(type,frame,id,depth){failures[type]++;if(examples.length<24)examples.push({type,frame,id,depth});}
// Full centerline capsule envelope, all frames plus temporal midpoints and
// three spatial samples per segment. Radius exceeds the maximum rendered tube.
for(let frame=0;frame<meta.frames-1;frame++){
  for(let sub=0;sub<2;sub++){
    const mix=sub/2,time=(frame+mix)/meta.fps,base=frame*stride,lens=lensPosition(time);
    for(let k=0;k<stride;k++)points[k]=(data[base+k]+(data[base+stride+k]-data[base+k])*mix)/meta.positionScale;
    for(let id=0;id<meta.count;id++){
      let sticksOut=false;
      for(let j=0;j<meta.nodes-1;j++)for(let seg=0;seg<3;seg++){
        const u=seg/2,a=base+(id*meta.nodes+j)*3,b=a+3;
        const p=sampleFiber(points,id,meta.nodes,(j+u)/(meta.nodes-1),smooth);
        checked++;toJar(...p,time,local);
        if(frame===0&&sub===0&&local[1]<0)sticksOut=true;
        if(local[1]>=-.026&&local[1]<=S.bottom+.03){
          const d=jarSideDistance(...local),penetration=d+S.maxVisualRadius;
          // A fiber can be outside after exiting; the shell itself must remain clear.
          if(penetration>0&&d<S.wall+S.maxVisualRadius){maxGlass=Math.max(maxGlass,penetration);fail('glass',frame,id,penetration);}
          if(d<0&&local[1]+S.maxVisualRadius>S.bottom){maxGlass=Math.max(maxGlass,local[1]+S.maxVisualRadius-S.bottom);fail('glass',frame,id,local[1]-S.bottom);}
        }
        const radial=Math.hypot(p[0],p[2]),[height,slope]=bowlSurface(radial);
        const depth=(height-p[1])/Math.sqrt(1+slope*slope)+S.maxVisualRadius;
        if(radial<1.38&&depth>0){maxBowl=Math.max(maxBowl,depth);fail('bowl',frame,id,depth);}
        if(p[2]<-5.4||p[1]<-.53)fail('room',frame,id,0);
        const lensDepth=S.lensRadius+S.maxVisualRadius-Math.hypot(p[0]-lens[0],p[1]-lens[1],p[2]-lens[2]);
        if(lensDepth>.001){maxLens=Math.max(maxLens,lensDepth);fail('lens',frame,id,lensDepth);}
      }
      if(frame===0&&sub===0&&sticksOut)protruding++;
    }
  }
}
for(let frame=0;frame<meta.frames;frame++)for(let node=0;node<meta.count*meta.nodes;node++){
  const a=frame*stride+node*3,p=[data[a]/meta.positionScale,data[a+1]/meta.positionScale,data[a+2]/meta.positionScale];toJar(...p,frame/meta.fps,local);
  if(!nodeExited[node]){
    if(local[1]<0){nodeExited[node]=1;if(Math.hypot(local[0],local[2])+S.maxVisualRadius>S.neck)fail('exit',frame,Math.floor(node/meta.nodes),0);}
    else if(jarSideDistance(...local)>0)fail('exit',frame,Math.floor(node/meta.nodes),jarSideDistance(...local));
  }
  if(frame>0){const b=a-stride;maxMotion=Math.max(maxMotion,Math.hypot(data[a]-data[b],data[a+1]-data[b+1],data[a+2]-data[b+2])/meta.positionScale);}
}
const allFinal=meta.records.every(r=>r.final.inside&&r.exit!==null&&(r.bowl!==null||r.pile!==null)&&r.final.speed===0);
const report={date:new Date().toISOString(),version:meta.source,stats:meta.stats,checkedCapsuleSamples:checked,temporalSubdivisions:2,segmentSubdivisions:2,visualRadius:S.maxVisualRadius,protrudingAtStart:protruding,failures,maxGlass,maxBowl,maxLens,maxNodeMotionPerFrame:maxMotion,allFinal,examples,passed:Object.values(failures).every(v=>v===0)&&allFinal&&protruding>=5};
fs.writeFileSync(root+'motion-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert(report.passed,'Motion geometry audit failed');
