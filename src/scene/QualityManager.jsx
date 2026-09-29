import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
export function QualityManager({setTier}) {
  const sample=useRef({t:0,n:0,slow:0,settled:false}); const setDpr=useThree(s=>s.setDpr);
  useFrame((_,dt)=>{
    const a=sample.current; if(a.settled) return; a.t+=dt; a.n++; if(dt>.038) a.slow++;
    if(a.t>7) { if(a.slow/a.n>.28){ setDpr(1); setTier('low'); } a.settled=true; }
  });
  return null;
}
