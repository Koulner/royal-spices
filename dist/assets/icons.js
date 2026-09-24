import replaceElement from './lucide/replaceElement.js';
export {default as ArrowUpRight} from './lucide/icons/arrow-up-right.js';
export {default as ArrowDown} from './lucide/icons/arrow-down.js';
export {default as ArrowUp} from './lucide/icons/arrow-up.js';
export {default as ArrowRight} from './lucide/icons/arrow-right.js';
export {default as Menu} from './lucide/icons/menu.js';
export {default as X} from './lucide/icons/x.js';
export {default as Pause} from './lucide/icons/pause.js';
export {default as Play} from './lucide/icons/play.js';
export function createIcons({icons}) {
  document.querySelectorAll('i[data-lucide]').forEach(element=>replaceElement(element,{nameAttr:'data-lucide',icons,attrs:{}}));
}
