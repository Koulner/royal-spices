// The renderer, bake and independent audit use the same dimensional model.
export const SHAPE = Object.freeze({
  mouth: [0, 5.6, 0], neck: .365, shoulderStart: .18,
  shoulderEnd: .43, halfWidth: .575, halfDepth: .475,
  corner: .14, bottom: 1.52, wall: .043,
  collisionRadius: .0125, maxVisualRadius: .0085,
  lens: [0.01, 4.63, .22], lensRadius: .205,
  bowl: [[0,-.48],[.33,-.48],[.58,-.43],[.87,-.27],[1.11,-.03],[1.29,.22],[1.34,.36],[1.38,.45]],
});
export const clamp = x => Math.max(0, Math.min(1, x));
export const ease = x => {x=clamp(x);return x*x*(3-2*x);};
export const phase = (a,b,x) => ease((x-a)/(b-a));
export const jarAngle = t => .82 - .67*ease(t/.95);
export const lensDetachTime=.82;
export function lensPosition(t,out=[0,0,0]){
  const u=phase(lensDetachTime,1.86,t),distance=2.2*phase(lensDetachTime,1.28,t),angle=-.15+.52*u;
  out[0]=S_lens[0]+Math.sin(angle)*distance;
  out[1]=S_lens[1]-3.8*u;
  out[2]=S_lens[2]+Math.cos(angle)*distance;return out;
}
const S_lens=SHAPE.lens;
export function toJar(x,y,z,time,out=[0,0,0]) {
  const a=jarAngle(time),c=Math.cos(a),s=Math.sin(a);
  x-=SHAPE.mouth[0];y-=SHAPE.mouth[1];z-=SHAPE.mouth[2];
  out[0]=c*x+s*y;out[1]=-s*x+c*y;out[2]=z;return out;
}
export function fromJar(x,y,z,time,out=[0,0,0]) {
  const a=jarAngle(time),c=Math.cos(a),s=Math.sin(a);
  out[0]=c*x-s*y+SHAPE.mouth[0];out[1]=s*x+c*y+SHAPE.mouth[1];out[2]=z+SHAPE.mouth[2];return out;
}
// Continuous transition from a circular neck to the rounded rectangular body.
export function crossSection(y) {
  const u=clamp((y-SHAPE.shoulderStart)/(SHAPE.shoulderEnd-SHAPE.shoulderStart));
  return [SHAPE.neck+(SHAPE.halfWidth-SHAPE.neck)*u,
    SHAPE.neck+(SHAPE.halfDepth-SHAPE.neck)*u,
    SHAPE.neck+(SHAPE.corner-SHAPE.neck)*u];
}
export function jarSideDistance(x,y,z) {
  const [w,d,r]=crossSection(y),qx=Math.abs(x)-(w-r),qz=Math.abs(z)-(d-r);
  return Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-r;
}
export function bowlSurface(r) {
  const p=SHAPE.bowl;
  for(let i=1;i<p.length;i++)if(r<=p[i][0]){
    const a=p[i-1],b=p[i],s=(b[1]-a[1])/(b[0]-a[0]);
    return [a[1]+(r-a[0])*s,s];
  }
  return [.45,0];
}
