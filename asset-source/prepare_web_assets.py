from pathlib import Path
import json, struct, io, shutil
import re, html
from PIL import Image
root=Path(__file__).resolve().parents[1]
refs=root/'references'
source=(refs/'royalspices-verified-2026-09-28.html').read_text(encoding='utf-8')
def plain(text):return html.unescape(re.sub('<[^>]+>','',text)).strip()
items=[]
for card in re.findall(r'<article class="menu-card">(.*?)</article>',source,re.S):
    title=plain(re.search(r'<h4>(.*?)</h4>',card,re.S).group(1))
    price,unit=re.search(r'<p class="menu-price">(.*?)<small>(.*?)</small>',card,re.S).groups()
    paragraphs=re.findall(r'<p(?: [^>]*)?>(.*?)</p>',card,re.S)
    dishes=[[plain(a),plain(b)] for a,b in re.findall(r'<li><b>(.*?)</b><span>(.*?)</span></li>',card,re.S)]
    items.append({'title':title,'price':plain(price),'unit':plain(unit),'description':plain(paragraphs[1]),'dishes':dishes})
assert len(items)==6
(root/'src/menu-data.js').write_text('export const menuItems = '+json.dumps(items,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
for source,target in [('safran-display.jpg','display.webp'),('safran-glaeser-real.jpg','jars-real.webp'),('catering-event.jpg','catering.webp')]:
    im=Image.open(refs/source);im.thumbnail((1600,1600));im.save(root/'public/assets'/target,quality=87,method=6)
# Preserve source-resolution PNG bakes and pack smaller web copies in the GLB.
def optimize(name):
    path=root/'public/assets'/name
    raw=path.read_bytes();jlen=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jlen]);start=20+jlen
    blen=struct.unpack_from('<I',raw,start)[0];binary=raw[start+8:start+8+blen]
    images={im['bufferView']:im for im in doc.get('images',[]) if 'bufferView' in im}
    new=bytearray()
    for i,view in enumerate(doc['bufferViews']):
        segment=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
        if i in images:
            meta=images[i];im=Image.open(io.BytesIO(segment)).convert('RGB');label=meta.get('name','').lower()
            maximum=1024 if 'color' in label or 'label' in label or 'base' in label else 512
            im.thumbnail((maximum,maximum))
            out=io.BytesIO()
            if 'normal' in label: im.save(out,format='PNG',optimize=True)
            else: im.save(out,format='JPEG',quality=92,subsampling=0)
            meta['mimeType']='image/png' if 'normal' in label else 'image/jpeg';segment=out.getvalue()
        while len(new)%4:new.append(0)
        view['byteOffset']=len(new);view['byteLength']=len(segment);new.extend(segment)
    while len(new)%4:new.append(0)
    doc['buffers'][0]['byteLength']=len(new)
    encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
    result=struct.pack('<III',0x46546C67,2,12+8+len(encoded)+8+len(new))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+struct.pack('<II',len(new),0x004E4942)+new
    target=path.with_name(path.stem.replace('-v2','-web')+'.glb');target.write_bytes(result)
    print(name,len(raw),'->',target.name,len(result))
for n in ['royal-jar-v2.glb','saffron-thread-v2.glb','crocus-v2.glb']:
    optimize(n)
print('CATALOGUE_AND_WEB_ASSETS_READY')


im=Image.open(root/'renders/hero-reference-v2.png');im.thumbnail((1200,1200));im.save(root/'public/assets/hero-poster-v2.webp',quality=90,method=6)
