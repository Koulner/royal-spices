import * as THREE from './assets/three.module.js';
import { mergeGeometries } from './assets/BufferGeometryUtils.js';
export function addBowl(group,metal,renderer){
  const profile=[[0,-.53],[.38,-.53],[.62,-.48],[.93,-.32],[1.17,-.06],[1.34,.21],[1.39,.35],[1.43,.4],[1.42,.45],[1.38,.45],[1.34,.36],[1.29,.22],[1.11,-.03],[.87,-.27],[.58,-.43],[.33,-.48],[0,-.48]].map(p=>new THREE.Vector2(...p));
  const geometry=new THREE.LatheGeometry(profile,128);
  const uv=geometry.attributes.uv,pos=geometry.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setY(i,pos.getY(i)+.55);
  metal.colorSpace=THREE.SRGBColorSpace;metal.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const brass=new THREE.MeshStandardMaterial({color:0xffefcd,map:metal,bumpMap:metal,bumpScale:.008,metalness:.94,roughness:.34,envMapIntensity:1.1});
  const bowl=new THREE.Mesh(geometry,brass);bowl.castShadow=true;bowl.receiveShadow=true;group.add(bowl);
  const bandMaterial=new THREE.MeshStandardMaterial({color:0xceb481,metalness:1,roughness:.25});
  const bands=[];
  for(const [radius,y,tube] of [[1.403,.446,.019],[1.385,.355,.009],[1.335,.205,.009],[.43,-.528,.028],[.5,-.51,.015]]){
    const ring=new THREE.TorusGeometry(radius,tube,10,128);ring.rotateX(Math.PI/2);ring.translate(0,y,0);bands.push(ring);
  }
  const bandMesh=new THREE.Mesh(mergeGeometries(bands),bandMaterial);bandMesh.castShadow=true;bandMesh.receiveShadow=true;group.add(bandMesh);bands.forEach(g=>g.dispose());


}
