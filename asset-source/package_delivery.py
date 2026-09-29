from pathlib import Path
import json, struct, re, zipfile, io, hashlib, ast, os
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent
report={'version':'2.0.0','date':'2026-09-29','checks':{},'assets':{},'archives':{}}
for p in (ROOT/'asset-source').glob('*.py'):
    ast.parse(p.read_text(encoding='utf-8-sig'),filename=str(p))
report['checks']['python_sources_parse']=True
used=set()
for p in list((ROOT/'src').rglob('*'))+[ROOT/'index.html']:
    if p.is_file(): used.update(re.findall(r'/assets/([A-Za-z0-9_.-]+)',p.read_text(encoding='utf-8-sig')))
missing=[a for a in used if not (ROOT/'public/assets'/a).is_file()]
assert not missing,missing
report['checks']['referenced_assets_present']=sorted(used)
for name in ['royal-jar-web.glb','saffron-thread-web.glb','crocus-web.glb']:
    raw=(ROOT/'public/assets'/name).read_bytes()
    magic,ver,total=struct.unpack_from('<III',raw,0);assert magic==0x46546c67 and ver==2 and total==len(raw)
    jl=struct.unpack_from('<I',raw,12)[0];data=json.loads(raw[20:20+jl]);pos=20+jl
    bl=struct.unpack_from('<I',raw,pos)[0];binary=raw[pos+8:pos+8+bl]
    assert data['buffers'][0]['byteLength']<=len(binary)
    for v in data['bufferViews']:
        assert v.get('byteOffset',0)>=0 and v.get('byteOffset',0)+v['byteLength']<=len(binary)
    images=[]
    for im in data.get('images',[]):
        v=data['bufferViews'][im['bufferView']];begin=v.get('byteOffset',0)
        pic=Image.open(io.BytesIO(binary[begin:begin+v['byteLength']]));pic.verify()
        images.append({'name':im.get('name',''),'mime':im['mimeType']})
    report['assets'][name]={'bytes':len(raw),'meshes':len(data.get('meshes',[])),'materials':len(data.get('materials',[])),'embedded_images':images}
for name in ['hero-reference-v2.png','saffron-macro-v2.png','crocus-reference.png']:
    im=Image.open(ROOT/'renders'/name);im.verify()
report['checks']['render_images_valid']=True
dist=ROOT/'dist'
html=(dist/'index.html').read_text(encoding='utf-8')
assert re.search(r'/assets/index-[^"]+\.js',html)
buildFiles=[p for p in dist.rglob('*') if p.is_file() and (p.relative_to(dist).parts[0]!='assets' or p.name in used or p.suffix in ['.js','.css'])]
assert any(p.suffix=='.js' for p in buildFiles)
# Only runtime files enter the deployment archive; source-resolution bakes stay in the source archive.
webzip=OUT/'Royal-Spices-Website-Build.zip'
with zipfile.ZipFile(webzip,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in buildFiles:z.write(p,p.relative_to(dist).as_posix())
with zipfile.ZipFile(webzip) as z:
    assert z.testzip() is None
    names=set(z.namelist())
    assert all('assets/'+name in names for name in used)
report['checks']['production_build_present']=True
report['checks']['deployment_zip_crc_and_assets']=True
report['archives'][webzip.name]={'bytes':webzip.stat().st_size,'sha256':hashlib.sha256(webzip.read_bytes()).hexdigest()}
qa=ROOT/'references/delivery-validation.json'
qa.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
sourcezip=OUT/'Royal-Spices-Website-und-Blender.zip'
with zipfile.ZipFile(sourcezip,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for base,dirs,files in os.walk(ROOT):
        dirs[:]=[d for d in dirs if d not in ['node_modules','dist','.git','__pycache__']]
        for name in files:
            p=Path(base)/name;rel=p.relative_to(ROOT)
            if p.suffix in ['.blend1','.pyc']:continue
            z.write(p,Path('royal-spices',rel).as_posix())
    z.write(webzip,'Royal-Spices-Website-Build.zip')
with zipfile.ZipFile(sourcezip) as z:assert z.testzip() is None
report['archives'][sourcezip.name]={'bytes':sourcezip.stat().st_size,'sha256':hashlib.sha256(sourcezip.read_bytes()).hexdigest()}
report['checks']['source_zip_crc']=True
# Final report sits beside the zips; the embedded report intentionally excludes its own archive checksum.
(OUT/'Royal-Spices-Pruefung.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'checks':report['checks'],'archives':report['archives']},ensure_ascii=False,indent=2))

