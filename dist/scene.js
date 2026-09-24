import * as THREE from './assets/three.module.js';
import { mergeGeometries } from './assets/BufferGeometryUtils.js';
import { RoomEnvironment } from './assets/RoomEnvironment.js';
import { createJourney, journeyTime, phase } from './journey.js';
import { addSet } from './set-design.js';

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

export async function createSaffronScene(host,{paused=false,onProgress=()=>{},onFailure=()=>{}}={}) {
  const [{meta,data},metal]=await Promise.all([loadMotion(),new THREE.TextureLoader().loadAsync('./assets/brass-engraving.webp')]);
  const compact=matchMedia('(max-width:800px)').matches;
  const qa=location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).has('qa');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:qa});
  renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1:1.35));
  renderer.setClearColor(0xe9dfce,1);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.info.autoReset=false;
  renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.dataset.testid='saffron-canvas';host.appendChild(renderer.domElement);
  const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.025,60),group=new THREE.Group();
  world.add(group);
  const environmentScene=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(environmentScene,.025);
  world.environment=environment.texture;world.environmentIntensity=.6;environmentScene.dispose();pmrem.dispose();
  world.add(new THREE.HemisphereLight(0xfff6e7,0x676655,.55));
  const key=new THREE.DirectionalLight(0xfff0d8,3.3);key.position.set(-3,6,4);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-2.4,right:2.4,top:2.4,bottom:-2.4,near:.1,far:16});
  key.shadow.bias=-.00015;key.shadow.normalBias=.004;key.shadow.radius=12;key.shadow.blurSamples=16;world.add(key);
  const fill=new THREE.DirectionalLight(0xe5edff,.85);fill.position.set(4,3,-2);world.add(fill);

  let composer=null,depthOfField=null;
  if(true){
    try{
      const [{EffectComposer},{RenderPass},{BokehPass},{OutputPass}]=await Promise.all([
        import('./assets/addons/postprocessing/EffectComposer.js'),
        import('./assets/addons/postprocessing/RenderPass.js'),
        import('./assets/addons/postprocessing/BokehPass.js'),
        import('./assets/addons/postprocessing/OutputPass.js')
      ]);
      composer=new EffectComposer(renderer);composer.setPixelRatio(Math.min(renderer.getPixelRatio(),compact?.8:1));
      composer.addPass(new RenderPass(world,camera));
      depthOfField=new BokehPass(world,camera,{focus:3,aperture:0,maxblur:.012});
      // Disk sampling prevents the discrete ghost rings of a single-radius blur kernel.
      const shader=depthOfField.materialBokeh;
      shader.fragmentShader=shader.fragmentShader.replace(/vec4 col = vec4\( 0.0 \);[\s\S]*gl_FragColor = col \/ 41.0;/,
        `vec4 col = texture2D(tColor,vUv)*2.;
        for(int i=0;i<24;i++){
          float angle=float(i)*2.39996323;
          float radius=sqrt((float(i)+.5)/24.);
          vec2 offset=vec2(cos(angle),sin(angle))*aspectcorrect*dofblur*radius;
          col+=texture2D(tColor,vUv+offset);
        }
        gl_FragColor=col/26.;`);
      composer.addPass(depthOfField);composer.addPass(new OutputPass());
    }catch{composer=null;depthOfField=null;}
  }

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
  const journey=createJourney(meta,data),set=addSet(world);
  const batches=[],particleMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92,metalness:0,envMapIntensity:.25});
  for(let type=0;type<meta.templates.length;type++){
    const geometries=meta.templates[type].map((points,strand)=>{
      const curve=new THREE.CatmullRomCurve3(points.map((p,i)=>new THREE.Vector3(
        p[0]*(.84+((type+strand*3)%7)*.038)*.4,
        p[1]*.45+Math.sin(i*1.7+strand*2.1+type)*.005,
        p[2]*.45+Math.sin(i*1.3+strand*1.7)*.006
      )));
      const tube=new THREE.TubeGeometry(curve,compact?7:11,.0032+(strand%5)*.00025,compact?3:4);
      const positions=tube.attributes.position,uvs=tube.attributes.uv;
      for(let i=0;i<positions.count;i++){
        const t=uvs.getX(i),center=curve.getPointAt(t),flare=.62+smooth(.7,1,t)*.95;
        positions.setXYZ(i,center.x+(positions.getX(i)-center.x)*flare,center.y+(positions.getY(i)-center.y)*flare,center.z+(positions.getZ(i)-center.z)*flare);
      }
      tube.computeVertexNormals();return tube;
    });
    const indices=Array.from({length:meta.count},(_,i)=>i).filter(i=>i%meta.templates.length===type);
    const mesh=new THREE.InstancedMesh(mergeGeometries(geometries),particleMaterial,indices.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;
    indices.forEach((id,i)=>mesh.setColorAt(i,new THREE.Color([0x75100a,0x98170c,0xa51e11,0x650b0a,0xbf3117][id%5])));
    group.add(mesh);geometries.forEach(g=>g.dispose());batches.push({mesh,indices});
  }
  const position=new THREE.Vector3(),qaPosition=new THREE.Vector3(),rotation=new THREE.Quaternion(),nextRotation=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1),matrix=new THREE.Matrix4();

  function updateParticles(progress){
    const time=journeyTime(progress);set.update(time);
    for(const {mesh,indices} of batches){
      for(let instance=0;instance<indices.length;instance++){
        journey.pose(indices[instance],time,position,rotation);
        const contact=journey.impact.get(indices[instance]);
        const compression=contact?phase(contact.at-.06,contact.at,time)*(1-phase(contact.off,contact.off+.12,time)):0;
        scale.set(1,1,1-.12*compression);
        matrix.compose(position,rotation,scale);mesh.setMatrixAt(instance,matrix);
      }
      mesh.instanceMatrix.needsUpdate=true;
    }
  }

  let target=paused?1:0,current=target,raf=0,visible=true,destroyed=false,lastParticleProgress=-1;
  function resize(){
    renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;
    camera.fov=THREE.MathUtils.lerp(50,70,THREE.MathUtils.clamp((1.15-camera.aspect)/.65,0,1));camera.updateProjectionMatrix();
    composer?.setSize(host.clientWidth,host.clientHeight);
    requestDraw();
  }
  function draw(){
    raf=0;if(destroyed||!visible||document.hidden)return;
    if(!paused)current=target;
    const immersion=phase(.08,.24,current)*(1-phase(.87,.99,current));
    const aim=new THREE.Vector3();
    journey.cameraPose(current,camera.aspect,camera.position,aim);
    camera.up.set(0,1,0);camera.lookAt(aim);
    const distance=camera.position.distanceTo(aim);
    if(Math.abs(lastParticleProgress-current)>.00001){updateParticles(current);lastParticleProgress=current;}
    host.parentElement.style.setProperty('--immersion',immersion.toFixed(4));
    renderer.info.reset();renderer.shadowMap.needsUpdate=true;
    if(composer){
      const contact=phase(.24,.31,current)*(1-phase(.43,.54,current));
      depthOfField.uniforms.focus.value=THREE.MathUtils.lerp(Math.max(.7,distance),1.25,contact);
      depthOfField.uniforms.aperture.value=THREE.MathUtils.lerp(.0025,.0006,phase(.75,.98,current))+.034*contact;
      depthOfField.uniforms.maxblur.value=.016;
      composer.render(0);
    }else renderer.render(world,camera);
    onProgress(current);
    if(qa){
      const gl=renderer.getContext(),pixel=new Uint8Array(4);let signature=0,nonBackground=0;
      for(let y=3;y<8;y++)for(let x=3;x<8;x++){
        gl.readPixels(Math.floor(renderer.domElement.width*x/10),Math.floor(renderer.domElement.height*y/10),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        signature+=pixel[0]+pixel[1]*3+pixel[2]*7;
        if(Math.abs(pixel[0]-247)+Math.abs(pixel[1]-248)+Math.abs(pixel[2]-245)>30)nonBackground++;
      }
      qaPosition.set(0,7,0).applyMatrix4(group.matrixWorld).project(camera);
      renderer.domElement.dataset.pixels=JSON.stringify({signature,nonBackground,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,progress:Number(current.toFixed(5)),target:Number(target.toFixed(5)),camera:camera.position.toArray().map(v=>Number(v.toFixed(2))),emitterNdcY:Number(qaPosition.y.toFixed(2)),scrollSynchronous:true,simTime:journeyTime(current),lensContact:current>=.30&&current<=.43,strands:meta.stats.visibleStrands,immersion:Number(immersion.toFixed(3)),depthOfField:!!composer});
    }
  }
  function requestDraw(){if(!raf&&!destroyed)raf=requestAnimationFrame(draw);}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestDraw();}).observe(host);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestDraw();});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();host.dataset.ready='false';renderer.domElement.hidden=true;destroyed=true;cancelAnimationFrame(raf);onFailure();});
  resize();host.dataset.ready='true';
  return {setProgress(value){target=THREE.MathUtils.clamp(value,0,1);requestDraw();},setPaused(value,pose){paused=value;if(pose!==undefined)current=target=pose;requestDraw();}};
}
