/* T-ARCH scale story (2D fallback: no WebGL / reduced motion). 4 captions over 8 states, same scroll timeline as the 3D bundle:
   01 signal -> equipment | 02 existing controls -> T-ARCH EDGE | 03 building -> cloud check/rule | 04 buildings -> today (dashboard) */
window.startArch2D=()=>{
const sec=document.getElementById('scale'); if(!sec) return;
const cv=sec.querySelector('canvas'), cx=cv.getContext('2d');
const caps=[...sec.querySelectorAll('.sc-cap')], bar=sec.querySelector('.sc-bar i'), idx=sec.querySelector('.sc-idx b'), dash=sec.querySelector('.sc-dash');
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
// same timeline as arch3d.bundle.js: each caption = 1.8 units (hold, A->B, hold, half hand-off); captions switch mid hand-off
const SEG=[[0,0,.45],[0,1,.9],[1,1,.2],[1,2,.5],[2,2,.2],[2,3,.9],[3,3,.2],[3,4,.5],[4,4,.2],[4,5,.9],[5,5,.2],[5,6,.5],[6,6,.2],[6,7,.9],[7,7,.45]], UT=7.2, CAPU=1.8;
const timeline=u=>{let acc=0;for(const [a,b,len] of SEG){if(u<=acc+len){const f=Math.min(1,Math.max(0,(u-acc)/len));return a+(b-a)*(f*f*(3-2*f));}acc+=len;}return 7;};

const N=1600;
let rs=1; const rnd=()=>{rs=(rs*16807)%2147483647;return (rs-1)/2147483646;};
const C30=Math.cos(Math.PI/6), S30=0.5;
const iso=(x,y,z)=>[(x-y)*C30,(x+y)*S30-z];
function edgesOfBox(x0,x1,y0,y1,z0,z1,which){ // returns list of segments in iso
  const P=(x,y,z)=>iso(x,y,z), s=[];
  const b=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  for(let i=0;i<4;i++){const a=b[i],c=b[(i+1)%4];
    if(which!=='top') s.push([P(a[0],a[1],z0),P(c[0],c[1],z0)]);
    s.push([P(a[0],a[1],z1),P(c[0],c[1],z1)]);
    s.push([P(a[0],a[1],z0),P(a[0],a[1],z1)]);}
  return s;
}
function onSegs(segs,n){ // spread n points along segments by length
  const L=segs.map(([a,b])=>Math.hypot(b[0]-a[0],b[1]-a[1])), T=L.reduce((p,c)=>p+c,0), out=[];
  for(let i=0;i<n;i++){let u=(i+rnd()*.6)/n*T,k=0;while(k<segs.length-1&&u>L[k]){u-=L[k];k++;}
    const t=Math.min(1,u/L[k]),[a,b]=segs[k];out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  return out;
}
const tr=(pts,dx,dy,s)=>pts.map(p=>[p[0]*s+dx,p[1]*s+dy]);
// stage targets: X,Y (Float32), CL (Uint8: 0 dim,1 green,2 white,3 hidden), FL flow params
const st=[];
function stage(){return {x:new Float32Array(N),y:new Float32Array(N),c:new Uint8Array(N),f:null,labels:[]};}
function fill(s,arr,from,cls){for(let i=0;i<arr.length&&from+i<N;i++){s.x[from+i]=arr[i][0];s.y[from+i]=arr[i][1];s.c[from+i]=cls;}return from+arr.length;}
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
// 0 one signal
{const s=stage();for(let i=0;i<N;i++){const a=rnd()*6.283,r=i<14?rnd()*.012:0;s.x[i]=Math.cos(a)*r;s.y[i]=Math.sin(a)*r;s.c[i]=i<14?1:3;}
 s.labels=[[ '관제점 1개', 0, .12,'center']]; st.push(s);}
// 1 equipment (AHU)
function ahu(){return edgesOfBox(-.62,.62,-.26,.26,0,.42).concat(edgesOfBox(.18,.44,-.11,.11,.42,.86,'top'));}
{const s=stage();const segs=ahu();let k=fill(s,tr(onSegs(segs,1380),0,.28,1),0,2);
 const sens=[];for(let i=0;i<N-k;i++){const x=-.55+rnd()*1.1,z=.06+rnd()*.32;sens.push(iso(x,.26,z));}
 fill(s,tr(sens,0,.28,1),k,1);
 for(let i=k+40;i<N;i++)s.c[i]=3;
 s.labels=[['공조기 1대 · 관제점 수십 개',0,.74,'center']]; st.push(s);}
// 2 EDGE
{const s=stage();let k=fill(s,tr(onSegs(ahu(),560),-.78,.12,.42),0,0);
 const dev=edgesOfBox(-.2,.2,-.13,.13,0,.12);k=fill(s,tr(onSegs(dev,420),.62,.06,1),k,2);
 const led=[];for(let i=0;i<24;i++){const p=iso(.2,-.1+i*.008,.06);led.push(p);}k=fill(s,tr(led,.62,.06,1),k,1);
 const fl=[];s.f=new Float32Array(N);const flowStart=k;
 for(let i=k;i<N;i++){s.f[i]=rnd();s.c[i]=1;}
 s.flow={a:[-.42,.08],b:[.4,.08],from:flowStart,spread:.03};
 s.labels=[['방재실 중앙감시',-.78,.42,'center'],['T-ARCH EDGE',.62,.34,'center'],['읽기만 →  15분마다',0,-.04,'center']];
 const s2=Object.assign({},s,{labels:[['기계실 자동제어반',-.78,.42,'center'],['방재실 중앙감시',.62,.34,'center'],['→',0,-.04,'center']]}); st.push(s2); st.push(s);}
// 3 building (312 green points)
{const s=stage();const segs=[];const W=.34,H=1.25;
 for(let f=0;f<=12;f++){const z=f/12*H;const b=[[-W,-W],[W,-W],[W,W],[-W,W]];for(let i=0;i<4;i++){const a=b[i],c=b[(i+1)%4];segs.push([iso(a[0],a[1],z),iso(c[0],c[1],z)]);}}
 for(const [x,y] of [[-W,-W],[W,-W],[W,W],[-W,W]])segs.push([iso(x,y,0),iso(x,y,H)]);
 let k=fill(s,tr(onSegs(segs,N-312),0,.6,1),0,2);
 const g=[];for(let i=0;i<312;i++){const face=i%2,u=-W+rnd()*2*W,z=.03+rnd()*(H-.06);g.push(face?iso(W,u,z):iso(u,W,z));}
 fill(s,tr(g,0,.6,1),k,1);
 s.labels=[['관제점 312개 · 인천 복합시설',0,.9,'center']]; st.push(s);}
// 4 cloud: three planes
{const s=stage();const segs=[],planes=[[-.42,'믿을 수 있는 값인지 확인'],[-.02,'규칙으로 판정'],[.38,'근거와 함께 보고']];
 const R=.52;let k=0;
 planes.forEach(([z,lab],pi)=>{const ring=[[-R,-R],[R,-R],[R,R],[-R,R]],sg=[];for(let i=0;i<4;i++){const a=ring[i],c=ring[(i+1)%4];sg.push([iso(a[0],a[1],z),iso(c[0],c[1],z)]);}
   for(let j=1;j<4;j++){const v=-R+j*R/2;sg.push([iso(-R,v,z),iso(R,v,z)]);sg.push([iso(v,-R,z),iso(v,R,z)]);}
   k=fill(s,tr(onSegs(sg,330),0,.05,1),k,pi===2?1:2);});
 s.f=new Float32Array(N);for(let i=k;i<N;i++){s.f[i]=rnd();s.c[i]=1;}
 s.flow={a:[0,.98],b:[0,.47],from:k,spread:.22,fan:true};
 s.labels=[['믿을 수 있는 값인지 확인',.64,.47,'left'],['규칙으로 판정',.64,.07,'left'],['근거와 함께 보고',.64,-.33,'left'],['여러 건물의 EDGE',0,1.04,'center']]; st.push(s);}
// 5 city: 6x6 towers, 5 lit
{const s=stage();const per=Math.floor(N/36);let k=0;const lit=new Set([7,15,20,26,32]);
 for(let gx=0;gx<6;gx++)for(let gy=0;gy<6;gy++){const id=gx*6+gy,h=.1+rnd()*.32+(id===20?.2:0),cxw=(gx-2.5)*.2,cyw=(gy-2.5)*.2,w=.06;
   const sg=edgesOfBox(cxw-w,cxw+w,cyw-w,cyw+w,0,h,'top');k=fill(s,tr(onSegs(sg,per),0,.18,1.05),k,lit.has(id)?1:0);}
 for(let i=k;i<N;i++){s.x[i]=0;s.y[i]=.18;s.c[i]=3;}
 s.labels=[['지금 · 5곳 실증 중',0,.82,'center']]; st.push(s);}
// 7 today (Korea/vision state removed: the Vision section below carries it): scatter dim + 3 bright rows
{const s=stage();for(let i=0;i<N;i++){const a=rnd()*6.283,r=.25+Math.pow(rnd(),.7)*.95;s.x[i]=Math.cos(a)*r*1.3;s.y[i]=Math.sin(a)*r*.8;s.c[i]=0;}
 let k=0;for(let row=0;row<3;row++){for(let j=0;j<46;j++){s.x[k]=-.32+j*.014;s.y[k]=-.16+row*.16;s.c[k]=row===0?1:2;k++;}
   for(let j=0;j<6;j++){s.x[k]=-.44+(j%3)*.012;s.y[k]=-.16+row*.16+(j<3?-.01:.01);s.c[k]=1;k++;}}
 s.labels=[['오늘 볼 것',-.44,-.3,'left']]; st.push(s);}

const S=st.length;
const COL=[[165,184,188,.46],[70,255,22,.95],[226,236,232,.62],[70,255,22,0]];
const delay=new Float32Array(N),wob=new Float32Array(N);for(let i=0;i<N;i++){delay[i]=rnd();wob[i]=rnd()*6.283;}
let W=0,H=0,DPR=1,vis=false,prog=0;
function size(){DPR=Math.min(2,window.devicePixelRatio||1);const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*DPR;cv.height=H*DPR;}
size();addEventListener('resize',size);
new IntersectionObserver(e=>{vis=e[0].isIntersecting;},{rootMargin:'100px'}).observe(sec);
const ss=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
function target(s,i,time,out,stgProg){
  let x=s.x[i],y=s.y[i];
  if(s.flow&&i>=s.flow.from){const F=s.flow;const u=(s.f[i]+time*.00018)%1;
    const h=(s.f[i]*97.31)%1;const sp=(h-.5)*F.spread*(F.fan?(1-u)*2.2:1);
    x=F.a[0]+(F.b[0]-F.a[0])*u+(F.fan?sp:0);y=F.a[1]+(F.b[1]-F.a[1])*u+(F.fan?0:sp);}
  out[0]=x;out[1]=y;
}
function colOf(s,i,stgProg){let c=s.c[i];if(s.grow&&c===0&&s.grow[i]<stgProg*.45)c=1;return COL[c];}
const A=[0,0],B=[0,0];
let lastCap=-1;
function frame(time){
  requestAnimationFrame(frame); if(!vis) return;
  const r=sec.getBoundingClientRect(),vh=innerHeight;const p=Math.min(1,Math.max(0,-r.top/(r.height-vh)));
  prog+= (p-prog)*(RM?1:.12);
  if(RM) time=0;
  const u=prog*UT, qe=timeline(u), k0=Math.min(S-2,Math.floor(qe)), fr=qe-k0;
  const T=fr;
  const ci=Math.min(caps.length-1,Math.max(0,Math.floor(u/CAPU)));
  if(ci!==lastCap){caps.forEach((c,i)=>c.classList.toggle('on',i===ci));idx.textContent=String(ci+1).padStart(2,'0');lastCap=ci;}
  bar.style.transform='scaleX('+prog+')';
  if(dash){const a=ss((qe-6.5)/.4);dash.style.opacity=a.toFixed(3);
    if(a>.01){dash.style.width=Math.min(W*(W<600?.9:.86),640).toFixed(1)+'px';dash.style.transform='translate('+(W/2).toFixed(1)+'px,'+(H/2).toFixed(1)+'px) translate(-50%,-50%)'+(RM?'':' translateY('+((1-a)*16).toFixed(1)+'px)');}}
  const s0=st[k0],s1=st[k0+1];
  cx.setTransform(DPR,0,0,DPR,0,0);cx.clearRect(0,0,W,H);
  const sc=Math.min(W,H)*.42*(1+.015*Math.sin(time*.0004)),ox=W/2,oy=H/2;
  const gl=[];
  for(let i=0;i<N;i++){
    target(s0,i,time,A,1);target(s1,i,time,B,fr);
    const c0=colOf(s0,i,1),c1=colOf(s1,i,Math.max(0,(fr-.2)/.8));
    if(RM){ // reduced motion: no travel, the two states cross-fade where they are
      for(const [P,c,w] of [[A,c0,1-T],[B,c1,T]]){const a=c[3]*w;if(a<.02)continue;const x=ox+P[0]*sc,y=oy+P[1]*sc;
        cx.fillStyle='rgba('+c[0]+','+c[1]+','+c[2]+','+a.toFixed(3)+')';const green=c[1]>200&&c[0]<160,z=green?2.1:1.5;cx.fillRect(x-z/2,y-z/2,z,z);if(green&&a>.5)gl.push(x,y);}
      continue; }
    const t=ss((T*1.35)-delay[i]*.35);
    const wx=Math.sin(time*.0011+wob[i])*.004,wy=Math.cos(time*.0009+wob[i])*.004;
    const x=ox+(A[0]+(B[0]-A[0])*t+wx)*sc,y=oy+(A[1]+(B[1]-A[1])*t+wy)*sc;
    const a=c0[3]+(c1[3]-c0[3])*t; if(a<.02) continue;
    const R=c0[0]+(c1[0]-c0[0])*t,G=c0[1]+(c1[1]-c0[1])*t,Bc=c0[2]+(c1[2]-c0[2])*t;
    const green=G>200&&R<160;
    cx.fillStyle='rgba('+(R|0)+','+(G|0)+','+(Bc|0)+','+a.toFixed(3)+')';
    const z=green?2.1:1.5;cx.fillRect(x-z/2,y-z/2,z,z);
    if(green&&a>.5) gl.push(x,y);
  }
  cx.globalCompositeOperation='lighter';cx.fillStyle='rgba(70,255,22,.07)';
  for(let j=0;j<gl.length;j+=2){cx.beginPath();cx.arc(gl[j],gl[j+1],5,0,6.283);cx.fill();}
  cx.globalCompositeOperation='source-over';
  // labels
  cx.font='500 13px Pretendard, system-ui, sans-serif';
  for(const [s,w] of [[s0,1-T],[s1,T]]){ if(w<.05) continue;
    for(const [txt,lx,ly,al] of s.labels){cx.globalAlpha=w*.9;cx.fillStyle=txt.startsWith('VISION')?'#46FF16':'#AEB9B5';cx.textAlign=al;cx.fillText(txt,ox+lx*sc,oy+ly*sc);} }
  cx.globalAlpha=1;
}
requestAnimationFrame(frame);
};
