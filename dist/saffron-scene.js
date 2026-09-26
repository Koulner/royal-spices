import * as THREE from './assets/three.module.js';
import {RoomEnvironment} from './assets/RoomEnvironment.js';
import {addBowl} from './bowl.js';
import {addSet} from './set-design.js';
import {createJourney,journeyTime,phase} from './journey.js';
import {createFibers} from './fibers.js';

async function loadMotion(){
  const signal=AbortSignal.timeout(15000);
  const [a,b]=await Promise.all([fetch('./assets/saffron-motion.json',{signal}),fetch('./assets/saffron-motion.bin.gz',{signal})]);
  if(!a.ok||!b.ok)throw new Error('Motion unavailable');
  const meta=await a.json(),data=new Int16Array(await new Response(b.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  const stride=meta.count*meta.nodes*3;
  if(data.length!==meta.frames*stride||meta.stats.landed!==meta.count)throw new Error('Invalid motion');
  for(let i=stride;i<data.length;i++)data[i]+=data[i-stride];
  return {meta,data};
}
export async function createSaffronScene(host,{paused=false,onProgress=()=>{},onFailure=()=>{}}={}){
  const loader=new THREE.TextureLoader();
  let timeout;
  const assets=Promise.all([loadMotion(),loader.loadAsync('./assets/brass-engraving.webp'),loader.loadAsync('./assets/walnut.webp'),loader.loadAsync('./assets/kitchen.webp'),document.fonts.ready]);
  const deadline=new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Scene load timed out')),15000);});
  let loaded;try{loaded=await Promise.race([assets,deadline]);}finally{clearTimeout(timeout);}
  const [{meta,data},metal,wood,kitchen]=loaded;
  const compact=matchMedia('(max-width:800px)').matches;
  const qa=location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).has('qa');
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:qa});
  renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.4:1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.93;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.info.autoReset=false;
  renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.dataset.testid='saffron-canvas';host.appendChild(renderer.domElement);
  const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.009,65),group=new THREE.Group();world.add(group);
  const environmentScene=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(environmentScene,.04);
  world.environment=environment.texture;world.environmentIntensity=.55;environmentScene.dispose();pmrem.dispose();
  world.add(new THREE.HemisphereLight(0xfff2d7,0x524d3b,1.05));
  const key=new THREE.DirectionalLight(0xffedcd,2.8);key.position.set(-4,8,5);key.castShadow=true;key.shadow.blurSamples=8;
  key.shadow.mapSize.set(compact?2048:4096,compact?2048:4096);Object.assign(key.shadow.camera,{left:-2.7,right:2.7,top:7,bottom:-2.7,near:.1,far:22});key.shadow.bias=-.000025;key.shadow.normalBias=.0006;key.shadow.radius=2;world.add(key);
  const fill=new THREE.DirectionalLight(0xd8e4f4,1.15);fill.position.set(4,6,3);world.add(fill);
  const edge=new THREE.DirectionalLight(0xffeac4,2.1);edge.position.set(-2,7,-4);world.add(edge);
  addBowl(group,metal,renderer);const set=addSet(world,{wood,kitchen}),journey=createJourney(meta,data),fibers=createFibers(meta,compact);group.add(fibers.mesh);
  let composer=null,depthOfField=null;
  if(!compact){
    try{
      const [{EffectComposer},{RenderPass},{BokehPass},{OutputPass}]=await Promise.all([
        import('./assets/addons/postprocessing/EffectComposer.js'),import('./assets/addons/postprocessing/RenderPass.js'),import('./assets/addons/postprocessing/BokehPass.js'),import('./assets/addons/postprocessing/OutputPass.js')]);
      composer=new EffectComposer(renderer);composer.setPixelRatio(renderer.getPixelRatio());composer.addPass(new RenderPass(world,camera));
      depthOfField=new BokehPass(world,camera,{focus:3,aperture:.0012,maxblur:.003});composer.addPass(depthOfField);composer.addPass(new OutputPass());
    }catch{composer=null;}
  }
  let target=paused?1:0,current=target,last=-1,raf=0,visible=true,destroyed=false;
  const aim=new THREE.Vector3();
  function draw(){
    raf=0;if(destroyed||!visible||document.hidden)return;
    const frameStart=performance.now();
    if(!paused)current=target;
    const time=journeyTime(current),pose=journey.cameraPose(current,camera.aspect,camera.position,aim);
    camera.up.set(Math.sin(pose.roll),Math.cos(pose.roll),0);camera.lookAt(aim);
    if(last!==current){fibers.setDetail(current>.265&&current<.55);journey.sample(time,fibers.points);fibers.update();set.update(time);last=current;}
    host.parentElement.style.setProperty('--immersion',String(phase(.03,.12,current)*(1-phase(.97,1,current))));
    const closeShadow=phase(.68,.9,current);
    key.shadow.camera.top=THREE.MathUtils.lerp(7,2.45,closeShadow);key.shadow.camera.bottom=THREE.MathUtils.lerp(-2.7,-2.45,closeShadow);key.shadow.camera.updateProjectionMatrix();
    renderer.info.reset();renderer.shadowMap.needsUpdate=true;
    const start=performance.now();
    if(composer&&current>.285&&current<.55){
      const macro=phase(.30,.34,current)*(1-phase(.45,.51,current));
      depthOfField.uniforms.focus.value=THREE.MathUtils.lerp(camera.position.distanceTo(aim),.42,macro);
      depthOfField.uniforms.aperture.value=.0045*macro;depthOfField.uniforms.maxblur.value=.011;composer.render(0);
    }else renderer.render(world,camera);
    onProgress(current);
    if(qa){
      const gl=renderer.getContext(),pixel=new Uint8Array(4);gl.finish();const drawMs=performance.now()-start,frameMs=performance.now()-frameStart;let signature=0;
      for(let y=2;y<9;y++)for(let x=2;x<9;x++){gl.readPixels(Math.floor(renderer.domElement.width*x/10),Math.floor(renderer.domElement.height*y/10),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);signature+=pixel[0]+pixel[1]*3+pixel[2]*7;}
      let stateHash=0;for(let i=0;i<fibers.points.length;i+=31)stateHash=(Math.imul(stateHash,31)+Math.round(fibers.points[i]*4000))|0;
      renderer.domElement.dataset.pixels=JSON.stringify({signature,stateHash,progress:+current.toFixed(5),simTime:time,camera:camera.position.toArray(),count:meta.count,landed:meta.stats.landed,wallCorrections:0,drawMs:+drawMs.toFixed(2),frameMs:+frameMs.toFixed(2),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,depthOfField:!!composer&&current>.285&&current<.55});
    }
  }
  function requestDraw(){if(!raf&&!destroyed)raf=requestAnimationFrame(draw);}
  function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.fov=compact?38:34;camera.updateProjectionMatrix();composer?.setSize(host.clientWidth,host.clientHeight);requestDraw();}
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestDraw();}).observe(host);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestDraw();});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();destroyed=true;cancelAnimationFrame(raf);host.dataset.ready='false';renderer.domElement.hidden=true;onFailure();});
  resize();host.dataset.ready='true';
  return {setProgress(value){target=Math.max(0,Math.min(1,value));requestDraw();},setPaused(value,pose){paused=value;if(pose!==undefined)target=current=pose;requestDraw();}};
}
