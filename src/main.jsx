import React, { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { makeDirector, initialState, chapterPoints } from './scene/ScrollDirector';
import { useInteraction } from './scene/InteractionController';
import { Content } from './Content';
import { InquiryForm } from './InquiryForm';
import './styles.css';
import './content.css';
const Scene=lazy(()=>import('./scene/Scene'));
class SceneBoundary extends Component{
  state={failed:false};static getDerivedStateFromError(){return{failed:true};}
  componentDidCatch(){this.props.onFailure();}
  render(){return this.state.failed?null:this.props.children;}
}
const chapters=['Das Glas','Die Nähe','Der Faden','Der Ursprung','Die Blüte','Rotes Gold','In Ihrer Hand'];
const captions=[
  ['ROYAL SPICES · HERAT, AFGHANISTAN','Safran.','Aus Herat.','Kleine Fäden. Eine Welt für sich.'],
  ['02 / DIE NÄHE','Was zählt,','liegt innen.','Ganze Negin-Fäden. Tiefes Rot. Feine Struktur.'],
  ['03 / DER FADEN','Jeder Faden','zählt.','Die feinen Rillen. Die zarte, geweitete Spitze.'],
  ['04 / DER URSPRUNG','Verwurzelt','in Herat.','Aus Afghanistan. Für besondere Momente in Ihrer Küche.'],
  ['05 / CROCUS SATIVUS','Eine Blüte.','Drei Narben.','Aus ihren roten Narben wird Safran.'],
  ['06 / ROTES GOLD','Wenig genügt','für viel.','Farbe. Duft. Charakter.'],
  ['07 / IN IHRER HAND','Ein Glas.','Alles darin.','Negin · Grade 1 · Herat, Afghanistan']
];
function Brand(){return <a href="#start" className="brand" aria-label="Royal Spices, zum Anfang"><span>ROYAL</span><span>SPICES</span></a>}
function App(){
  const story=useRef(),surface=useRef(),state=useRef(initialState());
  const [chapter,setChapter]=useState(0),[ready,setReady]=useState(false),[failure,setFailure]=useState(false),[menu,setMenu]=useState(false),[active,setActive]=useState(true);
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[manualStill,setManualStill]=useState(false);
  const [topic,setTopic]=useState('glaeser'),[selection,setSelection]=useState('');
  const [interaction]=useState(()=>({active:false,yaw:0,pitch:0,vx:0,vy:0,lastRelease:0}));
  const still=reduced||manualStill||failure,canRotate=still||chapter<2||chapter===6;
  const loaded=useCallback(()=>setReady(true),[]),failed=useCallback(()=>setFailure(true),[]);
  useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)');const fn=()=>setReduced(q.matches);q.addEventListener('change',fn);return()=>q.removeEventListener('change',fn);},[]);
  useEffect(()=>makeDirector(state.current,story.current,still,setChapter),[still]);
  useEffect(()=>{const observer=new IntersectionObserver(([e])=>setActive(e.isIntersecting));observer.observe(story.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{if(!menu)return;const fn=e=>{if(e.key==='Escape')setMenu(false);};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[menu]);
  useEffect(()=>{if(ready||failure)return;const timer=setTimeout(failed,30000);return()=>clearTimeout(timer);},[ready,failure,failed]);
  useInteraction(surface,interaction,still);
  const gotoChapter=index=>{window.scrollTo({top:story.current.offsetTop+(story.current.offsetHeight-innerHeight)*chapterPoints[index],behavior:still?'instant':'smooth'});};
  const request=(next,choice='')=>{setTopic(next);setSelection(choice);};
  const toggleMotion=()=>{window.scrollTo({top:story.current.offsetTop,behavior:'instant'});setManualStill(v=>!v);};
  return <>
    <a className="skip" href="#angebot">Direkt zum Angebot</a>
    <header><Brand/><nav id="main-navigation" className={menu?'navigation open':'navigation'} aria-label="Hauptnavigation">
      <a href="#herkunft" onClick={()=>setMenu(false)}>Herkunft</a><a href="#angebot" onClick={()=>setMenu(false)}>Für Ihr Geschäft</a><a href="#catering" onClick={()=>setMenu(false)}>Catering</a><a className="enquiry" href="#anfrage" onClick={()=>setMenu(false)}>Anfrage <span aria-hidden="true">↗</span></a>
    </nav><button className="menu-toggle" onClick={()=>setMenu(!menu)} aria-expanded={menu} aria-controls="main-navigation">{menu?'Schließen':'Menü'}</button></header>
    <main id="start">
      <section ref={story} className={'story '+(still?'still ':'')+(failure?'fallback-mode':'')} aria-label="Safran entdecken">
        <div className="stage">
          <div className="light-field"/>
          <div aria-hidden={ready&&!failure} className={'poster '+(ready&&!failure?'concealed':'')}><img src="/assets/hero-poster-v2.webp" alt="Royal-Spices-Glas mit Korkverschluss, anthrazitfarbenem Siegel und Safran, 0,5-g-Visualisierung"/><span className="loading-line" hidden={ready||failure}/></div>
          {!failure&&<div className="scene" aria-hidden="true"><SceneBoundary onFailure={failed}><Suspense fallback={null}><Scene state={state} interaction={interaction} reduced={still} active={active} onReady={loaded} onFailure={failed}/></Suspense></SceneBoundary></div>}
          <div className="editorial">{captions.map(([eyebrow,line,em,note],i)=>{
            const visible=still?i===0:chapter===i;const Heading=i===0?'h1':'h2';
            return <div key={i} className={'chapter-copy '+(i===0?'opening ':'')+(visible?'active':'')} aria-hidden={!visible}><p className="eyebrow">{eyebrow}</p><Heading>{line}<br/><em>{em}</em></Heading><p className={i===0?'hero-note':'chapter-note'}>{note}</p>{i===6&&<a className="text-link" href="#angebot" tabIndex={visible?0:-1}>Zum Angebot <span aria-hidden="true">↗</span></a>}</div>;
          })}</div>
          <div ref={surface} aria-hidden={!canRotate} className={'interaction-surface '+(!canRotate?'inactive':'')} tabIndex={failure||!canRotate?-1:0} role="group" aria-label="3D-Glas drehen. Ziehen oder Pfeiltasten verwenden. Mit Pos1 zurücksetzen." data-testid="jar-interaction"/>
          <div className="product-caption"><span>HERAT NEGIN</span><span>GRADE 1</span></div>
          <div className="stage-bottom"><div className="chapter-index"><span className="chapter-number">0{(still?0:chapter)+1}</span><span className="index-line"/><span>{chapters[still?0:chapter]}</span></div><div className="gesture">{failure?'Glasvisualisierung':chapter===6||still?'Ziehen, um das Glas zu drehen':'Scrollen, um zu entdecken'} <span aria-hidden="true">{chapter===6||still?'↔':'↓'}</span></div></div>
          <div className="side-progress" aria-label="Kapitel">{chapters.map((c,i)=><button key={c} aria-label={'Kapitel '+(i+1)+': '+c} aria-current={chapter===i?'step':undefined} onClick={()=>gotoChapter(i)} className={chapter===i?'active':''}><span/></button>)}</div>
          <button className="motion-control" aria-pressed={still} onClick={toggleMotion} disabled={reduced||failure} title={reduced?'Reduzierte Bewegung ist in Ihren Systemeinstellungen aktiviert.':undefined}>{still?'Ruhige Ansicht':'Bewegung reduzieren'}</button>
          <div className="scroll-line"/>
        </div>
        <div className="sr-only"><h2>Die Welt des Safrans</h2><p>Die visuelle Reise zeigt das Royal-Spices-Glas, seine Safranfäden und eine einzelne Safrannarbe in Vergrößerung. Es folgen die Herkunft Herat, eine Crocus-sativus-Blüte mit drei roten Narben und die Rückkehr zum Glas. Die Produktvisualisierung orientiert sich an der fotografierten 0,5-g-Ausführung. Das aktuelle B2B-Angebot gilt für 1-g-Gläser.</p></div>
      </section>
      <Content request={request}/><InquiryForm topic={topic} setTopic={setTopic} selection={selection}/>
    </main>
    <footer><div className="footer-main"><Brand/><p>Die Welt von Royal Spices.</p><a href="#grosshandel">Großhandel ↗</a><a href="#catering">Catering ↗</a><a href="mailto:info@royalspices.de">info@royalspices.de</a></div><div className="footer-bottom"><span>© 2026 Royal Spices · Hamburg</span><a href="https://royalspices.de/impressum.html">Impressum</a><a href="https://royalspices.de/datenschutz.html">Datenschutz</a><a href="#start">Zurück zum Anfang ↑</a></div></footer>
  </>;
}
const rootElement=document.getElementById('root');
const appRoot=import.meta.hot?.data.root??createRoot(rootElement);
if(import.meta.hot)import.meta.hot.data.root=appRoot;
appRoot.render(<App/>);

