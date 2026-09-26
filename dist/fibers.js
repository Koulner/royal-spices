import * as THREE from './assets/three.module.js';
import {sampleFiber} from './fiber-curve.js';
import {fiberProfile,noise} from './fiber-morphology.js';

export function createFibers(meta,compact){
  const sides=compact?5:8,rings=compact?19:31,ringStride=sides+1;
  const vertices=meta.count*rings*ringStride;
  const points=new Float32Array(meta.count*meta.nodes*3),centers=new Float32Array(meta.count*rings*3);
  const positions=new Float32Array(vertices*3),normals=new Float32Array(vertices*3),colors=new Float32Array(vertices*3),uvs=new Float32Array(vertices*2);
  const profile=new Float32Array(vertices*5),indices=new Uint32Array(meta.count*(rings-1)*sides*6);
  const farIndices=[];
  const color=new THREE.Color(),rootColor=new THREE.Color(0xa84915),tipColor=new THREE.Color(0xad2823),p=[0,0,0,0,0];let index=0;
  const palette=[0x751025,0x98192b,0x600c1d,0xa12526,0x721020,0x8e1930,0x621326];
  for(let id=0;id<meta.count;id++)for(let j=0;j<rings;j++)for(let k=0;k<ringStride;k++){
    const v=(id*rings+j)*ringStride+k,t=j/(rings-1),seed=noise(id+1);
    fiberProfile(id,t,k/sides*Math.PI*2,p);profile.set(p,v*5);
    color.setHex(palette[Math.floor(seed*palette.length)]);
    if(noise(id+77)>.86)color.lerp(rootColor,.66*(1-Math.min(1,t/.26)));
    color.lerp(tipColor,.24*Math.max(0,(t-.78)/.22));
    color.multiplyScalar(.82+.29*noise(id*43+j*.07));colors.set(color.toArray(),v*3);
    uvs.set([t,k/sides+seed*13],v*2);
    if(j<rings-1&&k<sides){const a=v,b=v+1;indices.set([a,b,b+ringStride,a,b+ringStride,a+ringStride],index);index+=6;}
    if(!compact&&j<rings-1&&j%2===0&&k<sides&&k%2===0){const a=v,b=v+2,c=b+ringStride*2,d=a+ringStride*2;farIndices.push(a,b,c,a,c,d);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.setIndex(new THREE.BufferAttribute(indices,1));
  const nearIndex=geometry.index,farIndex=compact?nearIndex:new THREE.BufferAttribute(new Uint32Array(farIndices),1);
  const material=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.94,metalness:0,specularIntensity:.24,envMapIntensity:.18,side:THREE.DoubleSide});
  material.defines={USE_UV:''};
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      float fiberHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float fiberNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(fiberHash(i),fiberHash(i+vec2(1,0)),f.x),mix(fiberHash(i+vec2(0,1)),fiberHash(i+vec2(1,1)),f.x),f.y);}
      float fiberHeight(vec2 uv){
        float vein=sin(uv.y*75.398+fiberNoise(vec2(uv.x*16.,uv.y*5.))*2.8);
        float cells=fiberNoise(uv*vec2(650.,80.));
        return vein*.000035+cells*.000055;
      }`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float grain=fiberNoise(vUv*vec2(650.,80.));
      float folds=fiberNoise(vUv*vec2(45.,15.));
      float vein=sin(vUv.y*75.398+fiberNoise(vUv*vec2(16.,5.))*2.8);
      float detail=1.-smoothstep(.5,2.,length(fwidth(vUv*vec2(650.,80.))));
      diffuseColor.rgb*=.73+.30*folds+.035*vein+detail*(grain-.5)*.24;
      float speck=smoothstep(.78,.93,grain)*detail;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.24,.039,.013),speck*.28);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float h=fiberHeight(vUv);
      vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
      vec3 r1=cross(q1,normal),r2=cross(normal,q0);
      float det=dot(q0,r1);
      vec3 grad=sign(det)*(dFdx(h)*r1+dFdy(h)*r2);
      normal=normalize(abs(det)*normal-grad);`);
  };
  material.customProgramCacheKey=()=> 'dried-stigma-v2';
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=true;
  const tangent=new THREE.Vector3(),normal=new THREE.Vector3(),binormal=new THREE.Vector3(),oldNormal=new THREE.Vector3();const sampled=[0,0,0];
  let detailed=true;
  function setDetail(value){if(compact||value===detailed)return;detailed=value;geometry.setIndex(value?nearIndex:farIndex);}
  function update(){
    for(let id=0;id<meta.count;id++){
      for(let j=0;j<rings;j++){sampleFiber(points,id,meta.nodes,j/(rings-1),sampled);centers.set(sampled,(id*rings+j)*3);}
      for(let j=0;j<rings;j++){
        const n=id*rings+j,a=(id*rings+Math.max(0,j-1))*3,b=(id*rings+Math.min(rings-1,j+1))*3;
        tangent.set(centers[b]-centers[a],centers[b+1]-centers[a+1],centers[b+2]-centers[a+2]).normalize();
        if(j===0){
          // Deterministic minimal rotation frame: no abrupt reference-axis
          // switch as a flat stigma bends past an arbitrary angle threshold.
          if(tangent.z<-.999999)normal.set(0,-1,0);
          else {const a=1/(1+tangent.z);normal.set(1-tangent.x*tangent.x*a,-tangent.x*tangent.y*a,-tangent.x);}
        }
        else normal.copy(oldNormal).addScaledVector(tangent,-oldNormal.dot(tangent)).normalize();
        oldNormal.copy(normal);binormal.crossVectors(tangent,normal).normalize();
        if(!compact&&!detailed&&j%2)continue;
        for(let k=0;k<ringStride;k++){
          if(!compact&&!detailed&&k%2)continue;
          const v=n*ringStride+k,off=v*5,a=v*3,x=profile[off],y=profile[off+1],z=profile[off+2],nx=profile[off+3],ny=profile[off+4];
          positions[a]=centers[n*3]+normal.x*x+binormal.x*y+tangent.x*z;
          positions[a+1]=centers[n*3+1]+normal.y*x+binormal.y*y+tangent.y*z;
          positions[a+2]=centers[n*3+2]+normal.z*x+binormal.z*y+tangent.z*z;
          normals[a]=normal.x*nx+binormal.x*ny;normals[a+1]=normal.y*nx+binormal.y*ny;normals[a+2]=normal.z*nx+binormal.z*ny;
        }
      }
    }
    geometry.attributes.position.needsUpdate=true;geometry.attributes.normal.needsUpdate=true;
  }
  return {mesh,points,update,setDetail};
}
