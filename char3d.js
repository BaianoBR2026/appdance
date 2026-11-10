// Personagens 3D do AppDance (three.js, desenhados pela placa de vídeo da TV).
// Usa os mesmos bichinhos de personagens.js (CUTE), agora com volume, luz e sombra de verdade.
// API: Fofo3D.init(canvas) -> true/false ; Fofo3D.resize(w,h) ; Fofo3D.frame(lista, map, t) ; Fofo3D.clear()
//  lista = [{c: índice do jogador, id: personagem, k: esqueleto, col: cor, gray, hidden}]
//  devolve [{c, hx, hy, top}] com a posição da cabeça (para desenhar etiqueta J1/J2/J3 por cima)
(function(global){
const T=global.THREE;
if(!T||!global.CUTE){global.Fofo3D=null;return;}
const CUTE=global.CUTE;
let renderer=null,scene=null,cam=null,W=1,H=1,ok=false;
const UP=new T.Vector3(0,1,0);
const chars={};      // por jogador
let gradTex=null;

function vis(p){return !p?0:(p.v!==undefined?p.v:(p.visibility===undefined?1:p.visibility));}
function toonGrad(){
 if(gradTex)return gradTex;
 const c=document.createElement('canvas');c.width=4;c.height=1;const g=c.getContext('2d');
 ['#6a6a6a','#a8a8a8','#e2e2e2','#ffffff'].forEach((col,i)=>{g.fillStyle=col;g.fillRect(i,0,1,1);});
 gradTex=new T.CanvasTexture(c);gradTex.minFilter=T.NearestFilter;gradTex.magFilter=T.NearestFilter;gradTex.generateMipmaps=false;
 return gradTex;
}
const GEO={};
function geos(){
 if(GEO.s)return GEO;
 GEO.s=new T.SphereGeometry(1,28,18);
 GEO.c=new T.CylinderGeometry(1,1,1,20,1,true);
 GEO.cone=new T.ConeGeometry(1,1,20);
 GEO.disc=new T.CircleGeometry(1,40);
 GEO.ring=new T.RingGeometry(0.86,1,48);
 return GEO;
}

function init(canvas){
 try{
  renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000,0);
  scene=new T.Scene();
  cam=new T.OrthographicCamera(0,1,0,-1,-6000,6000);cam.position.z=3000;
  scene.add(new T.HemisphereLight(0xfff6ee,0x6a5a8a,2.2));
  const key=new T.DirectionalLight(0xffffff,2.6);key.position.set(-0.6,0.9,1.2);scene.add(key);
  const rim=new T.DirectionalLight(0xbfd8ff,1.0);rim.position.set(0.8,0.3,-0.6);scene.add(rim);
  geos();toonGrad();
  ok=true;
 }catch(e){console.warn('3D indisponível',e);ok=false;}
 return ok;
}
function resize(w,h){
 if(!ok)return;W=w;H=h;renderer.setSize(w,h,false);
 cam.left=0;cam.right=w;cam.top=0;cam.bottom=-h;cam.updateProjectionMatrix();
}

function toon(col){return new T.MeshToonMaterial({color:new T.Color(col),gradientMap:toonGrad()});}
function basic(col,op){const m=new T.MeshBasicMaterial({color:new T.Color(col)});if(op!==undefined){m.transparent=true;m.opacity=op;m.depthWrite=false;}return m;}

class Char{
 constructor(id,col){
  this.id=id;this.col=col;
  const C=this.C=CUTE[id]||CUTE.urso;
  this.root=new T.Group();scene.add(this.root);
  this.mats=[];
  const M=(c)=>{const m=toon(c);m.userData.base=new T.Color(c);this.mats.push(m);return m;};
  this.mFur=M(C.fur);this.mLimb=M(C.limb||C.fur);this.mSock=M(C.sock||C.limb||C.fur);this.mBelly=M(C.belly);
  this.mCol=M(col);this.mEarIn=M(C.earIn||C.fur);this.mEar=M(C.earCol||C.fur);
  this.mMuz=M(C.muzzle||'#ffffff');this.mNose=M(C.nose||'#3b2416');this.mMane=C.mane?M(C.mane):null;this.mSpike=C.spikes?M(C.spikes):null;
  this.mStripe=C.stripes?M(C.stripes):null;this.mPatch=C.patch?M(C.patch):null;this.mSpot=C.eyeSpot?M(C.eyeSpot):null;
  this.mEye=basic('#141010');this.mWhite=basic('#ffffff');this.mCheek=basic('#ff7aa0',0.5);this.mMouth=basic('#7a2230');this.mTongue=basic('#f472b6');
  const s=(m,parent)=>{const o=new T.Mesh(GEO.s,m);(parent||this.root).add(o);return o;};
  const cy=(m)=>{const o=new T.Mesh(GEO.c,m);this.root.add(o);return o;};
  // chão
  this.shadow=new T.Mesh(GEO.disc,basic('#000000',0.25));this.root.add(this.shadow);
  this.ring=new T.Mesh(GEO.ring,basic(col,0.9));this.root.add(this.ring);
  // rabo
  this.tail=[];
  const tc=C.tail;
  if(tc==='short')this.tail.push(s(this.mFur));
  else if(tc==='pom')this.tail.push(s(M('#ffffff')));
  else if(tc==='wag'||tc==='long'||tc==='tuft'){for(let i=0;i<(tc==='long'?4:2);i++){this.tail.push(cy(i%2&&this.mStripe?this.mStripe:this.mFur));this.tail.push(s(i%2&&this.mStripe?this.mStripe:this.mFur));}if(tc==='tuft')this.tail.push(s(this.mMane));}
  else if(tc==='fluffy'){this.tail.push(s(this.mFur));this.tail.push(s(M('#fff8ef')));}
  else if(tc==='dino'){const o=new T.Mesh(GEO.cone,this.mFur);this.root.add(o);this.tail.push(o);for(let i=0;i<3;i++){const sp=new T.Mesh(GEO.cone,this.mSpike);this.root.add(sp);this.tail.push(sp);}}
  // pernas e braços: cilindro + bolinhas nas juntas (fica lisinho)
  const limb=(mUp,mLo)=>({up:cy(mUp),j0:s(mUp),j1:s(mUp),lo:cy(mLo),j2:s(mLo),end:s(mLo),pad:s(M(this.shadeHex(C.belly,0)))});
  this.legs=[limb(this.mLimb,this.mSock),limb(this.mLimb,this.mSock)];
  this.arms=[limb(this.mLimb,this.mSock),limb(this.mLimb,this.mSock)];
  // corpo
  this.body=s(this.mFur);this.belly=s(this.mBelly);
  this.stripes=[];if(this.mStripe)for(let i=0;i<4;i++)this.stripes.push(s(this.mStripe));
  // cachecol (ou laço)
  this.scarf=C.bow?null:{a:cy(this.mCol),b:s(this.mCol),c:s(this.mCol),d:cy(this.mCol),e:s(this.mCol)};
  // cabeça (construída em unidades de raio 1)
  const hd=this.head=new T.Group();this.root.add(hd);
  const hs=(m,x,y,z,sx,sy,sz,rz)=>{const o=s(m,hd);o.position.set(x,y,z);o.scale.set(sx,sy,sz);if(rz)o.rotation.z=rz;return o;};
  if(C.mane){for(let i=0;i<14;i++){const a=i/14*Math.PI*2;hs(this.mMane,Math.cos(a)*1.0,Math.sin(a)*0.95,-0.35,0.38,0.38,0.3);}hs(this.mMane,0,0,-0.3,1.12,1.05,0.6);}
  if(C.ear==='round'){for(const k of [-1,1]){hs(this.mEar,k*0.72,0.72,-0.15,0.34,0.34,0.22);hs(this.mEarIn,k*0.72,0.72,0.02,0.19,0.19,0.12);}}
  else if(C.ear==='pointy'){for(const k of [-1,1]){const o=new T.Mesh(GEO.cone,this.mEar);hd.add(o);o.position.set(k*0.6,0.98,-0.1);o.scale.set(0.34,0.75,0.22);o.rotation.z=-k*0.32;
   const i2=new T.Mesh(GEO.cone,this.mEarIn);hd.add(i2);i2.position.set(k*0.6,0.95,0.04);i2.scale.set(0.2,0.5,0.1);i2.rotation.z=-k*0.32;}}
  else if(C.ear==='long'){this.longEars=[];for(const k of [-1,1]){const o=s(this.mFur,hd);o.scale.set(0.22,0.62,0.18);const i2=s(this.mEarIn,hd);i2.scale.set(0.11,0.5,0.1);this.longEars.push([o,i2,k]);}}
  if(C.spikes){for(let i=-1;i<=1;i++){const o=new T.Mesh(GEO.cone,this.mSpike);hd.add(o);o.position.set(i*0.4,1.0-Math.abs(i)*0.08,-0.1);o.scale.set(0.17,0.38,0.17);}}
  this.skull=hs(this.mFur,0,0,0,1,0.93,0.88);
  if(C.stripes){for(const x of [-0.22,0,0.22])hs(this.mStripe,x,0.72,0.55,0.06,0.16,0.05);}
  if(C.patch){for(const k of [-1,1])hs(this.mPatch,k*0.36,0.02,0.7,0.25,0.31,0.12,k*0.5);}
  if(C.eyeSpot)hs(this.mSpot,0.38,0.08,0.68,0.28,0.31,0.14,-0.3);
  this.floppy=[];if(C.ear==='floppy'){for(const k of [-1,1]){const o=hs(this.mEar,k*0.86,-0.05,0.1,0.28,0.52,0.18,k*0.25);this.floppy.push([o,k]);}}
  hs(C.muzzle?this.mMuz:M(this.shadeHex(C.fur,0.25)),0,-0.34,0.62,0.46,0.32,0.34);
  this.eyes=[];
  for(const k of [-1,1]){
   if(C.patch)hs(this.mWhite,k*0.36,0.04,0.8,0.17,0.2,0.06);
   const e=hs(this.mEye,k*0.36,0.04,0.84,0.14,0.17,0.08);
   const h1=hs(this.mWhite,k*0.36-0.05,0.105,0.92,0.055,0.055,0.03);
   const h2=hs(this.mWhite,k*0.36+0.045,-0.015,0.92,0.027,0.027,0.02);
   this.eyes.push([e,h1,h2]);
  }
  for(const k of [-1,1])hs(this.mCheek,k*0.6,-0.25,0.72,0.15,0.095,0.04);
  if(C.nose)hs(this.mNose,0,-0.2,0.96,0.12,0.085,0.08);else for(const k of [-1,1])hs(this.mEye,k*0.12,-0.22,0.9,0.035,0.035,0.02);
  hs(this.mMouth,0,-0.42,0.94,0.13,0.09,0.04);hs(this.mTongue,0,-0.46,0.97,0.075,0.045,0.03);
  if(C.tongue)hs(this.mTongue,0,-0.53,0.95,0.085,0.11,0.05);
  if(C.bow){const bw=new T.Group();hd.add(bw);bw.position.set(0.55,0.72,0.2);bw.rotation.z=-0.3;
   for(const k of [-1,1]){const o=new T.Mesh(GEO.cone,this.mCol);bw.add(o);o.scale.set(0.24,0.44,0.14);o.rotation.z=k*Math.PI/2;o.position.x=k*0.22;}
   const kn=s(this.mCol,bw);kn.scale.set(0.12,0.12,0.12);}
  this.gray=false;
 }
 shadeHex(h,a){const c=new T.Color(h);if(a>0)c.lerp(new T.Color(1,1,1),a);return '#'+c.getHexString();}
 setGray(g){
  if(g===this.gray)return;this.gray=g;
  for(const m of this.mats){const b=m.userData.base;if(g){const l=(b.r*0.3+b.g*0.59+b.b*0.11)*0.6;m.color.setRGB(l,l,l);}else m.color.copy(b);}
 }
 place(mesh,x,y,z,sx,sy,sz,rz){mesh.position.set(x,-y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.set(0,0,rz||0);mesh.visible=true;}
 seg(mesh,a,b,r){                       // cilindro entre dois pontos (a,b em pixels de tela, com z)
  const ax=a[0],ay=-a[1],bx=b[0],by=-b[1],dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy);
  if(L<0.5){mesh.visible=false;return;}
  mesh.visible=true;mesh.position.set((ax+bx)/2,(ay+by)/2,(a[2]+b[2])/2);mesh.scale.set(r,L,r);
  mesh.quaternion.setFromUnitVectors(UP,new T.Vector3(dx/L,dy/L,0));
 }
 ball(mesh,p,r){mesh.position.set(p[0],-p[1],p[2]);mesh.scale.set(r,r,r);mesh.rotation.set(0,0,0);mesh.visible=true;}
 update(k,map,t,seed){
  const P=i=>vis(k[i])>0.35?map(k[i]):null;
  const ls=P(11),rs=P(12);if(!ls||!rs){this.root.visible=false;return null;}
  this.root.visible=true;
  const C=this.C,sw=Math.max(14,Math.hypot(ls[0]-rs[0],ls[1]-rs[1])),R=sw*0.7,Wd=sw*0.25;
  const smid=[(ls[0]+rs[0])/2,(ls[1]+rs[1])/2];
  let lh=P(23),rh=P(24);const hipsSeen=!!(lh&&rh);
  let hmid=hipsSeen?[(lh[0]+rh[0])/2,(lh[1]+rh[1])/2]:[smid[0],smid[1]+sw*1.15];
  if(!hipsSeen){lh=[hmid[0]-sw*0.3,hmid[1]];rh=[hmid[0]+sw*0.3,hmid[1]];}
  let ux=smid[0]-hmid[0],uy=smid[1]-hmid[1];const tl=Math.hypot(ux,uy)||1;ux/=tl;uy/=tl;
  const Z=(p,z)=>[p[0],p[1],z];
  // pernas (curtinhas no estilo fofo; automáticas se a câmera não pega)
  const legPts=(hp,kn,an,side)=>{
   let K=P(kn),A=P(an);
   if(K){K=[hp[0]+(K[0]-hp[0])*0.82,hp[1]+(K[1]-hp[1])*0.82];A=A?[hp[0]+(A[0]-hp[0])*0.78,hp[1]+(A[1]-hp[1])*0.78]:[K[0]-ux*sw*0.36,K[1]-uy*sw*0.36];return [hp,K,A];}
   const b=Math.max(0,Math.sin(t*5+side*Math.PI))*Wd*0.3;
   return [hp,[hp[0]-ux*sw*0.42+side*Wd*0.15,hp[1]-uy*sw*0.42-b],[hp[0]-ux*sw*0.78+side*Wd*0.2,hp[1]-uy*sw*0.78-b]];
  };
  const L=[legPts(lh,25,27,-1),legPts(rh,26,28,1)];
  const zLeg=-sw*0.15,zArm=sw*0.45,zBody=0,zHead=sw*0.55;
  L.forEach((pts,i)=>{
   const g=this.legs[i];
   this.seg(g.up,Z(pts[0],zLeg),Z(pts[1],zLeg),Wd*1.12);this.ball(g.j0,Z(pts[0],zLeg),Wd*1.12);this.ball(g.j1,Z(pts[1],zLeg),Wd*1.12);
   this.seg(g.lo,Z(pts[1],zLeg),Z(pts[2],zLeg),Wd*1.05);this.ball(g.j2,Z(pts[2],zLeg),Wd*1.05);
   this.place(g.end,pts[2][0],pts[2][1]+Wd*0.35,zLeg+Wd*0.4,Wd*1.45,Wd*0.95,Wd*1.3);
   this.place(g.pad,pts[2][0],pts[2][1]+Wd*0.75,zLeg+Wd*1.2,Wd*0.8,Wd*0.25,Wd*0.4);
  });
  // chão
  const f0=L[0][2],f1=L[1][2],fy=Math.max(f0[1],f1[1])+Wd*1.0,fx=(f0[0]+f1[0])/2;
  this.place(this.shadow,fx,fy,-sw*2,sw*0.95,Wd*0.75,1);
  this.place(this.ring,fx,fy,-sw*1.9,sw*1.05,Wd*0.85,1);
  // rabo
  const tb=[hmid[0]-ux*tl*0.05+sw*0.28,hmid[1]-uy*tl*0.05],sway=Math.sin(t*3+seed)*0.35,zT=-sw*0.45;
  const tc=C.tail,tp=this.tail;
  if(tc==='short')this.place(tp[0],tb[0]+Wd*0.3,tb[1],zT,Wd*0.8,Wd*0.7,Wd*0.7);
  else if(tc==='pom')this.place(tp[0],tb[0]+Wd*0.4,tb[1],zT,Wd,Wd,Wd);
  else if(tc==='wag'||tc==='long'||tc==='tuft'){
   let p=tb,a=tc==='wag'?-0.7+Math.sin(t*10)*0.55:tc==='tuft'?0.35:0.25+sway;const n=tp.length>>1,len=tc==='wag'?sw*0.28:sw*(tc==='tuft'?0.26:0.22),r=tc==='tuft'?Wd*0.2:Wd*0.36;
   for(let i=0;i<n;i++){const q=[p[0]+Math.cos(a)*len,p[1]+Math.sin(a)*len];this.seg(tp[i*2],Z(p,zT),Z(q,zT),r);this.ball(tp[i*2+1],Z(q,zT),r);p=q;a-=tc==='long'?0.6:tc==='tuft'?-0.4:0.1;}
   if(tc==='tuft'){const e=tp[tp.length-1];this.ball(e,Z(p,zT),Wd*0.6);}
  }
  else if(tc==='fluffy'){const a=-0.5+sway*0.6;this.place(tp[0],tb[0]+Math.cos(a)*sw*0.45,tb[1]+Math.sin(a)*sw*0.45,zT,sw*0.52,sw*0.27,sw*0.27,-a);this.place(tp[1],tb[0]+Math.cos(a)*sw*0.88,tb[1]+Math.sin(a)*sw*0.88,zT+2,sw*0.17,sw*0.14,sw*0.14,-a);}
  else if(tc==='dino'){const a=0.35+sway*0.3;this.place(tp[0],tb[0]+Math.cos(a)*sw*0.5,tb[1]+Math.sin(a)*sw*0.5,zT,sw*0.26,sw*1.1,sw*0.26,-(a)-Math.PI/2);
   for(let i=1;i<4;i++){const d=sw*(0.2+i*0.25);this.place(tp[i],tb[0]+Math.cos(a)*d+Math.sin(a)*sw*0.2,tb[1]+Math.sin(a)*d-Math.cos(a)*sw*0.2,zT-2,sw*0.1,sw*0.2,sw*0.1,-a);}}
  // corpo
  const bc=[(smid[0]+hmid[0])/2+ux*tl*0.02,(smid[1]+hmid[1])/2+uy*tl*0.02],rot=-(Math.atan2(uy,ux)+Math.PI/2),bry=Math.max(sw*0.68,tl*0.64);
  this.place(this.body,bc[0],bc[1],zBody,sw*0.74,bry,sw*0.6,rot);
  this.place(this.belly,bc[0]-ux*tl*0.07,bc[1]-uy*tl*0.07,zBody+sw*0.32,sw*0.46,bry*0.68,sw*0.32,rot);
  this.stripes.forEach((m,i)=>{const sd=i<2?-1:1,yy=(i%2?0.15:-0.2)*bry;this.place(m,bc[0]+sd*sw*0.62,bc[1]+yy,zBody+sw*0.3,Wd*0.25,Wd*0.6,Wd*0.2,sd*0.5);});
  // cachecol
  if(this.scarf){const o=[-ux*sw*0.12,-uy*sw*0.12],zs=sw*0.5,a=[ls[0]+o[0],ls[1]+o[1]],b=[rs[0]+o[0],rs[1]+o[1]];
   this.seg(this.scarf.a,Z(a,zs),Z(b,zs),Wd*0.6);this.ball(this.scarf.b,Z(a,zs),Wd*0.6);this.ball(this.scarf.c,Z(b,zs),Wd*0.6);
   const s0=[a[0]+(b[0]-a[0])*0.28,a[1]+(b[1]-a[1])*0.28],s1=[s0[0]-ux*sw*0.42+Math.sin(t*4+seed)*Wd*0.5,s0[1]-uy*sw*0.42];
   this.seg(this.scarf.d,Z(s0,zs+2),Z(s1,zs+2),Wd*0.4);this.ball(this.scarf.e,Z(s1,zs+2),Wd*0.4);}
  // braços
  const arm=(i,s,el,wr)=>{
   const g=this.arms[i],E=P(el),Wr=P(wr);
   if(!E){for(const m of Object.values(g))m.visible=false;return;}
   this.seg(g.up,Z(s,zArm),Z(E,zArm),Wd*0.95);this.ball(g.j0,Z(s,zArm),Wd*0.95);this.ball(g.j1,Z(E,zArm),Wd*0.95);
   if(Wr){this.seg(g.lo,Z(E,zArm),Z(Wr,zArm),Wd*0.9);this.ball(g.j2,Z(Wr,zArm),Wd*0.9);this.ball(g.end,Z(Wr,zArm+2),Wd*1.2);this.place(g.pad,Wr[0]+Wd*0.1,Wr[1]+Wd*0.2,zArm+Wd*1.1,Wd*0.5,Wd*0.38,Wd*0.2);}
   else{g.lo.visible=g.j2.visible=g.end.visible=g.pad.visible=false;}
  };
  arm(0,ls,13,15);arm(1,rs,14,16);
  // cabeça
  const nose=P(0);
  const hc=nose?[nose[0]+ux*R*0.12,nose[1]+uy*R*0.12]:[smid[0]+ux*R,smid[1]+uy*R];
  let tilt=Math.atan2(rs[1]-ls[1],rs[0]-ls[0]);if(Math.abs(tilt)>Math.PI/2)tilt-=Math.PI*Math.sign(tilt);
  this.head.position.set(hc[0],-hc[1],zHead);this.head.scale.set(R,R,R);this.head.rotation.set(0,0,-tilt*0.8);
  const es=Math.sin(t*2.2+seed)*0.12;
  if(this.longEars)for(const [o,i2,k] of this.longEars){o.position.set(k*(0.4+es*0.5),1.3,-0.05);o.rotation.z=-k*(0.12+es);i2.position.set(k*(0.4+es*0.5),1.28,0.1);i2.rotation.z=-k*(0.12+es);}
  for(const [o,k] of this.floppy)o.rotation.z=k*(0.25+es);
  const blink=((t+seed*1.3)%3.7)<0.13;
  for(const [e,h1,h2] of this.eyes){e.scale.y=blink?0.02:0.17;h1.visible=h2.visible=!blink;}
  const top=C.ear==='long'?R*2.2:C.ear==='pointy'?R*1.65:C.mane?R*1.45:R*1.25;
  return {hx:hc[0],hy:hc[1],top,R};
 }
 dispose(){
  scene.remove(this.root);
  for(const m of this.mats)m.dispose();
  [this.mEye,this.mWhite,this.mCheek,this.mMouth,this.mTongue,this.shadow.material,this.ring.material].forEach(m=>m.dispose());
 }
}

function frame(list,map,t){
 if(!ok)return [];
 const seen=new Set(),out=[];
 for(const p of list){
  seen.add(p.c);
  let ch=chars[p.c];
  if(!ch||ch.id!==p.id||ch.col!==p.col){if(ch)ch.dispose();ch=chars[p.c]=new Char(p.id,p.col);}
  if(!p.k||p.hidden){ch.root.visible=false;continue;}
  ch.setGray(!!p.gray);
  const r=ch.update(p.k,map,t/1000,p.c);
  if(r){r.c=p.c;out.push(r);}
 }
 for(const c in chars)if(!seen.has(+c))chars[c].root.visible=false;
 renderer.render(scene,cam);
 return out;
}
function clear(){if(!ok)return;for(const c in chars)chars[c].root.visible=false;renderer.render(scene,cam);}

global.Fofo3D={init,resize,frame,clear,get ok(){return ok;}};
})(typeof window!=='undefined'?window:globalThis);
