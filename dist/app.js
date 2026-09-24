import { createIcons, ArrowUpRight, ArrowDown, ArrowUp, ArrowRight, Menu, X, Pause, Play } from './assets/icons.js';

const iconSet = { ArrowUpRight, ArrowDown, ArrowUp, ArrowRight, Menu, X, Pause, Play };
const paintIcons = () => createIcons({ icons: iconSet });
document.documentElement.classList.add('js-ready');
const qaMode = location.hostname === '127.0.0.1' && new URLSearchParams(location.search).has('qa');
if (qaMode) {
  const metrics = { lcpMs: null, cls: 0, maxInteractionMs: 0 };
  const record = () => {document.documentElement.dataset.metrics = JSON.stringify(metrics);};
  for (const type of ['largest-contentful-paint','layout-shift','event']) {
    try {
      new PerformanceObserver(list => {
        for(const entry of list.getEntries()) {
          if(type === 'largest-contentful-paint') metrics.lcpMs = Math.round(entry.startTime);
          if(type === 'layout-shift' && !entry.hadRecentInput) metrics.cls += entry.value;
          if(type === 'event') metrics.maxInteractionMs = Math.max(metrics.maxInteractionMs, entry.duration);
        }
        record();
      }).observe({type, buffered:true, ...(type==='event'?{durationThreshold:16}:{})});
    } catch { /* Unsupported metrics remain unset. */ }
  }
}
paintIcons();

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');
function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  menuButton.innerHTML = `<i data-lucide="${open ? 'x' : 'menu'}" aria-hidden="true"></i>`;
  mobileNav.hidden = !open;
  paintIcons();
}
menuButton.addEventListener('click', () => setMenu(mobileNav.hidden));
mobileNav.addEventListener('click', event => { if(event.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', event => { if(event.key === 'Escape' && !mobileNav.hidden) {setMenu(false); menuButton.focus();} });
matchMedia('(min-width:801px)').addEventListener('change', event => {if(event.matches) setMenu(false);});

const form = document.querySelector('#enquiry-form');
const topic = document.querySelector('#topic');
const messageLabel = document.querySelector('#message-label');
function updateTopic() {
  messageLabel.innerHTML = topic.value === 'catering' ? 'Termin, Ort, Gästezahl und Anlass <span>*</span>' : 'Menge, Lieferort und Ihre Wünsche <span>*</span>';
}
topic.addEventListener('change', updateTopic);
document.querySelectorAll('[data-topic]').forEach(link => link.addEventListener('click', () => {topic.value = link.dataset.topic; updateTopic();}));
let preparedText = '';
form.addEventListener('submit', event => {
  event.preventDefault();
  if(!form.reportValidity()) return;
  const data = new FormData(form);
  const name = String(data.get('name')).trim();
  const message = String(data.get('message')).trim();
  if (!name || !message) {
    const empty = !name ? form.elements.name : form.elements.message;
    empty.setCustomValidity('Bitte füllen Sie dieses Feld aus.');
    empty.reportValidity();
    empty.addEventListener('input', () => empty.setCustomValidity(''), {once:true});
    return;
  }
  preparedText = `Guten Tag Royal Spices,\n\n${message}\n\nBereich: ${topic.selectedOptions[0].text}\nName: ${name}\nUnternehmen: ${String(data.get('company')).trim() || '-'}\nE-Mail: ${data.get('email')}\n${data.get('evidence') ? '\nBitte senden Sie mir Herkunfts- und Qualitätsnachweise.\n' : ''}\nFreundliche Grüße\n${name}`;
  const mailto = `mailto:info@royalspices.de?subject=${encodeURIComponent('Anfrage: ' + topic.selectedOptions[0].text)}&body=${encodeURIComponent(preparedText)}`;
  document.querySelector('#mail-retry').href = mailto;
  document.querySelector('#form-status').hidden = false;
  document.querySelector('#copy-fallback').value = preparedText;
  if(!qaMode) window.location.href = mailto;
});
document.querySelector('#copy-request').addEventListener('click', async event => {
  try {await navigator.clipboard.writeText(preparedText);event.currentTarget.textContent = 'Anfragetext kopiert';}
  catch {const area = document.querySelector('#copy-fallback'); area.hidden = false; area.focus(); area.select();}
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const story = document.querySelector('#scene-story');
const notes = [
  ['01','Der ganze Faden.','Charakter beginnt im Detail. Unser Negin-Safran besteht aus ganzen, tiefroten Safranfäden.'],
  ['02','Ein besonderer Ursprung.','Unser Safran stammt aus Herat in Afghanistan. Herkunftsunterlagen erhalten Sie auf Anfrage.'],
  ['03','Raum für Geschmack.','Für Ihre Getränke, Ihre Küche und Ihr Sortiment. Im 1-g-Glas oder als lose Ware für den Großhandel.']
];
let scene = null;
let paused = reducedMotion.matches;
let currentNote = -1;
function updateScroll() {
  const rect = story.getBoundingClientRect();
  const progress = reducedMotion.matches && paused ? 1 : Math.max(0, Math.min(1, -rect.top / Math.max(1, story.offsetHeight-innerHeight)));
  if(scene && !paused) scene.setProgress(progress);
  if(!scene) updateNotes(0);
}
function updateNotes(progress) {
  const index = progress < .3 ? 0 : progress < .8 ? 1 : 2;
  story.style.setProperty('--journey-progress',progress);
  story.dataset.phase = progress < .12 ? 'Glas neigen' : progress < .30 ? 'Der erste Fall' : progress < .43 ? 'An der Linse' : progress < .67 ? 'Mit den Fäden' : progress < .86 ? 'In der Schale' : 'Die volle Essenz';
  document.querySelector('.journey-phase').textContent = story.dataset.phase;
  document.querySelector('.journey-percent').textContent = Math.round(progress*100)+' %';
  if(index !== currentNote) {
    currentNote = index;
    const note = document.querySelector('#scene-note');
    note.querySelector('.note-number').textContent = notes[index][0];
    note.querySelector('h3').textContent = notes[index][1];
    note.querySelector('p').textContent = notes[index][2];
    document.querySelectorAll('.scene-progress span').forEach((el,i)=>el.classList.toggle('active',i===index));
  }
}
const scheduleScroll = updateScroll;
window.addEventListener('scroll', scheduleScroll, {passive:true});
window.addEventListener('resize',scheduleScroll,{passive:true});
const toggle = document.querySelector('.motion-toggle');
function updateMotion() {
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.setAttribute('aria-label', paused ? 'Animation fortsetzen' : 'Animation pausieren');
  toggle.title = paused ? 'Animation fortsetzen' : 'Animation pausieren';
  toggle.innerHTML = `<i data-lucide="${paused ? 'play' : 'pause'}" aria-hidden="true"></i>`;
  paintIcons();
  scene?.setPaused(paused);
  scheduleScroll();
}
toggle.addEventListener('click',()=>{paused=!paused;updateMotion();});
reducedMotion.addEventListener('change',()=>{
  paused=reducedMotion.matches;
  if(paused){stopPlayback();scene?.setPaused(true,1);updateNotes(1);}
  else if(!scene){story.classList.remove('scene-failed');loader.observe(story);}
  updateMotion();
});
updateMotion();
updateScroll();
function sceneFailure(){
  story.classList.add('scene-failed');story.classList.remove('scene-enabled');
  document.querySelector('#scene-stage').dataset.ready='false';
  toggle.hidden=true;document.querySelector('.journey-controls').hidden=true;
  document.querySelector('.scene-caption').textContent='Safran in seiner ganzen Schönheit.';
}
const loader = new IntersectionObserver(async entries => {
  if(!entries.some(e=>e.isIntersecting)) return;
  loader.disconnect();
  if(reducedMotion.matches||navigator.connection?.saveData){
    sceneFailure();updateNotes(1);return;
  }
  try {
    const { createSaffronScene } = await import('./scene.js');
    scene = await createSaffronScene(document.querySelector('#scene-stage'), { paused, onProgress:updateNotes,onFailure:sceneFailure });
    story.classList.add('scene-enabled');
    updateScroll();
  } catch {
    sceneFailure();
  }
}, {rootMargin:'350px'});
loader.observe(story);

const playButton=document.querySelector('.journey-play');
let playback=0,playStart=0,playFrom=0;
function stopPlayback(){cancelAnimationFrame(playback);playback=0;playButton.textContent='Abspielen';playButton.setAttribute('aria-pressed','false');}
function playFrame(now){
  if(!playback||document.hidden||paused){stopPlayback();return;}
  const progress=Math.min(1,playFrom+(now-playStart)/32000);
  const start=window.scrollY+story.getBoundingClientRect().top;
  window.scrollTo({top:start+progress*(story.offsetHeight-innerHeight),behavior:'instant'});
  if(progress>=1){stopPlayback();return;}playback=requestAnimationFrame(playFrame);
}
playButton.addEventListener('click',()=>{
  if(playback){stopPlayback();return;}
  if(!scene)return;
  paused=false;updateMotion();
  playFrom=Math.max(0,Math.min(1,-story.getBoundingClientRect().top/(story.offsetHeight-innerHeight)));
  if(playFrom>.98)playFrom=0;
  playStart=performance.now();playback=requestAnimationFrame(playFrame);
  playButton.textContent='Anhalten';playButton.setAttribute('aria-pressed','true');
});
for(const event of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(event,e=>{
  if(event==='pointerdown'&&e.target.closest('.journey-play'))return;
  if(playback)stopPlayback();
},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlayback();});
