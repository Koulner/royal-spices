// Product description from Shopify editor HTML as text blocks (src/lib/commerce/rich-text.ts, T-20261018-02).
import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlToBlocks, textToBlocks, blocksToText, mapText, groupByHeading } from '../src/lib/commerce/rich-text.ts';

const p = (...inline) => ({ kind: 'paragraph', inline });
const h = (level, text) => ({ kind: 'heading', level, inline: [{ text }] });
const t = (text) => ({ text });
const BR = { br: true };

test('editor HTML as Shopify sends it: headings, paragraphs, rows with bold labels, line breaks', () => {
  const html =
    '<h2>Die Kunst des Safrans – im kleinen Glas</h2><p>Ganze rote Fäden, <em>fein</em> abgestimmt.</p>' +
    '<h3>Produktdetails</h3><ul>\n<li>\n<strong>Produkt:</strong> Safranfäden</li>\n<li>\n<strong>Zutaten:</strong> 100 % Safran</li>\n</ul>' +
    '<h3>Lagerung</h3><p>Trocken lagern.<br>\nVor Licht schützen.</p>';
  assert.deepEqual(htmlToBlocks(html), [
    h(2, 'Die Kunst des Safrans – im kleinen Glas'),
    p(t('Ganze rote Fäden, '), { text: 'fein', em: true }, t(' abgestimmt.')),
    h(3, 'Produktdetails'),
    {
      kind: 'list',
      ordered: false,
      items: [
        [{ text: 'Produkt:', strong: true }, t(' Safranfäden')],
        [{ text: 'Zutaten:', strong: true }, t(' 100 % Safran')],
      ],
    },
    h(3, 'Lagerung'),
    p(t('Trocken lagern.'), BR, t('Vor Licht schützen.')),
  ]);
});

test('heading levels: h1 and h2 become 2, h3 to h6 become 3, never 1', () => {
  const levels = htmlToBlocks('<h1>a</h1><h2>b</h2><h3>c</h3><h4>d</h4><h5>e</h5><h6>f</h6>').map((b) => b.level);
  assert.deepEqual(levels, [2, 2, 3, 3, 3, 3]);
});

test('scripts, styles, embeds, images, links and attributes are dropped; link texts stay', () => {
  const html =
    '<script>alert(1)</script><style>p{color:red}</style><iframe src="https://x.test">frame</iframe>' +
    '<svg><text>svg</text></svg><!-- note --><p onclick="steal()" style="x">Hallo <a href="javascript:alert(1)" title="a>b">Link</a>' +
    '<img src=x onerror=alert(1)><span class="c">!</span></p><template><p>hidden</p></template>';
  const blocks = htmlToBlocks(html);
  assert.deepEqual(blocks, [p(t('Hallo Link!'))]);
  assert.doesNotMatch(JSON.stringify(blocks), /alert|steal|javascript|onerror|svg|frame|hidden|note|color/);
  assert.deepEqual(htmlToBlocks('<p>vorher</p><script>unclosed <p>rest</p>'), [p(t('vorher'))], 'an unclosed script swallows the rest');
  assert.deepEqual(htmlToBlocks('<p>&lt;b&gt;fett&lt;/b&gt; a < b</p>'), [p(t('<b>fett</b> a < b'))], 'escaped markup stays text');
});

test('entities: named, decimal and hex; unknown ones stay; invalid code points become U+FFFD', () => {
  assert.deepEqual(htmlToBlocks('<p>&amp; &auml; &#228; &#xE4; &bdquo;x&ldquo; &bogus; &#0;</p>'), [p(t('& ä ä ä „x“ &bogus; �'))]);
});

test('whitespace collapses, the non-breaking space is kept, empty blocks vanish', () => {
  assert.deepEqual(htmlToBlocks('<p>  a \n\t b  </p>'), [p(t('a b'))]);
  assert.deepEqual(htmlToBlocks('<p>1&nbsp;g, Grade A</p>'), [p(t('1 g, Grade A'))]);
  assert.deepEqual(htmlToBlocks('<p>a <br> b<br></p>'), [p(t('a'), BR, t('b'))], 'trimmed around and after line breaks');
  assert.deepEqual(htmlToBlocks('<p> </p><p><br></p><div>\n</div><ul><li> </li></ul>'), []);
  assert.deepEqual(htmlToBlocks('lose <b>fett</b> <i>kursiv</i>'), [p(t('lose '), { text: 'fett', strong: true }, t(' '), { text: 'kursiv', em: true })]);
  assert.deepEqual(htmlToBlocks('<p><strong>a <em>b</em></strong> c</p>'), [p({ text: 'a ', strong: true }, { text: 'b', strong: true, em: true }, t(' c'))]);
});

test('lists: ordered and unordered, nested lists become further items, paragraphs in an item become line breaks', () => {
  assert.deepEqual(htmlToBlocks('<ol><li>eins</li><li>zwei</li></ol>'), [{ kind: 'list', ordered: true, items: [[t('eins')], [t('zwei')]] }]);
  assert.deepEqual(htmlToBlocks('<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul><p>danach</p>'), [
    { kind: 'list', ordered: false, items: [[t('a')], [t('b')], [t('c')]] },
    p(t('danach')),
  ]);
  assert.deepEqual(htmlToBlocks('<ul><li><p>x</p><p>y</p></li></ul>'), [{ kind: 'list', ordered: false, items: [[t('x'), BR, t('y')]] }]);
  assert.deepEqual(htmlToBlocks('<p>vor</p><ul><li>a</li></ul>'), [p(t('vor')), { kind: 'list', ordered: false, items: [[t('a')]] }]);
});

test('textToBlocks: one paragraph per non-empty line', () => {
  assert.deepEqual(textToBlocks('a\n\n  b   c \nd'), [p(t('a')), p(t('b c')), p(t('d'))]);
  assert.deepEqual(textToBlocks(''), []);
});

test('blocksToText: blocks, list items and line breaks separated by one space', () => {
  const blocks = htmlToBlocks('<h2>Titel</h2><p>Text<br>weiter</p><ul><li><b>A:</b> 1</li><li>B</li></ul>');
  assert.equal(blocksToText(blocks), 'Titel Text weiter A: 1 B');
  assert.equal(blocksToText([]), '');
});

test('mapText changes the text of every span and keeps the structure', () => {
  const blocks = htmlToBlocks('<h3>Grade A</h3><p>x<br>Grade A</p><ul><li><b>Grade A</b></li></ul>');
  const mapped = mapText(blocks, (text) => text.replace('Grade A', 'Grade 1'));
  assert.equal(blocksToText(mapped), 'Grade 1 x Grade 1 Grade 1');
  assert.deepEqual(mapped[1].inline[1], BR);
  assert.equal(mapped[2].items[0][0].strong, true);
  assert.equal(blocksToText(blocks), 'Grade A x Grade A Grade A', 'the input is not changed');
});

test('groupByHeading: a group per heading, text before the first heading without one', () => {
  const blocks = htmlToBlocks('<p>vorweg</p><h2>Eins</h2><p>a</p><h3>Zwei</h3><ul><li>b</li></ul><p>c</p><h3>Leer</h3>');
  assert.deepEqual(
    groupByHeading(blocks).map((g) => [g.heading && blocksToText([g.heading]), g.blocks.map((b) => b.kind)]),
    [
      [null, ['paragraph']],
      ['Eins', ['paragraph']],
      ['Zwei', ['list', 'paragraph']],
      ['Leer', []],
    ],
  );
  assert.deepEqual(groupByHeading([]), []);
});
