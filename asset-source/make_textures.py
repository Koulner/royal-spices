from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random, math, pathlib
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'public'/'assets'; out.mkdir(parents=True,exist_ok=True)
rng=random.Random(103)
def font(name,size): return ImageFont.truetype('C:/Windows/Fonts/'+name,size)
def centered(d,text,y,f,fill,spacing=0):
    if spacing:
        widths=[d.textlength(c,font=f) for c in text]; x=(1024-sum(widths)-spacing*(len(text)-1))/2
        for c,w in zip(text,widths): d.text((x,y),c,font=f,fill=fill); x+=w+spacing
    else: d.text((512,y),text,font=f,fill=fill,anchor='mt')
def bezier(points,n=80):
    return [tuple((1-t)**3*points[0][k]+3*(1-t)**2*t*points[1][k]+3*(1-t)*t*t*points[2][k]+t**3*points[3][k] for k in (0,1)) for t in [i/n for i in range(n+1)]]
def logo(d,cx,cy,s,color,width):
    paths=[[(0,78),(0,15),(0,-28),(0,-54)],[(0,-19),(-26,-41),(-22,-69),(0,-94)],[(0,-94),(24,-67),(22,-42),(0,-19)],[(0,35),(-49,18),(-52,-13),(-48,-38)],[(-48,-38),(-11,-19),(-9,6),(0,35)],[(0,28),(39,9),(48,-18),(45,-39)],[(45,-39),(10,-20),(5,1),(0,28)]]
    for p in paths: d.line([(cx+x*s,cy+y*s) for x,y in bezier(p)],fill=color,width=width)
img=Image.new('RGBA',(1024,1280),(0,0,0,0)); d=ImageDraw.Draw(img)
d.rounded_rectangle((5,5,1019,1275),radius=98,fill='#e5dfca')
d.rounded_rectangle((29,29,995,1251),radius=77,outline='#99917b',width=4)
d.rounded_rectangle((45,45,979,1235),radius=65,outline='#b4aa90',width=2)
logo(d,512,159,.77,'#77714f',7)
centered(d,'ROYAL',278,font('times.ttf',146),'#514b33',13)
centered(d,'SPICES',428,font('times.ttf',132),'#514b33',11)
d.line((377,607,647,607), fill='#aaa080',width=3)
centered(d,'SAFFRON',657,font('arial.ttf',74),'#302e26',8)
centered(d,'HERAT NEGIN',793,font('arial.ttf',49),'#38352b',4)
centered(d,'GRADE 1',858,font('arial.ttf',45),'#38352b',4)
d.line((432,930,592,930), fill='#9c9277',width=3)
centered(d,'0,5 g',968,font('arial.ttf',68),'#373328')
centered(d,'PACKED IN GERMANY',1104,font('arial.ttf',29),'#464131',3)
for i,c in enumerate(['#28281e','#9c3025','#c3a248']): d.rectangle((440,1164+i*19,584,1183+i*19),fill=c)
img.save(out/'label.png')
seal=Image.new('RGB',(256,640),'#3d493c'); d=ImageDraw.Draw(seal)
logo(d,128,329,1.65,'#d4c89f',5); seal.save(out/'seal.png')
# Deterministic cork surface, with coarse pores and fine grain; original procedural texture.
tex=Image.new('RGB',(1024,1024)); px=tex.load()
for y in range(1024):
    for x in range(1024):
        v=rng.gauss(0,9)+6*math.sin(y*.2+math.sin(x*.012))
        px[x,y]=tuple(int(max(0,min(255,c+v))) for c in (162,123,77))
d=ImageDraw.Draw(tex)
for i in range(5800):
    x,y=rng.randrange(1024),rng.randrange(1024); w=rng.randrange(2,22); h=rng.randrange(1,9)
    c=rng.choice(['#6b482b','#765533','#997144','#bd9560','#ac824f'])
    d.ellipse((x,y,x+w,y+h),fill=c)
tex=tex.filter(ImageFilter.GaussianBlur(.45)); tex.save(out/'cork.jpg',quality=90)
print('Textures created')
