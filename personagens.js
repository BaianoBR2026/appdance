// Personagens "fofinhos 3D" do AppDance (desenho 2.5D leve: volume com degradê, brilho e sombra).
// drawCute(g, k, map, id, corDoJogador, {t, label, gray, alpha, seed})
//  g   = contexto 2D do canvas
//  k   = esqueleto: array de 33 pontos {x,y,v} (MediaPipe), pode ter null
//  map = função ponto -> [xTela, yTela]
(function(global){
const CUTE={
 urso:    {nome:'Ursinho Mel',       fur:'#b5753c',belly:'#f3d9b1',ear:'round', earIn:'#e9b98a',muzzle:'#f3d9b1',nose:'#3b2416',tail:'short'},
 panda:   {nome:'Panda Bambu',       fur:'#f7f7f5',limb:'#2d2d33',belly:'#ffffff',ear:'round',earCol:'#2d2d33',earIn:'#2d2d33',patch:'#2d2d33',muzzle:'#ffffff',nose:'#1f1f24',tail:'short'},
 coelho:  {nome:'Coelhinha Lili',    fur:'#f6eef3',belly:'#ffffff',ear:'long',  earIn:'#f6a8c2',muzzle:'#ffffff',nose:'#f06292',bow:true,tail:'pom'},
 cachorro:{nome:'Cachorrinho Bolota',fur:'#e3ad72',belly:'#fbe9cf',ear:'floppy',earCol:'#9a6233',muzzle:'#fbe9cf',nose:'#2a1a10',eyeSpot:'#9a6233',tail:'wag',tongue:true},
 gato:    {nome:'Gatinho Tigre',     fur:'#f5a04a',belly:'#fdebcc',ear:'pointy',earIn:'#f7b3a3',muzzle:'#fdebcc',nose:'#e8798a',stripes:'#c8661c',tail:'long',whiskers:true},
 raposa:  {nome:'Raposinha Fifi',    fur:'#ee7a32',belly:'#fff4e8',ear:'pointy',earIn:'#3a2418',muzzle:'#fff4e8',nose:'#2a1a10',sock:'#4a2c1c',tail:'fluffy'},
 leao:    {nome:'Leãozinho Juba',    fur:'#f3b84f',belly:'#fbe5b5',ear:'round', earIn:'#e39a3a',muzzle:'#fbe5b5',nose:'#6b3a1f',mane:'#c96a22',tail:'tuft'},
 dino:    {nome:'Dino Bob',          fur:'#6cc35b',belly:'#e9f6b6',ear:null,   spikes:'#f6a33b',nose:null,tail:'dino'}
};
const LX=-0.55,LY=-0.83;                                   // luz vindo de cima à esquerda
function rgb(h){const n=parseInt(h.slice(1),16);return [n>>16,(n>>8)&255,n&255];}
const shadeCache={};
function shade(h,a){const key=h+a;if(shadeCache[key])return shadeCache[key];let [r,g,b]=rgb(h);if(a>=0){r+=(255-r)*a;g+=(255-g)*a;b+=(255-b)*a;}else{r*=1+a;g*=1+a;b*=1+a;}return shadeCache[key]='rgb('+(r|0)+','+(g|0)+','+(b|0)+')';}
function vis(p){return !p?0:(p.v!==undefined?p.v:(p.visibility===undefined?1:p.visibility));}
// bola/oval com volume
function blob(g,x,y,rx,ry,rot,base,line){
 rx=Math.max(1,rx);ry=Math.max(1,ry);
 const gr=g.createRadialGradient(x+LX*rx*0.42,y+LY*ry*0.42,Math.min(rx,ry)*0.08,x,y,Math.max(rx,ry)*1.08);
 gr.addColorStop(0,shade(base,0.5));gr.addColorStop(0.5,base);gr.addColorStop(1,shade(base,-0.3));
 g.fillStyle=gr;g.beginPath();g.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2);g.fill();
 if(line!==false){g.strokeStyle=shade(base,-0.5);g.lineWidth=Math.max(1.5,Math.min(rx,ry)*0.07);g.stroke();}
}
// braço/perna lisinho, sem emenda, com volume (contorno, sombra, cor, brilho)
function limb(g,pts,w,base){
 const path=()=>{g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);};
 path();g.strokeStyle=shade(base,-0.52);g.lineWidth=w*2+Math.max(3,w*0.28);g.stroke();
 path();g.strokeStyle=shade(base,-0.2);g.lineWidth=w*2;g.stroke();
 g.save();g.translate(LX*w*0.28,LY*w*0.28);path();g.strokeStyle=base;g.lineWidth=w*1.4;g.stroke();
 g.translate(LX*w*0.28,LY*w*0.28);path();g.globalAlpha*=0.65;g.strokeStyle=shade(base,0.42);g.lineWidth=w*0.5;g.stroke();g.restore();
}
function tri(g,pts,base){
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 const gr=g.createLinearGradient(Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys));
 gr.addColorStop(0,shade(base,0.38));gr.addColorStop(1,shade(base,-0.25));
 g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();
 g.fillStyle=gr;g.fill();g.strokeStyle=shade(base,-0.5);g.lineWidth=2;g.stroke();
}
const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

function drawCute(g,k,map,id,col,opt){
 const C=CUTE[id]||CUTE.urso;if(!k)return;opt=opt||{};
 const P=i=>vis(k[i])>0.35?map(k[i]):null;
 const ls=P(11),rs=P(12);if(!ls||!rs)return;
 const t=(opt.t!==undefined?opt.t:performance.now())/1000,seed=opt.seed||0;
 g.save();
 if(opt.alpha)g.globalAlpha=opt.alpha;
 if(opt.gray)g.filter='grayscale(1) brightness(.65)';
 g.lineCap='round';g.lineJoin='round';
 const sw=Math.max(14,dist(ls,rs)),smid=mid(ls,rs);
 let lh=P(23),rh=P(24);
 const hipsSeen=!!(lh&&rh);
 let hmid=hipsSeen?mid(lh,rh):[smid[0],smid[1]+sw*1.15];
 if(!hipsSeen){lh=[hmid[0]-sw*0.3,hmid[1]];rh=[hmid[0]+sw*0.3,hmid[1]];}
 let ux=smid[0]-hmid[0],uy=smid[1]-hmid[1];const tl=Math.hypot(ux,uy)||1;ux/=tl;uy/=tl;   // "para cima" do corpo
 const R=sw*0.7,W=sw*0.25,lc=C.limb||C.fur,sock=C.sock||lc;
 // pernas: as reais, ou pernas curtinhas automáticas quando a câmera não pega
 const legPts=(hp,kn,an,side)=>{
  let K=P(kn),A=P(an);
  // pernas um pouco mais curtinhas que as reais (estilo fofinho)
  if(K){K=[hp[0]+(K[0]-hp[0])*0.82,hp[1]+(K[1]-hp[1])*0.82];if(A)A=[hp[0]+(A[0]-hp[0])*0.78,hp[1]+(A[1]-hp[1])*0.78];return A?[hp,K,A]:[hp,K];}
  const bounce=Math.max(0,Math.sin(t*5+side*Math.PI))*W*0.3;
  return [hp,[hp[0]-ux*sw*0.42+side*W*0.15,hp[1]-uy*sw*0.42-bounce],[hp[0]-ux*sw*0.78+side*W*0.2,hp[1]-uy*sw*0.78-bounce]];
 };
 const L1=legPts(lh,25,27,-1),L2=legPts(rh,26,28,1);
 const feet=[L1[L1.length-1],L2[L2.length-1]];
 // sombra + anel com a cor do jogador
 const fy=Math.max(feet[0][1],feet[1][1])+W*1.0,fx=(feet[0][0]+feet[1][0])/2;
 g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(fx,fy,sw*0.95,W*0.75,0,0,Math.PI*2);g.fill();
 g.strokeStyle=col;g.globalAlpha*=0.85;g.lineWidth=Math.max(3,W*0.3);g.beginPath();g.ellipse(fx,fy,sw*1.05,W*0.85,0,0,Math.PI*2);g.stroke();g.globalAlpha/=0.85;
 // rabo (atrás)
 const tb=[hmid[0]-ux*tl*0.05+sw*0.28,hmid[1]-uy*tl*0.05],sway=Math.sin(t*3+seed)*0.35;
 if(C.tail==='short')blob(g,tb[0]+W*0.3,tb[1],W*0.8,W*0.7,0,C.fur);
 else if(C.tail==='pom')blob(g,tb[0]+W*0.4,tb[1],W*1.0,W*1.0,0,'#ffffff');
 else if(C.tail==='wag'){const a=-0.7+Math.sin(t*10)*0.55;limb(g,[tb,[tb[0]+Math.cos(a)*sw*0.55,tb[1]+Math.sin(a)*sw*0.55]],W*0.38,C.fur);}
 else if(C.tail==='long'){const pts=[tb];let p=tb,a=0.25+sway;for(let i=0;i<4;i++){p=[p[0]+Math.cos(a)*sw*0.22,p[1]+Math.sin(a)*sw*0.22];pts.push(p);a-=0.6;}limb(g,pts,W*0.36,C.fur);
  g.save();g.strokeStyle=C.stripes;g.lineWidth=W*0.3;for(let i=1;i<4;i++){const q=pts[i];g.beginPath();g.arc(q[0],q[1],W*0.3,0,Math.PI);g.stroke();}g.restore();}
 else if(C.tail==='fluffy'){g.save();g.translate(tb[0],tb[1]);g.rotate(-0.5+sway*0.6);blob(g,sw*0.45,0,sw*0.52,sw*0.27,0,C.fur);blob(g,sw*0.88,0,sw*0.17,sw*0.14,0,'#fff8ef');g.restore();}
 else if(C.tail==='tuft'){const e=[tb[0]+sw*0.5,tb[1]+sw*0.15+Math.sin(t*3)*sw*0.1];limb(g,[tb,e],W*0.2,C.fur);blob(g,e[0],e[1],W*0.6,W*0.6,0,C.mane);}
 else if(C.tail==='dino'){g.save();g.translate(tb[0]-sw*0.1,tb[1]+sw*0.1);g.rotate(0.35+sway*0.3);
  for(let i=0;i<3;i++)tri(g,[[sw*(0.2+i*0.25),-sw*(0.2-i*0.04)],[sw*(0.32+i*0.25),-sw*(0.38-i*0.06)],[sw*(0.44+i*0.25),-sw*(0.16-i*0.04)]],C.spikes);
  g.beginPath();g.moveTo(0,-sw*0.27);g.quadraticCurveTo(sw*0.6,-sw*0.27,sw*1.1,0);g.quadraticCurveTo(sw*0.6,sw*0.22,0,sw*0.24);g.closePath();
  const gr=g.createLinearGradient(0,-sw*0.27,0,sw*0.24);gr.addColorStop(0,shade(C.fur,0.38));gr.addColorStop(1,shade(C.fur,-0.3));g.fillStyle=gr;g.fill();g.strokeStyle=shade(C.fur,-0.5);g.lineWidth=2;g.stroke();g.restore();}
 // pernas e pés
 for(const L of [L1,L2]){
  if(sock!==lc&&L.length===3){limb(g,[L[0],L[1]],W*1.15,lc);limb(g,[L[1],L[2]],W*1.05,sock);}
  else limb(g,L,W*1.1,lc);
  const A=L[L.length-1];
  blob(g,A[0],A[1]+W*0.35,W*1.45,W*0.95,0,sock);
  g.globalAlpha*=0.55;blob(g,A[0],A[1]+W*0.8,W*0.8,W*0.25,0,shade(sock,0.35),false);g.globalAlpha/=0.55;
 }
 // corpo gordinho + barriga
 const bc=[(smid[0]+hmid[0])/2+ux*tl*0.02,(smid[1]+hmid[1])/2+uy*tl*0.02],rot=Math.atan2(uy,ux)+Math.PI/2;
 const bry=Math.max(sw*0.68,tl*0.64);
 blob(g,bc[0],bc[1],sw*0.74,bry,rot,C.fur);
 blob(g,bc[0]-ux*tl*0.07,bc[1]-uy*tl*0.07,sw*0.46,bry*0.68,rot,C.belly,false);
 if(C.stripes){g.save();g.translate(bc[0],bc[1]);g.rotate(rot);g.strokeStyle=C.stripes;g.lineWidth=W*0.32;
  for(const s of [-1,1])for(const y of [-0.28,0.02,0.3]){g.beginPath();g.moveTo(s*sw*0.72,y*bry);g.lineTo(s*sw*0.5,y*bry+bry*0.08);g.stroke();}g.restore();}
 // cachecol com a cor do jogador (a coelhinha usa laço)
 if(!C.bow){const o=[-ux*sw*0.12,-uy*sw*0.12];
  limb(g,[[ls[0]+o[0],ls[1]+o[1]],[rs[0]+o[0],rs[1]+o[1]]],W*0.6,col);
  const s0=[ls[0]+o[0]+(rs[0]-ls[0])*0.28,ls[1]+o[1]+(rs[1]-ls[1])*0.28];
  limb(g,[s0,[s0[0]-ux*sw*0.42+Math.sin(t*4+seed)*W*0.5,s0[1]-uy*sw*0.42]],W*0.4,col);}
 // braços e patinhas
 const arm=(s,el,wr)=>{
  const E=P(el),Wr=P(wr);if(!E)return;
  if(Wr){if(sock!==lc){limb(g,[s,E],W*0.95,lc);limb(g,[E,Wr],W*0.9,sock);}else limb(g,[s,E,Wr],W*0.93,lc);
   blob(g,Wr[0],Wr[1],W*1.2,W*1.15,0,sock);
   g.globalAlpha*=0.5;blob(g,Wr[0]-W*0.3,Wr[1]-W*0.35,W*0.42,W*0.26,-0.6,shade(sock,0.7),false);g.globalAlpha/=0.5;}
  else limb(g,[s,E],W*0.95,lc);
 };
 arm(ls,13,15);arm(rs,14,16);
 // cabeça grandona
 const nose=P(0);
 const hc=nose?[nose[0]+ux*R*0.12,nose[1]+uy*R*0.12]:[smid[0]+ux*R*1.0,smid[1]+uy*R*1.0];
 let tilt=Math.atan2(rs[1]-ls[1],rs[0]-ls[0]);if(Math.abs(tilt)>Math.PI/2)tilt-=Math.PI*Math.sign(tilt);
 g.save();g.translate(hc[0],hc[1]);g.rotate(tilt*0.8);
 if(C.mane){for(let i=0;i<14;i++){const a=i/14*Math.PI*2;blob(g,Math.cos(a)*R*1.0,Math.sin(a)*R*0.95,R*0.36,R*0.36,0,C.mane,false);}blob(g,0,0,R*1.12,R*1.05,0,C.mane);}
 const ec=C.earCol||C.fur,es=Math.sin(t*2.2+seed)*0.12;
 if(C.ear==='round'){for(const s of [-1,1]){blob(g,s*R*0.72,-R*0.7,R*0.34,R*0.34,0,ec);blob(g,s*R*0.72,-R*0.68,R*0.19,R*0.19,0,C.earIn,false);}}
 else if(C.ear==='pointy'){for(const s of [-1,1]){tri(g,[[s*R*0.22,-R*0.78],[s*R*(0.8+es*0.3),-R*1.48],[s*R*0.96,-R*0.35]],ec);tri(g,[[s*R*0.42,-R*0.74],[s*R*(0.78+es*0.3),-R*1.24],[s*R*0.83,-R*0.5]],C.earIn);}}
 else if(C.ear==='long'){for(const s of [-1,1]){const a=[s*R*0.32,-R*0.72],b=[s*R*(0.5+es),-R*1.9];limb(g,[a,b],R*0.22,C.fur);limb(g,[[a[0],a[1]-R*0.12],[b[0],b[1]+R*0.08]],R*0.1,C.earIn);}}
 if(C.spikes){for(let i=-1;i<=1;i++)tri(g,[[i*R*0.4-R*0.17,-R*0.84],[i*R*0.4,-R*1.22+Math.abs(i)*R*0.1],[i*R*0.4+R*0.17,-R*0.84]],C.spikes);}
 blob(g,0,0,R,R*0.93,0,C.fur);
 if(C.stripes){g.fillStyle=C.stripes;for(const x of [-0.22,0,0.22]){g.beginPath();g.moveTo(x*R-R*0.06,-R*0.9);g.lineTo(x*R+R*0.06,-R*0.9);g.lineTo(x*R,-R*0.6);g.closePath();g.fill();}}
 if(C.patch){g.fillStyle=C.patch;for(const s of [-1,1]){g.beginPath();g.ellipse(s*R*0.36,-R*0.02,R*0.25,R*0.31,s*-0.5,0,Math.PI*2);g.fill();}}
 if(C.eyeSpot){g.fillStyle=C.eyeSpot;g.beginPath();g.ellipse(R*0.38,-R*0.08,R*0.28,R*0.31,0.3,0,Math.PI*2);g.fill();}
 if(C.ear==='floppy'){for(const s of [-1,1]){g.save();g.translate(s*R*0.82,-R*0.35);g.rotate(s*(0.25+es));blob(g,0,R*0.32,R*0.28,R*0.52,0,ec);g.restore();}}
 if(C.muzzle)blob(g,0,R*0.34,R*0.46,R*0.32,0,C.muzzle,false);
 else blob(g,0,R*0.32,R*0.5,R*0.3,0,shade(C.fur,0.25),false);
 // brilho na cabeça
 g.globalAlpha*=0.3;g.fillStyle='#fff';g.beginPath();g.ellipse(-R*0.38,-R*0.5,R*0.3,R*0.15,-0.55,0,Math.PI*2);g.fill();g.globalAlpha/=0.3;
 // olhos (piscam de vez em quando)
 const blink=((t+seed*1.3)%3.7)<0.13;
 for(const s of [-1,1]){
  const ex=s*R*0.36,ey=-R*0.04;
  if(blink){g.strokeStyle='#1a1410';g.lineWidth=Math.max(2,R*0.06);g.beginPath();g.arc(ex,ey,R*0.11,0.2,Math.PI-0.2);g.stroke();continue;}
  if(C.patch){g.fillStyle='#fff';g.beginPath();g.ellipse(ex,ey,R*0.17,R*0.2,0,0,Math.PI*2);g.fill();}
  g.fillStyle='#1a1410';g.beginPath();g.ellipse(ex,ey,R*0.14,R*0.17,0,0,Math.PI*2);g.fill();
  g.fillStyle='#fff';g.beginPath();g.arc(ex-R*0.05,ey-R*0.065,R*0.058,0,Math.PI*2);g.fill();
  g.beginPath();g.arc(ex+R*0.045,ey+R*0.055,R*0.027,0,Math.PI*2);g.fill();
 }
 // bochechas
 g.fillStyle='rgba(255,110,145,.4)';for(const s of [-1,1]){g.beginPath();g.ellipse(s*R*0.6,R*0.25,R*0.15,R*0.095,0,0,Math.PI*2);g.fill();}
 // nariz
 if(C.nose){g.fillStyle=C.nose;g.beginPath();g.ellipse(0,R*0.2,R*0.12,R*0.085,0,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.arc(-R*0.04,R*0.17,R*0.03,0,Math.PI*2);g.fill();}
 else{g.fillStyle=shade(C.fur,-0.5);for(const s of [-1,1]){g.beginPath();g.arc(s*R*0.12,R*0.22,R*0.035,0,Math.PI*2);g.fill();}}
 // sorriso aberto
 g.fillStyle='#7a2230';g.beginPath();g.moveTo(-R*0.15,R*0.33);g.quadraticCurveTo(0,R*0.6,R*0.15,R*0.33);g.closePath();g.fill();
 g.fillStyle='#f472b6';g.beginPath();g.ellipse(0,R*0.45,R*0.08,R*0.05,0,0,Math.PI*2);g.fill();
 if(C.tongue){g.fillStyle='#f472b6';g.beginPath();g.ellipse(0,R*0.52,R*0.085,R*0.11,0,0,Math.PI*2);g.fill();}
 if(C.whiskers){g.strokeStyle='rgba(60,30,10,.7)';g.lineWidth=1.5;g.beginPath();for(const s of [-1,1])for(const dy of [0.26,0.38]){g.moveTo(s*R*0.42,R*dy);g.lineTo(s*R*0.98,R*(dy-0.06));}g.stroke();}
 if(C.bow){g.save();g.translate(R*0.55,-R*0.72);g.rotate(0.3);tri(g,[[0,0],[-R*0.44,-R*0.26],[-R*0.44,R*0.26]],col);tri(g,[[0,0],[R*0.44,-R*0.26],[R*0.44,R*0.26]],col);blob(g,0,0,R*0.12,R*0.12,0,col);g.restore();}
 g.restore();
 // etiqueta J1/J2/J3
 if(opt.label){
  const top=C.ear==='long'?R*2.2:C.ear==='pointy'?R*1.65:C.mane?R*1.45:R*1.25;
  const lx=hc[0],ly=hc[1]-top-R*0.25,s=Math.max(13,R*0.36);
  g.font='800 '+s+'px "Baloo 2",system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
  const w=g.measureText(opt.label).width+s*0.9;
  g.fillStyle=col;g.beginPath();if(g.roundRect)g.roundRect(lx-w/2,ly-s*0.68,w,s*1.36,s*0.68);else g.rect(lx-w/2,ly-s*0.68,w,s*1.36);g.fill();
  g.fillStyle='#14102a';g.fillText(opt.label,lx,ly);
 }
 g.restore();
}
global.CUTE=CUTE;global.drawCute=drawCute;
})(typeof window!=='undefined'?window:globalThis);
