// Clamped cubic B-spline of permanent rod control points. Positive weights keep
// the visible surface inside their convex hull; Catmull-Rom overshoot can cut
// through a collider even when every control point has resolved its contact.
export function sampleFiber(points,id,nodes,u,out){
  const f=Math.max(0,Math.min(1,u))*(nodes+1)-1,j=Math.floor(f),t=f-j,t2=t*t,t3=t2*t;
  const offset=k=>(id*nodes+Math.max(0,Math.min(nodes-1,k)))*3;
  const a=offset(j-1),b=offset(j),c=offset(j+1),d=offset(j+2);
  const wa=(1-3*t+3*t2-t3)/6,wb=(4-6*t2+3*t3)/6,wc=(1+3*t+3*t2-3*t3)/6,wd=t3/6;
  for(let k=0;k<3;k++)out[k]=wa*points[a+k]+wb*points[b+k]+wc*points[c+k]+wd*points[d+k];
  return out;
}
