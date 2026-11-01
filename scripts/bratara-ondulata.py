# Face o banda de bratara "ondulata" dintr-o imagine plata (banda dreapta, orizontala).
# Folosire: python3 scripts/bratara-ondulata.py intrare.png iesire.png [grosime_px] [amplitudine]
#   amplitudine 1.0 = ca exemplul; -0.9 = unda inversata. Necesita: pip install numpy pillow
import numpy as np, sys
from PIL import Image, ImageFilter
def bez(p0,p1,p2,p3,t):
    t=t[:,None]; return (1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t**2*p2+t**3*p3
def curve(n, amp=1.0):
    # two cubic segments like the doodle, in a 1000x300 box
    segs=[((60,400),(400,80),(800,520),(1200,220)),((1200,220),(1500,20),(1750,260),(1940,140))]
    pts=[]
    for s in segs:
        t=np.linspace(0,1,n//2,endpoint=False); pts.append(bez(*[np.array(p,float) for p in s],t))
    P=np.vstack(pts); P[:,1]=300+(P[:,1]-300)*amp
    return P
def warp(src, out, W=2000, H=600, thick=None, amp=1.0):
    im=Image.open(src).convert('RGBA')
    P=curve(4000,amp)
    d=np.diff(P,axis=0); seg=np.hypot(d[:,0],d[:,1]); L=seg.sum()
    s=np.concatenate([[0],np.cumsum(seg)])/L
    thick=thick or L*im.size[1]/im.size[0]
    # upsample source along length
    SW=int(L*2); SH=int(thick*2)
    srcA=np.asarray(im.resize((SW,SH),Image.LANCZOS)).astype(float)
    S=4; out_img=np.zeros((H*S,W*S,4)); cnt=np.zeros((H*S,W*S))
    us=np.linspace(0,1,SW)
    px=np.interp(us,s,P[:,0]); py=np.interp(us,s,P[:,1])
    tx=np.gradient(px); ty=np.gradient(py); tn=np.hypot(tx,ty); tx/=tn; ty/=tn
    nx,ny=-ty,tx
    ang=np.arctan2(ty,tx); curv=np.gradient(np.unwrap(ang))
    shade=1-np.clip(np.abs(np.gradient(ang))*0,0,0)  # placeholder
    light=0.9+0.12*np.sin(ang*1.0+0.6)  # bands facing light look brighter
    for j in range(SH):
        v=(j/(SH-1)-0.5)*thick
        X=((px+nx*v)*S).astype(int); Y=((py+ny*v)*S).astype(int)
        ok=(X>=0)&(X<W*S)&(Y>=0)&(Y<H*S)
        col=srcA[j].copy(); col[:,:3]*=light[:,None]
        np.add.at(out_img,(Y[ok],X[ok]),col[ok]); np.add.at(cnt,(Y[ok],X[ok]),1)
    m=cnt>0; out_img[m]/=cnt[m][:,None]
    o=Image.fromarray(np.clip(out_img,0,255).astype(np.uint8),'RGBA')
    # fill tiny holes
    o=o.filter(ImageFilter.MaxFilter(3)).resize((W,H),Image.LANCZOS)
    # soft shadow
    a=np.asarray(o)[:,:,3]
    sh=Image.fromarray((a*0.35).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))
    base=Image.new('RGBA',(W,H),(0,0,0,0)); shadow=Image.new('RGBA',(W,H),(16,24,33,255)); shadow.putalpha(sh)
    base.alpha_composite(shadow,(0,8)); base.alpha_composite(o)
    base.save(out)

if __name__=='__main__':
    a=sys.argv
    warp(a[1],a[2],thick=float(a[3]) if len(a)>3 else 92,amp=float(a[4]) if len(a)>4 else 1.0)
    im=Image.open(a[2]); im.crop(im.getbbox()).save(a[2])
