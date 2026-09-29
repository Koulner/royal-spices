import { useEffect } from 'react';

export function useInteraction(surface, interaction, reduced) {
  useEffect(() => {
    const el = surface.current; if (!el) return;
    let lastX = 0, lastY = 0, lastTime = 0;
    const start = e => {
      if (e.target.closest('a,button')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      interaction.active = true; interaction.lastRelease = Infinity;
      lastX = e.clientX; lastY = e.clientY; lastTime = performance.now();
      interaction.vx = interaction.vy = 0; el.setPointerCapture(e.pointerId); el.dataset.dragging = 'true';
    };
    const move = e => {
      if (!interaction.active) return;
      const now = performance.now(), dt = Math.max(8, now-lastTime), dx = e.clientX-lastX, dy=e.clientY-lastY;
      interaction.yaw += dx*.0065; interaction.pitch=Math.max(-.48,Math.min(.48,interaction.pitch+dy*.003));
      interaction.vx=dx*.0065/dt*16; interaction.vy=dy*.003/dt*16;
      lastX=e.clientX; lastY=e.clientY; lastTime=now;
    };
    const end = () => { interaction.active=false; interaction.lastRelease=performance.now(); el.dataset.dragging='false'; };
    const key = e => {
      const dirs = { ArrowLeft:[-.18,0], ArrowRight:[.18,0], ArrowUp:[0,-.08], ArrowDown:[0,.08] };
      if (dirs[e.key]) { e.preventDefault(); interaction.yaw+=dirs[e.key][0]; interaction.pitch=Math.max(-.48,Math.min(.48,interaction.pitch+dirs[e.key][1])); interaction.lastRelease=performance.now(); }
      if (e.key==='Home') { e.preventDefault(); interaction.lastRelease=0; }
    };
    el.addEventListener('pointerdown',start); el.addEventListener('pointermove',move); el.addEventListener('pointerup',end); el.addEventListener('pointercancel',end); el.addEventListener('lostpointercapture',end); el.addEventListener('keydown',key);
    return () => { el.removeEventListener('pointerdown',start); el.removeEventListener('pointermove',move); el.removeEventListener('pointerup',end); el.removeEventListener('pointercancel',end); el.removeEventListener('lostpointercapture',end); el.removeEventListener('keydown',key); };
  },[surface,interaction,reduced]);
}

export function stepInteraction(i,dt,reduced) {
  if (i.active) return;
  const elapsed = performance.now()-i.lastRelease;
  if (!reduced && elapsed<1300) { i.yaw+=i.vx*dt*60; i.pitch=Math.max(-.48,Math.min(.48,i.pitch+i.vy*dt*60)); }
  i.vx*=Math.exp(-dt*5); i.vy*=Math.exp(-dt*5);
  // A quiet hold, then a slow return; never replace the user's rotation abruptly.
  if (elapsed>2200) { const fade=Math.exp(-dt*(reduced ? 6 : .8)); i.yaw*=fade; i.pitch*=fade; }
}
