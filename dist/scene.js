import * as THREE from './assets/three.module.js';
import { mergeGeometries } from './assets/BufferGeometryUtils.js';
import { RoomEnvironment } from './assets/RoomEnvironment.js';

const smooth=(a,b,value)=>{const t=THREE.MathUtils.clamp((value-a)/(b-a),0,1);return t*t*(3-2*t);};

async function loadMotion() {
  const [metaResponse,dataResponse]=await Promise.all([fetch('./assets/saffron-motion.json'),fetch('./assets/saffron-motion.bin.gz')]);
  if(!metaResponse.ok||!dataResponse.ok)throw new Error('Motion assets unavailable');
  const meta=await metaResponse.json();
  const bytes=await new Response(dataResponse.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const data=new Int16Array(bytes);
  if(data.length!==meta.frames*meta.count*7)throw new Error('Invalid motion asset');
  if(meta.encoding==='delta-int16'){
    const stride=meta.count*7;
    for(let i=stride;i<data.length;i++)data[i]+=data[i-stride];
  }
  return {meta,data};
}

export async function createSaffronScene(host,{paused=false,onProgress=()=>{}}={}) {
  const [{meta,data},metal]=await Promise.all([loadMotion(),new THREE.TextureLoader().loadAsync('./assets/brass-engraving.webp')]);
  const compact=matchMedia('(max-width:800px)').matches;
  const qa=location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).has('qa');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:qa});
  renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.35:1.7));
  renderer.setClearColor(0xf7f8f5,1);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
  renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.dataset.testid='saffron-canvas';host.appendChild(renderer.domElement);
  const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,60),group=new THREE.Group();
  world.add(group);
  const environmentScene=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(environmentScene,.025);
  world.environment=environment.texture;world.environmentIntensity=.6;environmentScene.dispose();pmrem.dispose();
  world.add(new THREE.HemisphereLight(0xfff6e7,0x676655,.55));
  const key=new THREE.DirectionalLight(0xfff0d8,3.3);key.position.set(-3,6,4);key.castShadow=true;
  key.shadow.mapSize.set(compact?1024:2048,compact?1024:2048);
  Object.assign(key.shadow.camera,{left:-2.4,right:2.4,top:2.4,bottom:-2.4,near:.1,far:16});
  key.shadow.bias=-.00015;key.shadow.normalBias=.004;key.shadow.radius=12;key.shadow.blurSamples=16;world.add(key);
  const fill=new THREE.DirectionalLight(0xe5edff,.85);fill.position.set(4,3,-2);world.add(fill);

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

  // The cache contains fixed-step Cannon-es collision trajectories, not a flat landing plane.
  const batches=[],particleMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92,metalness:0,envMapIntensity:.25});
  for(let type=0;type<meta.templates.length;type++){
    const geometries=meta.templates[type].map((points,strand)=>{
      const curve=new THREE.CatmullRomCurve3(points.map((p,i)=>new THREE.Vector3(
        p[0]*(.84+((type+strand*3)%7)*.038),
        p[1]+Math.sin(i*1.7+strand*2.1+type)*.006,
        p[2]+Math.sin(i*1.3+strand*1.7)*.007
      )));
      const tube=new THREE.TubeGeometry(curve,compact?9:14,.0034+strand*.00025,compact?3:4);
      const positions=tube.attributes.position,uvs=tube.attributes.uv;
      for(let i=0;i<positions.count;i++){
        const t=uvs.getX(i),center=curve.getPointAt(t),flare=.62+smooth(.7,1,t)*.95;
        positions.setXYZ(i,center.x+(positions.getX(i)-center.x)*flare,center.y+(positions.getY(i)-center.y)*flare,center.z+(positions.getZ(i)-center.z)*flare);
      }
      tube.computeVertexNormals();return tube;
    });
    const indices=Array.from({length:meta.count},(_,i)=>i).filter(i=>i%meta.templates.length===type);
    const mesh=new THREE.InstancedMesh(mergeGeometries(geometries),particleMaterial,indices.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;
    indices.forEach((id,i)=>mesh.setColorAt(i,new THREE.Color([0x75100a,0x98170c,0xa51e11,0x650b0a,0xbf3117][id%5])));
    group.add(mesh);geometries.forEach(g=>g.dispose());batches.push({mesh,indices});
  }
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.13}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.61;floor.receiveShadow=true;world.add(floor);
  const position=new THREE.Vector3(),qaPosition=new THREE.Vector3(),rotation=new THREE.Quaternion(),nextRotation=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1),matrix=new THREE.Matrix4();

  function updateParticles(progress){
    const simTime=progress*meta.duration,frame=Math.min(meta.frames-2,Math.floor(simTime*meta.fps));
    const mix=Math.min(1,simTime*meta.fps-frame);
    for(const {mesh,indices} of batches){
      for(let instance=0;instance<indices.length;instance++){
        const id=indices[instance],a=(frame*meta.count+id)*7,b=a+meta.count*7;
        if(simTime<meta.births[id]){
          position.set(0,40,0);rotation.identity();
        } else {
          position.set(
            THREE.MathUtils.lerp(data[a],data[b],mix)/meta.positionScale,
            THREE.MathUtils.lerp(data[a+1],data[b+1],mix)/meta.positionScale,
            THREE.MathUtils.lerp(data[a+2],data[b+2],mix)/meta.positionScale
          );
          rotation.set(data[a+3],data[a+4],data[a+5],data[a+6]).normalize();
          nextRotation.set(data[b+3],data[b+4],data[b+5],data[b+6]).normalize();rotation.slerp(nextRotation,mix);
        }
        matrix.compose(position,rotation,scale);mesh.setMatrixAt(instance,matrix);
      }
      mesh.instanceMatrix.needsUpdate=true;
    }
  }

  let target=paused?1:0,current=target,raf=0,visible=true,destroyed=false,lastParticleProgress=-1;
  function resize(){
    renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();
    group.scale.setScalar(host.clientWidth<560?.94:host.clientWidth<1000?1:1.14);requestDraw();
  }
  function draw(){
    raf=0;if(destroyed||!visible||document.hidden)return;
    if(!paused)current=target;
    const narrow=host.clientWidth<560,mobile=host.clientWidth<800;
    const orbit=smooth(.61,.97,current),descent=smooth(0,.58,current);
    const endDistance=narrow?13.22:mobile?9.58:7.65;
    const overheadDistance=THREE.MathUtils.lerp(narrow?12.8:12.5,narrow?11.8:8.7,descent);
    const distance=THREE.MathUtils.lerp(overheadDistance,endDistance,orbit);
    const theta=THREE.MathUtils.lerp(.43,1.03,orbit);
    const aimY=THREE.MathUtils.lerp(-.12,mobile?-.6:-.05,orbit);
    camera.position.set(Math.sin(orbit*Math.PI)*.4,aimY+Math.cos(theta)*distance,Math.sin(theta)*distance);
    camera.up.set(0,Math.sin(theta),-Math.cos(theta));camera.lookAt(0,aimY,0);
    group.rotation.y=smooth(.75,1,current)*.22;
    if(Math.abs(lastParticleProgress-current)>.00001){updateParticles(current);lastParticleProgress=current;}
    renderer.render(world,camera);onProgress(current);
    if(qa){
      const gl=renderer.getContext(),pixel=new Uint8Array(4);let signature=0,nonBackground=0;
      for(let y=3;y<8;y++)for(let x=3;x<8;x++){
        gl.readPixels(Math.floor(renderer.domElement.width*x/10),Math.floor(renderer.domElement.height*y/10),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        signature+=pixel[0]+pixel[1]*3+pixel[2]*7;
        if(Math.abs(pixel[0]-247)+Math.abs(pixel[1]-248)+Math.abs(pixel[2]-245)>30)nonBackground++;
      }
      qaPosition.set(0,7,0).applyMatrix4(group.matrixWorld).project(camera);
      renderer.domElement.dataset.pixels=JSON.stringify({signature,nonBackground,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,progress:Number(current.toFixed(5)),target:Number(target.toFixed(5)),camera:camera.position.toArray().map(v=>Number(v.toFixed(2))),emitterNdcY:Number(qaPosition.y.toFixed(2)),scrollSynchronous:true,strands:meta.stats.visibleStrands});
    }
  }
  function requestDraw(){if(!raf&&!destroyed)raf=requestAnimationFrame(draw);}
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestDraw();}).observe(host);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestDraw();});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();host.dataset.ready='false';renderer.domElement.hidden=true;destroyed=true;cancelAnimationFrame(raf);});
  resize();host.dataset.ready='true';
  return {setProgress(value){target=THREE.MathUtils.clamp(value,0,1);requestDraw();},setPaused(value){paused=value;requestDraw();}};
}
