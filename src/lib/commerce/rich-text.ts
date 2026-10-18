// Product description from Shopify as text blocks (T-20261018-02).
// Storefront `description` is plain text with the blocks glued together ("…im kleinen GlasHerat Negin…"),
// so the structure comes from `descriptionHtml`. That HTML is never put into a page: at build time it is
// read into headings, paragraphs and lists of plain text spans (bold, italic, line breaks), which the page
// renders as escaped text. Scripts, styles, embeds, images, links and attributes are dropped; link texts stay.
// Framework-free and dependency-free, so it runs in the tests without a build.

export type Span = { text: string; strong?: true; em?: true };
export type Inline = Span | { br: true };
export type HeadingBlock = { kind: 'heading'; level: 2 | 3; inline: Inline[] };
export type Block =
  | HeadingBlock
  | { kind: 'paragraph'; inline: Inline[] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] };

/** Elements whose content is dropped with them. */
const DROP = new Set(['script', 'style', 'template', 'noscript', 'iframe', 'object', 'embed', 'svg', 'math', 'head', 'title', 'textarea', 'select', 'button', 'video', 'audio', 'canvas', 'picture']);
/** Elements that end the current paragraph (outside lists). */
const BOUNDARY = new Set(['p', 'div', 'blockquote', 'section', 'article', 'header', 'footer', 'aside', 'main', 'nav', 'figure', 'figcaption', 'pre', 'address', 'details', 'summary', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'caption', 'hr', 'form', 'fieldset', 'li']);
const CELL = new Set(['td', 'th']);

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '­',
  ndash: '–', mdash: '—', hellip: '…', bull: '•', middot: '·', laquo: '«', raquo: '»',
  bdquo: '„', ldquo: '“', rdquo: '”', sbquo: '‚', lsquo: '‘', rsquo: '’',
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç',
  euro: '€', copy: '©', reg: '®', trade: '™', deg: '°', times: '×', frac12: '½',
  thinsp: ' ', ensp: ' ', emsp: ' ', zwnj: '‌', zwj: '‍',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, (match, code: string) => {
    if (code[0] !== '#') return Object.hasOwn(NAMED, code) ? NAMED[code] : match;
    const point = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    const valid = point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff);
    return valid ? String.fromCodePoint(point) : '�';
  });
}

/** HTML whitespace collapses to one space; the non-breaking space (U+00A0) is kept. */
const collapse = (text: string) => text.replace(/[ \t\n\r\f]+/g, ' ');

const TOKEN = /<!--[\s\S]*?(?:-->|$)|<![^>]*>?|<\?[^>]*>?|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</y;

/** Reads Shopify editor HTML into blocks of plain text. Never returns markup. */
export function htmlToBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  let open: HeadingBlock | { kind: 'paragraph'; inline: Inline[] } | null = null;
  let list: { ordered: boolean; items: Inline[][]; depth: number } | null = null;
  let item = null as Inline[] | null; // "as": only the helpers below assign it, so TS would narrow it to null in the loop
  let strong = 0;
  let em = 0;

  const span = (text: string): Span => ({ text, ...(strong > 0 ? { strong: true as const } : {}), ...(em > 0 ? { em: true as const } : {}) });

  function closeOpen() {
    if (open) {
      const inline = normalize(open.inline);
      if (inline.length) blocks.push({ ...open, inline });
    }
    open = null;
  }
  function closeItem() {
    if (list && item) {
      const inline = normalize(item);
      if (inline.length) list.items.push(inline);
    }
    item = null;
  }
  function closeList() {
    closeItem();
    if (list?.items.length) blocks.push({ kind: 'list', ordered: list.ordered, items: list.items });
    list = null;
  }
  function addText(raw: string) {
    const text = collapse(decodeEntities(raw));
    if (list) {
      if (!item) {
        if (!text.trim()) return;
        item = [];
      }
      item.push(span(text));
      return;
    }
    if (!open) {
      if (!text.trim()) return;
      open = { kind: 'paragraph', inline: [] };
    }
    open.inline.push(span(text));
  }
  function addBreak() {
    if (list && item) item.push({ br: true });
    else if (!list && open) open.inline.push({ br: true });
  }

  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < html.length) {
    const start = TOKEN.lastIndex;
    const m = TOKEN.exec(html);
    if (!m) break;
    const [token, slash, rawName] = m;
    if (rawName === undefined) {
      if (token[0] !== '<' || token === '<') addText(token);
      continue;
    }
    const name = rawName.toLowerCase();
    const closing = slash === '/';
    const selfClosing = /\/\s*$/.test(m[3] ?? '');

    if (DROP.has(name)) {
      if (!closing && !selfClosing) {
        const end = new RegExp(`</${name}\\s*>`, 'ig');
        end.lastIndex = start + token.length;
        TOKEN.lastIndex = end.exec(html) ? end.lastIndex : html.length;
      }
      continue;
    }
    if (name === 'br') {
      addBreak();
      continue;
    }
    if (name === 'strong' || name === 'b') {
      strong = Math.max(0, strong + (closing ? -1 : 1));
      continue;
    }
    if (name === 'em' || name === 'i') {
      em = Math.max(0, em + (closing ? -1 : 1));
      continue;
    }
    if (name === 'ul' || name === 'ol') {
      if (closing) {
        if (list && --list.depth === 0) closeList();
        else closeItem();
      } else if (list) {
        // a nested list continues the outer one as further items
        closeItem();
        list.depth++;
      } else {
        closeOpen();
        list = { ordered: name === 'ol', items: [], depth: 1 };
      }
      continue;
    }
    if (list) {
      if (name === 'li') closeItem();
      else if ((BOUNDARY.has(name) || /^h[1-6]$/.test(name)) && !closing && item?.length) item.push({ br: true });
      continue;
    }
    if (/^h[1-6]$/.test(name)) {
      closeOpen();
      if (!closing) open = { kind: 'heading', level: name === 'h1' || name === 'h2' ? 2 : 3, inline: [] };
      continue;
    }
    if (BOUNDARY.has(name)) {
      closeOpen();
      continue;
    }
    if (CELL.has(name) && !closing && open) open.inline.push(span(' '));
    // anything else (a, span, u, img, …) is transparent: its text stays, the element and its attributes go
  }
  closeOpen();
  closeList();
  return blocks;
}

/** Joins spans of the same style, collapses spaces across them, trims around line breaks and at both ends. */
function normalize(inline: Inline[]): Inline[] {
  const out: Inline[] = [];
  const trimEnd = () => {
    for (let last = out.at(-1); last && !('br' in last); last = out.at(-1)) {
      last.text = last.text.replace(/ +$/, '');
      if (last.text) return;
      out.pop();
    }
  };
  for (const node of inline) {
    if ('br' in node) {
      trimEnd();
      out.push({ br: true });
      continue;
    }
    const prev = out.at(-1);
    const text = !prev || 'br' in prev || prev.text.endsWith(' ') ? node.text.replace(/^ +/, '') : node.text;
    if (!text) continue;
    if (prev && !('br' in prev) && prev.strong === node.strong && prev.em === node.em) prev.text += text;
    else out.push({ ...node, text });
  }
  trimEnd();
  while (out[0] && 'br' in out[0]) out.shift();
  while (out.at(-1) && 'br' in out.at(-1)!) {
    out.pop();
    trimEnd();
  }
  return out;
}

/** Plain text (e.g. a product.ts text or an HTML-less Shopify text): one paragraph per line. */
export function textToBlocks(text: string): Block[] {
  return text
    .split('\n')
    .map((line) => collapse(line).trim())
    .filter(Boolean)
    .map((line) => ({ kind: 'paragraph', inline: [{ text: line }] }));
}

const inlineText = (inline: Inline[]) => inline.map((node) => ('br' in node ? ' ' : node.text)).join('');

/** The blocks as one line of text, blocks and line breaks separated by a space. */
export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((block) => (block.kind === 'list' ? block.items.map(inlineText).join(' ') : inlineText(block.inline)))
    .join(' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** Applies fn to the text of every span (e.g. Grade A → Grade 1). */
export function mapText(blocks: Block[], fn: (text: string) => string): Block[] {
  const inline = (nodes: Inline[]): Inline[] => nodes.map((node) => ('br' in node ? node : { ...node, text: fn(node.text) }));
  return blocks.map((block) => (block.kind === 'list' ? { ...block, items: block.items.map(inline) } : { ...block, inline: inline(block.inline) }));
}

export type BlockGroup = { heading: HeadingBlock | null; blocks: Block[] };

/** Splits the blocks at each heading: what comes before the first heading has heading null. */
export function groupByHeading(blocks: Block[]): BlockGroup[] {
  const groups: BlockGroup[] = [];
  for (const block of blocks) {
    if (block.kind === 'heading') groups.push({ heading: block, blocks: [] });
    else if (groups.length) groups[groups.length - 1].blocks.push(block);
    else groups.push({ heading: null, blocks: [block] });
  }
  return groups;
}
