import * as THREE from './assets/three.module.js';
import { mouth, jarRotation } from './journey.js';

export function addSet(world) {
  const jar=new THREE.Group();jar.position.copy(mouth);world.add(jar);
  const profile=[[.53,-.07],[.55,-.025],[.55,.075],[.53,.17],[.83,.40],[.83,1.68],[.78,1.81],[0,1.81],[0,1.76],[.75,1.76],[.80,1.68],[.80,.40],[.50,.17],[.50,-.07],[.53,-.07]].map(p=>new THREE.Vector2(...p));
  const material=new THREE.MeshPhysicalMaterial({color:0xf2f0e5,metalness:0,roughness:.095,transmission:.96,thickness:.065,ior:1.46,transparent:true,opacity:.72,side:THREE.DoubleSide,envMapIntensity:1.1,depthWrite:false});
  const glass=new THREE.Mesh(new THREE.LatheGeometry(profile,80),material);glass.renderOrder=2;jar.add(glass);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.512,.022,8,80),new THREE.MeshPhysicalMaterial({color:0xe8e4d9,roughness:.1,metalness:.05,transparent:true,opacity:.43,depthWrite:false}));
  rim.rotation.x=Math.PI/2;rim.position.y=.045;jar.add(rim);
  // The only lettering belongs to the jar; it is a texture on the actual glass surface.
  const label=document.createElement('canvas');label.width=512;label.height=160;
  const context=label.getContext('2d');context.fillStyle='#352b20';context.textAlign='center';context.textBaseline='middle';context.font='38px Georgia';context.fillText('SAFFRON',256,82);
  const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;
  const inscription=new THREE.Mesh(new THREE.PlaneGeometry(.68,.2125),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  inscription.position.set(0,1.03,.835);inscription.renderOrder=3;jar.add(inscription);

  const marble=new THREE.MeshStandardMaterial({color:0xf5f0e5,metalness:.05,roughness:.27,envMapIntensity:.5});
  marble.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 stonePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstonePosition = position;');
    shader.fragmentShader='varying vec3 stonePosition;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float x=stonePosition.x;float y=stonePosition.y;
      float fold=sin(x*.71+y*.34)*.55+sin(x*1.71-y*.48)*.18+sin(x*4.3+y*1.6)*.05;
      float v=abs(sin(y*.67+x*.28+fold));
      float vein=1.-smoothstep(.007,.04,v);
      float halo=1.-smoothstep(.02,.15,v);
      diffuseColor.rgb*=1.-vein*.19-halo*.065;`);
  };
  const table=new THREE.Mesh(new THREE.PlaneGeometry(22,20),marble);table.rotation.x=-Math.PI/2;table.position.set(0,-.542,-2);table.receiveShadow=true;world.add(table);
  const apron=new THREE.Mesh(new THREE.BoxGeometry(22,.18,20),marble.clone());apron.position.set(0,-.64,-2);world.add(apron);
  const plaster=new THREE.MeshStandardMaterial({color:0xe9dfce,roughness:1});
  const stone=new THREE.MeshStandardMaterial({color:0xc5b79f,roughness:.86});
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(36,24),plaster);wall.position.set(0,5,-8);world.add(wall);
  const counter=new THREE.Mesh(new THREE.BoxGeometry(16,.15,1.2),stone);counter.position.set(1,-.05,-6);world.add(counter);
  const cabinets=new THREE.Mesh(new THREE.BoxGeometry(16,2.9,.9),new THREE.MeshStandardMaterial({color:0x998d7c,roughness:.9}));cabinets.position.set(1,-1.57,-6.2);world.add(cabinets);
  const window=new THREE.Group();window.position.set(-6.5,4,-7.87);world.add(window);
  const pane=new THREE.Mesh(new THREE.PlaneGeometry(5.7,7),new THREE.MeshBasicMaterial({color:0xfff5dc}));window.add(pane);
  const frameMaterial=new THREE.MeshStandardMaterial({color:0xb9ac94,roughness:.74});
  for(const [x,y,w,h] of [[-2.9,0,.12,7.2],[2.9,0,.12,7.2],[0,-3.55,5.9,.12],[0,3.55,5.9,.12],[0,0,.07,7],[0,-.1,5.7,.065]]){
    const frame=new THREE.Mesh(new THREE.BoxGeometry(w,h,.12),frameMaterial);frame.position.set(x,y,.03);window.add(frame);
  }
  const backdrop=new THREE.Color(0xe9dfce);world.background=backdrop;world.fog=new THREE.Fog(0xe9dfce,16,38);
  return {jar,update(time){jar.quaternion.copy(jarRotation(time));}};
}
