import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
export const chapterPoints=[0,.23,.415,.49,.645,.79,.997];
export const initialState=()=>({progress:0,reveal:.3,yaw:-.36,tilt:.055,scale:1,x:.95,y:0,jar:1,thread:0,threadYaw:-.2,amber:0,spread:0,flower:0});
export function makeDirector(state,story,reduced,onChapter){
  const ctx=gsap.context(()=>{
    Object.assign(state,initialState());
    if(reduced){state.reveal=1;onChapter(0);return;}
    const tl=gsap.timeline({defaults:{ease:'power2.inOut'},paused:true});
    tl.to(state,{reveal:1,yaw:-.14,tilt:-.045,duration:.16},0)
      .to(state,{yaw:-1.05,tilt:.10,scale:1.65,x:1.45,y:-.28,duration:.16},.14)
      .to(state,{jar:0,thread:1,amber:.12,duration:.10},.29)
      .to(state,{threadYaw:.2,spread:.2,duration:.12},.39)
      .to(state,{thread:0,flower:1,amber:0,duration:.10},.52)
      .to(state,{flower:0,thread:1,spread:1,amber:.85,duration:.12},.66)
      .to(state,{threadYaw:-.15,duration:.10},.76)
      .to(state,{thread:0,jar:1,flower:0,yaw:-.22,tilt:.035,scale:1,x:.95,y:0,amber:0,duration:.14},.86);
    ScrollTrigger.create({trigger:story,start:'top top',end:'bottom bottom',scrub:.65,animation:tl,onUpdate(self){
      state.progress=self.progress;
      const p=self.progress;onChapter(p<.16?0:p<.30?1:p<.43?2:p<.54?3:p<.68?4:p<.87?5:6);
      document.documentElement.style.setProperty('--story-progress',String(p));
    }});
  },story);
  return()=>ctx.revert();
}

