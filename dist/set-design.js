import * as THREE from './assets/three.module.js';
import {SHAPE as S, jarAngle} from './physics-shape.js';

function glassGeometry(){
  // Closed thick shell, rounded rectangular body and circular glass neck.
  const rings=[
    [.408,.408,.408,-.035],[.438,.438,.438,.015],[.438,.438,.438,.07],[.408,.408,.408,.11],
    [.408,.408,.408,.18],[.61,.51,.175,.43],[.619,.519,.184,1.48],
    [.597,.497,.18,1.60],[.54,.44,.16,1.635],[0,0,0,1.635],[0,0,0,1.52],
    [.575,.475,.14,1.52],[.575,.475,.14,.43],[.365,.365,.365,.18],[.365,.365,.365,-.035],
    [.408,.408,.408,-.035]
  ];
  const positions=[],uv=[],indices=[],segments=128;
  for(let j=0;j<rings.length;j++){
    const [w,d,r,y]=rings[j];
    for(let i=0;i<=segments;i++){
      const k=i%segments,corner=Math.floor(k/32),a=(k%32)/31*Math.PI/2+corner*Math.PI/2;
      const cx=(corner===0||corner===3?1:-1)*(w-r),cz=(corner<2?1:-1)*(d-r);
      positions.push(cx+r*Math.cos(a),y,cz+r*Math.sin(a));uv.push(i/segments,j/(rings.length-1));
      if(j&&i){const q=j*(segments+1)+i;indices.push(q,q-1,q-segments-2,q,q-segments-2,q-segments-1);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function labelTexture(){
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1792;
  const c=canvas.getContext('2d');c.fillStyle='#f0ede5';c.fillRect(0,0,1536,1792);
  c.strokeStyle='#857e60';c.lineWidth=8;c.beginPath();c.roundRect(35,35,1466,1722,80);c.stroke();
  c.lineWidth=2;c.beginPath();c.roundRect(58,58,1420,1676,65);c.stroke();
  c.strokeStyle='#6c7252';c.lineWidth=9;c.beginPath();c.moveTo(768,244);c.lineTo(768,117);c.stroke();
  for(const side of [-1,1]){c.beginPath();c.ellipse(768+side*33,172,18,44,side*.55,0,Math.PI*2);c.stroke();}
  c.fillStyle='#30352c';c.textAlign='center';c.textBaseline='middle';
  c.font='150px Georgia';c.fillText('ROYAL',768,425);c.fillText('SPICES',768,604);
  c.font='72px Manrope, Arial';c.letterSpacing='12px';c.fillText('SAFFRON',768,969);
  c.letterSpacing='0px';c.font='76px Georgia';c.fillText('0,5 g',768,1330);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
function woodMaterial(color=0x725038){
  const m=new THREE.MeshStandardMaterial({color,roughness:.72,metalness:0,envMapIntensity:.45});
  m.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 timberPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntimberPosition=position;');
    shader.fragmentShader='varying vec3 timberPosition;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=timberPosition;
      float warp=sin(p.x*.41+p.z*.19)*.19+sin(p.x*1.3)*.028;
      float rings=sin((p.z+warp)*19.+sin(p.x*.32)*2.);
      float fine=sin((p.z+warp)*310.+sin(p.x*3.)*1.5);
      float pores=pow(max(0.,sin(p.x*27.+p.z*59.)),14.)*pow(max(0.,sin(p.z*381.)),8.);
      float plank=floor((p.z+12.)/1.32);
      float seam=1.-smoothstep(.003,.012,abs(fract((p.z+12.)/1.32)-.5));
      diffuseColor.rgb*=.90+.085*rings+.027*fine-.075*pores-.08*seam+.025*sin(plank*8.7);`);
  };return m;
}
export function addSet(world,textures){
  const jar=new THREE.Group();jar.position.fromArray(S.mouth);world.add(jar);
  const glass=new THREE.Mesh(glassGeometry(),new THREE.MeshPhysicalMaterial({color:0xe8eee4,roughness:.105,transmission:.985,thickness:.086,ior:1.5,metalness:0,side:THREE.DoubleSide,envMapIntensity:1.2,attenuationColor:0xbacabd,attenuationDistance:4}));
  glass.renderOrder=3;jar.add(glass);
  const green=new THREE.MeshStandardMaterial({color:0x293e2c,roughness:.86});
  const band=new THREE.Mesh(new THREE.PlaneGeometry(.29,1.10),green);band.position.set(0,1.02,.523);jar.add(band);
  const neckBand=new THREE.Mesh(new THREE.PlaneGeometry(.29,.13),green);neckBand.position.set(0,.13,.445);jar.add(neckBand);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(1.065,1.245),new THREE.MeshStandardMaterial({map:labelTexture(),roughness:.88,metalness:0,side:THREE.DoubleSide}));
  label.position.set(0,.975,.526);label.rotation.z=Math.PI;jar.add(label);
  // Removed cork rests beside the bowl; the mouth is physically open.
  const corkTexture=textures.wood.clone();corkTexture.colorSpace=THREE.SRGBColorSpace;corkTexture.needsUpdate=true;
  const cork=new THREE.Mesh(new THREE.CylinderGeometry(.404,.39,.22,64),new THREE.MeshStandardMaterial({map:corkTexture,color:0xdcc7a7,roughness:.87}));
  cork.position.set(-2.05,-.412,-.45);cork.rotation.y=.4;cork.castShadow=true;cork.receiveShadow=true;world.add(cork);
  const sealShape=new THREE.Shape();
  for(let i=0;i<=16;i++){const x=-.12+i*.24/16,z=Math.sqrt(.404*.404-x*x);if(!i)sealShape.moveTo(x,z);else sealShape.lineTo(x,z);}
  for(let i=16;i>=0;i--){const x=-.12+i*.24/16;sealShape.lineTo(x,-Math.sqrt(.404*.404-x*x));}sealShape.closePath();
  const seal=new THREE.Mesh(new THREE.ShapeGeometry(sealShape),green);seal.rotation.x=-Math.PI/2;seal.position.y=.111;cork.add(seal);
  const arc=Math.asin(.12/.4);
  for(const angle of [0,Math.PI]){const strip=new THREE.Mesh(new THREE.CylinderGeometry(.405,.391,.22,16,1,true,angle-arc,arc*2),green);cork.add(strip);}
  textures.wood.colorSpace=THREE.SRGBColorSpace;textures.wood.wrapS=textures.wood.wrapT=THREE.RepeatWrapping;textures.wood.repeat.set(2.2,2.4);textures.wood.anisotropy=8;
  const walnut=new THREE.MeshStandardMaterial({map:textures.wood,bumpMap:textures.wood,bumpScale:.009,roughness:.68,envMapIntensity:.25});
  const table=new THREE.Mesh(new THREE.BoxGeometry(22,.30,18),walnut);table.position.set(0,-.70,-1.5);table.receiveShadow=true;world.add(table);
  textures.kitchen.colorSpace=THREE.SRGBColorSpace;
  textures.kitchen.offset.y=.26;textures.kitchen.repeat.y=.74;
  const kitchen=new THREE.Mesh(new THREE.PlaneGeometry(26,13.3),new THREE.MeshBasicMaterial({map:textures.kitchen,toneMapped:false}));kitchen.position.set(0,6.10,-7.71);world.add(kitchen);
  const plaster=new THREE.MeshStandardMaterial({color:0xb8ad96,roughness:1});
  const wall=new THREE.Mesh(new THREE.BoxGeometry(30,18,.16),plaster);wall.position.set(0,5,-7.9);world.add(wall);
  world.background=new THREE.Color(0xb9ad95);world.fog=new THREE.Fog(0xb9ad95,17,34);
  return {jar,update(time){jar.rotation.z=jarAngle(time);}};
}
