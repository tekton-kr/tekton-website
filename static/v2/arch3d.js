/* T-ARCH scale story (3D). One continuous camera pull-back:
   sensor -> AHU -> EDGE -> building -> cloud -> city -> Korea (vision) -> today */
import * as THREE from 'three';
import { EffectComposer } from './three/postprocessing/EffectComposer.js';
import { RenderPass } from './three/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './three/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from './three/postprocessing/ShaderPass.js';
import { KOR, CITIES } from './korea.js';

export function start(){
  const sec = document.getElementById('scale'); if(!sec) return false;
  const wrap = sec.querySelector('.sc-canvas'); const old = wrap.querySelector('canvas');
  const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden','true');
  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); }
  catch(e){ return false; }
  if(!R.getContext()) return false;
  old.replaceWith(cv);
  sec.classList.add('is3d');

  const caps=[...sec.querySelectorAll('.sc-cap')], bar=sec.querySelector('.sc-bar i'), idx=sec.querySelector('.sc-idx b');
  const S = caps.length; // 8
  const DPR = Math.min(window.devicePixelRatio||1, 1.75);
  R.setPixelRatio(DPR); R.outputColorSpace = THREE.LinearSRGBColorSpace; R.setClearColor(0x0B1012, 1);
  const scene = new THREE.Scene();
  scene.fog = null;
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 1e7);

  /* ---------- helpers ---------- */
  let seed = 7; const rnd = () => (seed = (seed*16807) % 2147483647, (seed-1)/2147483646);
  const C = { wire:0x9FB2AE, dim:0x55646A, green:0x46FF16, white:0xE6EEEA, amber:0xF5B700 };
  const disc = (()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
    const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.35,'rgba(255,255,255,.85)'); gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr; g.fillRect(0,0,64,64); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; })();
  const fades = []; // {m, base, fn}
  const reg = (obj, base, fn) => { const m=obj.material; m.opacity=base; fades.push({obj, m, base, fn}); scene.add(obj); return obj; };
  const lineMat = (color) => new THREE.LineBasicMaterial({ color, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending });
  const ptMat = (color, px) => new THREE.PointsMaterial({ color, size:px*DPR, sizeAttenuation:false, map:disc, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending });
  const lines = (arr, color) => { const g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr,3)); return new THREE.LineSegments(g, lineMat(color)); };
  const points = (arr, color, px) => { const g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr,3)); return new THREE.Points(g, ptMat(color, px)); };
  function box(a, x0,y0,z0,x1,y1,z1, noBottom){
    const v=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];
    const e=[[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]; if(!noBottom) e.push([0,1],[1,2],[2,3],[3,0]);
    for(const [i,j] of e) a.push(...v[i],...v[j]); return a;
  }
  function rect(a, x0,z0,x1,z1,y){ a.push(x0,y,z0,x1,y,z0, x1,y,z0,x1,y,z1, x1,y,z1,x0,y,z1, x0,y,z1,x0,y,z0); return a; }
  function ring(a, cx,cy,cz, r, axis='y', n=28){ for(let i=0;i<n;i++){ const t0=i/n*6.2832,t1=(i+1)/n*6.2832;
      const p=(t)=> axis==='y'?[cx+Math.cos(t)*r,cy,cz+Math.sin(t)*r]: axis==='x'?[cx,cy+Math.cos(t)*r,cz+Math.sin(t)*r]:[cx+Math.cos(t)*r,cy+Math.sin(t)*r,cz];
      a.push(...p(t0),...p(t1)); } return a; }
  const ss = (a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
  const ramp = (d, i0,i1, o0,o1) => (i1>i0? ss(i0,i1,d):1) * (o1>o0? 1-ss(o0,o1,d):1);

  /* ---------- 1. mechanical room (B1) ---------- */
  const mech=[], mechD=[];
  box(mechD, -16,-6,-16, 8,0,-2);
  for(let x=-14;x<=6;x+=2) mechD.push(x,-6,-16, x,-6,-2);
  for(let z=-14;z<=-4;z+=2) mechD.push(-16,-6,z, 8,-6,z);
  // AHU
  box(mech, -10.5,-6,-9, -5.5,-3.8,-7);
  for(let x=-9.7;x<-5.6;x+=0.83) mech.push(x,-6,-7, x,-3.8,-7);
  ring(mech, -5.5,-4.9,-8, .7, 'x'); ring(mech, -5.5,-4.9,-8, .45, 'x', 20);
  // duct + riser
  box(mech, -7.2,-3.8,-8.5, -6.2,0,-7.5, true);
  // pumps
  for(const px of [-1,1.2,3.4]){ ring(mech, px,-6,-12,.45); ring(mech, px,-4.8,-12,.45); ring(mech, px,-4.2,-12,.28);
    for(const [dx,dz] of [[.45,0],[-.45,0],[0,.45],[0,-.45]]) mech.push(px+dx,-6,-12+dz, px+dx,-4.8,-12+dz); }
  mech.push(-1.6,-5.4,-12, 4,-5.4,-12);
  // DDC panel
  box(mech, 3.6,-6,-3, 4.6,-4,-2.6); for(const y of [-5.5,-5,-4.5]) mech.push(3.65,y,-2.98, 4.55,y,-2.98);
  // shelf for EDGE
  mech.push(4.9,-4.62,-3.2, 5.9,-4.62,-3.2, 5.9,-4.62,-3.2, 5.9,-4.62,-2.6);
  const mechL = reg(lines(mech, C.wire), .55, (d)=>ramp(d,-1,0, 45,150));
  const mechDL = reg(lines(mechD, C.dim), .35, (d)=>ramp(d,-1,0, 40,130));
  // EDGE (hero)
  const edgeA=[]; box(edgeA, 5.0,-4.6,-3.1, 5.7,-4.42,-2.65);
  const edgeL = reg(lines(edgeA, C.green), 1, (d)=>ramp(d,-1,0, 70,220));
  const edgeLed = reg(points([5.7,-4.51,-2.75, 5.7,-4.51,-2.85, 5.7,-4.51,-2.95], C.green, 5), 1, (d)=>ramp(d,-1,0,70,220));
  // sensors on AHU (24) + hero sensor
  const SENSOR = new THREE.Vector3(-6.7,-2.4,-7.48);
  const ahuS=[]; for(let i=0;i<24;i++){ const f=i%3; if(f===0) ahuS.push(-10.3+rnd()*4.6, -5.8+rnd()*1.8, -6.98); else if(f===1) ahuS.push(-10.3+rnd()*4.6, -3.79, -8.9+rnd()*1.8); else ahuS.push(-5.49, -5.8+rnd()*1.8, -8.9+rnd()*1.8); }
  const ahuP = reg(points(ahuS, C.green, 3.2), .9, (d,s)=>ss(.35,.9,s)*ramp(d,-1,0,60,200));
  const heroS = reg(points([SENSOR.x,SENSOR.y,SENSOR.z], C.green, 9), 1, (d)=>ramp(d,-1,0,120,600));

  /* ---------- 2. building ---------- */
  const bl=[], bp=[], bg=[];
  for(let y=0;y<=72;y+=4) rect(bl,-16,-16,16,16,y);
  for(const x of [-16,-5.33,5.33,16]) for(const z of [-16,16]) bl.push(x,-6,z, x,72,z);
  for(const z of [-5.33,5.33]) for(const x of [-16,16]) bl.push(x,-6,z, x,72,z);
  rect(bl,-16,-16,16,16,-6);
  box(bl, 4,72,4, 12,76.5,12); box(bl, -12,72,4, -4,76.5,12); ring(bl, 8,76.5,8, 3); ring(bl,-8,76.5,8,3);
  bl.push(-6.7,0,-8, -6.7,72,-8, 5.35,0,-2.85, 5.35,72,-2.85); // risers
  for(let y=2;y<72;y+=4) for(let t=-15;t<=15;t+=2){ bp.push(t,y,16.05, t,y,-16.05, 16.05,y,t, -16.05,y,t); }
  for(let i=0;i<288;i++){ const fl=Math.floor(rnd()*18); bg.push(-15+rnd()*30, fl*4+0.6+rnd()*2.4, -15+rnd()*30); }
  const bFade=(d)=>ramp(d, 9,45, 700,3200);
  reg(lines(bl, C.wire), .42, bFade);
  reg(points(bp, C.white, 1.6), .22, bFade);
  reg(points(bg, C.green, 2.6), .95, (d,s)=>ss(2.4,3,s)*ramp(d,9,45,500,2600)*(1-.6*ss(300,1600,d)));

  /* ---------- 3. cloud layers ---------- */
  const PL=[150,190,230], cloudObjs=[];
  const cloudFade=(d,s)=>ss(3.35,3.95,s)*ramp(d,-1,0,80000,260000)*(1-.72*ss(1200,6000,d))*(1-ss(9000,30000,d));
  PL.forEach((y,i)=>{ const a=[]; rect(a,-55,-55,55,55,y); for(let t=-44;t<=44;t+=11){ a.push(t,y,-55,t,y,55, -55,y,t,55,y,t); }
    reg(lines(a, i===2?C.green:C.wire), i===2?.55:.3, cloudFade);
    const br=[]; for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ const x=sx*55,z=sz*55; br.push(x,y,z, x-sx*12,y,z, x,y,z, x,y,z-sz*12); }
    reg(lines(br, C.green), .9, cloudFade);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(110,110), new THREE.MeshBasicMaterial({color:C.green, transparent:true, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending}));
    m.rotation.x=-Math.PI/2; m.position.y=y; reg(m, i===2?.06:.03, cloudFade); });

  /* ---------- 4. city ---------- */
  const cl=[], cr=[], litL=[], lit=[]; const CITY_R=1600;
  for(let gx=-22;gx<=22;gx++) for(let gz=-22;gz<=22;gz++){
    const cx=gx*72, cz=gz*72, r=Math.hypot(cx,cz);
    if(r<40 || r>CITY_R*(.75+.25*rnd()) || rnd()<.28) continue;
    const w=12+rnd()*22, dd=12+rnd()*22, h=8+Math.pow(rnd(),2.2)*130*(1-r/CITY_R*.6);
    const isLit = lit.length<4 && r>320 && r<1200 && rnd()<.012;
    const x0=cx-w/2+(rnd()-.5)*20, z0=cz-dd/2+(rnd()-.5)*20;
    box(isLit?litL:cl, x0,0,z0, x0+w,h,z0+dd, true);
    cr.push(x0+w/2,h,z0+dd/2);
    if(isLit) lit.push(new THREE.Vector3(x0+w/2,h,z0+dd/2));
  }
  while(lit.length<4){ const a=rnd()*6.28, r=400+rnd()*700, x=Math.cos(a)*r, z=Math.sin(a)*r, h=40+rnd()*60; box(litL,x-12,0,z-12,x+12,h,z+12,true); lit.push(new THREE.Vector3(x,h,z)); }
  const grid=[]; for(let t=-1620;t<=1620;t+=72){ grid.push(t,0,-1620,t,0,1620, -1620,0,t,1620,0,t); }
  const cityFade=(d)=>ramp(d,260,1100, 12000,40000);
  reg(lines(cl, C.wire), .2, cityFade);
  reg(points(cr, C.white, 1.4), .25, cityFade);
  reg(lines(grid, C.dim), .1, (d)=>ramp(d,260,1100,9000,22000));
  const litFade=(d,s)=>ss(4.4,5,s)*(1-ss(12000,40000,d));
  reg(lines(litL, C.green), .85, litFade);
  reg(points(lit.flatMap(v=>[v.x,v.y,v.z]), C.green, 6), 1, litFade);
  // building outline highlight (ours) at city scale
  const ours=[]; box(ours,-16,0,-16,16,72,16,true); reg(lines(ours, C.green), .9, (d,s)=>ss(3.6,4.4,s)*(1-.65*ss(1500,6000,d))*(1-ss(9000,30000,d)));

  /* ---------- 5. Korea ---------- */
  const kp=new Float32Array(KOR.length/2*3), kc=new Float32Array(KOR.length/2*3), kthr=new Float32Array(KOR.length/2);
  const cityV = CITIES.map(([x,z])=>new THREE.Vector3(x*100,0,z*100));
  for(let i=0;i<KOR.length/2;i++){ const x=KOR[i*2]*100, z=KOR[i*2+1]*100; kp[i*3]=x; kp[i*3+1]=0; kp[i*3+2]=z;
    let md=1e12; for(const c of cityV){ md=Math.min(md, Math.hypot(c.x-x,c.z-z)); } md=Math.min(md, Math.hypot(x,z));
    kthr[i]=Math.min(1, md/140000 + rnd()*.18); }
  const kg=new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.BufferAttribute(kp,3)); kg.setAttribute('color', new THREE.BufferAttribute(kc,3));
  const km=ptMat(0xffffff, 1.8); km.vertexColors=true;
  const korea=new THREE.Points(kg, km); reg(korea, .9, (d)=>ramp(d,14000,70000,1e9,2e9));
  const DIM=new THREE.Color(0x3C4A4E), GRN=new THREE.Color(C.green);
  let lastGrow=-1;
  function growKorea(g){ if(Math.abs(g-lastGrow)<.004) return; lastGrow=g;
    for(let i=0;i<kthr.length;i++){ const on = ss(kthr[i]-.06, kthr[i], g*1.05); const c=DIM.clone().lerp(GRN,on*.5);
      kc[i*3]=c.r; kc[i*3+1]=c.g; kc[i*3+2]=c.b; } kg.attributes.color.needsUpdate=true; }
  growKorea(0);
  const HUB=new THREE.Vector3(0,42000,0);
  const cityPts=[]; cityV.forEach(v=>cityPts.push(v.x,0,v.z));
  const visionFade=(d,s)=>ss(5.55,6,s)*ramp(d,14000,70000,1e9,2e9);
  reg(points(cityPts, C.green, 5), .9, visionFade);
  reg(points([0,0,0], C.green, 7), .8, (d,s)=>ss(4.8,5.6,s)*ramp(d,9000,30000,1e9,2e9));
  const hubP = reg(points([HUB.x,HUB.y,HUB.z], C.green, 8), .9, visionFade);

  /* ---------- 6. data pulses ---------- */
  const paths=[];
  const P=(...a)=>a.map(v=>new THREE.Vector3(...v));
  function addPath(pts, n, speed, color, px, fn, base=1){
    const L=[0]; for(let i=1;i<pts.length;i++) L.push(L[i-1]+pts[i].distanceTo(pts[i-1]));
    const g=new THREE.BufferGeometry(); const arr=new Float32Array(n*3); g.setAttribute('position', new THREE.BufferAttribute(arr,3));
    const o=new THREE.Points(g, ptMat(color, px)); reg(o, base, fn);
    const off=[]; for(let i=0;i<n;i++) off.push(i/n + rnd()*.4/n);
    const tl=[]; for(let i=1;i<pts.length;i++) tl.push(pts[i-1].x,pts[i-1].y,pts[i-1].z, pts[i].x,pts[i].y,pts[i].z);
    paths.push({pts,L,arr,g,off,speed,n});
    return tl;
  }
  function at(p, u, out){ const T=p.L[p.L.length-1]*u; let k=1; while(k<p.L.length-1 && p.L[k]<T) k++;
    const a=p.pts[k-1], b=p.pts[k], seg=p.L[k]-p.L[k-1]||1; out.lerpVectors(a,b,(T-p.L[k-1])/seg); }
  const trayFn=(d,s)=>ss(1.3,1.9,s)*ramp(d,-1,0,60,200);
  const trayLines = addPath(P([SENSOR.x,SENSOR.y,SENSOR.z],[-6.7,-0.6,-7.48],[4.1,-0.6,-7.48],[4.1,-0.6,-2.8],[4.1,-4,-2.8],[4.6,-4.5,-2.8],[5.0,-4.51,-2.88]), 26, .045, C.green, 4.2, trayFn);
  reg(lines(trayLines, C.green), .25, trayFn);
  const riserFn=(d,s)=>ss(1.7,2.3,s)*ramp(d,-1,0,30000,120000)*(1-.8*ss(1500,8000,d));
  addPath(P([5.35,-4.42,-2.85],[5.35,72,-2.85],[0,150,0],[0,190,0],[0,230,0]), 60, .02, C.green, 3.6, riserFn);
  // fan of other building EDGEs into cloud (stage 4)
  const fanFn=(d,s)=>ss(3.5,4.1,s)*(1-ss(1500,5000,d));
  for(let i=0;i<10;i++){ const a=i/10*6.283, r=420; addPath(P([Math.cos(a)*r,0,Math.sin(a)*r],[Math.cos(a)*r*.55,110,Math.sin(a)*r*.55],[0,150,0]), 10, .03+rnd()*.02, C.green, 3, fanFn, .8); }
  const beamFn=(d,s)=>ss(4.5,5.1,s)*(1-ss(12000,40000,d));
  lit.forEach(v=>{ const tl=addPath(P([v.x,v.y,v.z],[v.x*.5,v.y+260,v.z*.5],[0,230,0]), 18, .025+rnd()*.01, C.green, 4, beamFn); reg(lines(tl,C.green), .22, beamFn); });
  cityV.forEach(v=>{ const mid=v.clone().multiplyScalar(.5); mid.y=HUB.y*.9; const curve=new THREE.QuadraticBezierCurve3(v, mid, HUB);
    const pts=curve.getPoints(40); const tl=addPath(pts, 16, .02+rnd()*.012, C.green, 3.4, visionFade);
    reg(lines(tl, C.green), .18, visionFade); });
  const tmpV=new THREE.Vector3();

  /* ---------- labels + HUD (HTML) ---------- */
  const lbWrap=document.createElement('div'); lbWrap.className='sc-labels'; wrap.appendChild(lbWrap);
  const LB=[];
  const label=(txt, en, pos, s0, s1, cls='')=>{ const el=document.createElement('div'); el.className='sc-lb '+cls; el.innerHTML=`<i></i><span><em>${en}</em>${txt}</span>`; lbWrap.appendChild(el); LB.push({el,pos,s0,s1}); };
  label('온도 센서','SENSOR', SENSOR, -1, .45);
  label('공조기','AHU', new THREE.Vector3(-8,-3.8,-7), .6, 1.45);
  label('자동제어반','DDC', new THREE.Vector3(4.1,-4,-2.8), 1.6, 2.45);
  label('읽기 전용 · 15분마다','T-ARCH EDGE', new THREE.Vector3(5.35,-4.42,-2.85), 1.6, 2.45, 'g');
  label('관제점 312개','BUILDING', new THREE.Vector3(16,60,16), 2.6, 3.45);
  label('믿을 수 있는 값인지 확인','01', new THREE.Vector3(55,150,55), 3.6, 4.4);
  label('규칙으로 판정','02', new THREE.Vector3(55,190,55), 3.6, 4.4);
  label('근거와 함께 보고','03', new THREE.Vector3(55,230,55), 3.6, 4.4, 'g');
  label('5곳 실증 중','NOW', new THREE.Vector3(0,230,0), 4.6, 5.4, 'g');
  label('목표','VISION', HUB, 5.6, 6.45, 'g');
  const hud=document.createElement('div'); hud.className='sc-hud'; hud.innerHTML='<div><span>SCALE</span><i class="sb"></i><b class="sv">1 m</b></div><div><span>POS</span><b class="ll">37.5°N 126.7°E</b></div><div><span>MODE</span><b>READ-ONLY · 15 MIN</b></div>'; wrap.appendChild(hud);
  const sb=hud.querySelector('.sb'), sv=hud.querySelector('.sv'), ll=hud.querySelector('.ll');
  const today=document.createElement('div'); today.className='sc-today'; today.innerHTML=
   '<div class="h"><b>오늘 볼 것</b><span>3건</span></div>'+
   '<div class="r"><em class="bad">이상</em><div><b>냉각탑</b><span>기준을 넘어도 정지 · 10번 중 7번</span></div></div>'+
   '<div class="r"><em class="bad">이상</em><div><b>전력계</b><span>하루 11시간 "0" 전송</span></div></div>'+
   '<div class="r"><em class="chk">확인 중</em><div><b>공조기</b><span>운전 목적 확인 필요</span></div></div>'+
   '<p>예시 화면 · 인천 복합시설 실제 사례 기반</p>'; wrap.appendChild(today);

  /* ---------- camera keyframes ---------- */
  const K=[ // target, dist, az, el
    [[-6.7,-2.4,-7.48], 1.7, .55, .12],
    [[-8,-4.6,-8], 10.5, .75, .38],
    [[-2,-4.2,-5.5], 19, .95, .5],
    [[0,30,0], 185, .85, .3],
    [[0,135,0], 380, 1.05, .22],
    [[0,140,0], 4300, 1.15, .68],
    [[98000,0,178000], 1050000, 0, 1.22],
    [[98000,0,178000], 1180000, 0, 1.25]];
  const tA=new THREE.Vector3(), tB=new THREE.Vector3(), tgt=new THREE.Vector3();

  /* ---------- post ---------- */
  const comp=new EffectComposer(R); comp.addPass(new RenderPass(scene, cam));
  const bloom=new UnrealBloomPass(new THREE.Vector2(256,256), .82, .45, .34); comp.addPass(bloom);
  comp.addPass(new ShaderPass({ uniforms:{ tDiffuse:{value:null} }, vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'uniform sampler2D tDiffuse; varying vec2 vUv; vec3 enc(vec3 c){ c=max(c,0.0); return mix(c*12.92, 1.055*pow(c,vec3(1.0/2.4))-0.055, step(vec3(0.0031308),c)); } void main(){ vec4 t=texture2D(tDiffuse,vUv); gl_FragColor=vec4(enc(t.rgb),1.0); }' }));
  let W=1,H=1;
  function size(){ const r=wrap.getBoundingClientRect(); W=Math.max(1,r.width); H=Math.max(1,r.height);
    R.setSize(W,H,false); comp.setSize(W,H); bloom.setSize(W*DPR*.8,H*DPR*.8); cam.aspect=W/H; cam.updateProjectionMatrix(); }
  size(); addEventListener('resize', size);
  let vis=false; new IntersectionObserver(e=>{ vis=e[0].isIntersecting; },{rootMargin:'200px'}).observe(sec);

  let prog=0, lastCap=-1;
  const nice=(m)=>{ const p=Math.pow(10,Math.floor(Math.log10(m))); for(const k of [1,2,5,10]) if(k*p>=m) return k*p; return 10*p; };
  const fmt=(m)=> m>=1000? (m/1000).toLocaleString('en-US')+' km' : m+' m';
  function frame(time){
    requestAnimationFrame(frame); if(!vis) return;
    const r=sec.getBoundingClientRect(), vh=innerHeight;
    const p=Math.min(1,Math.max(0,-r.top/(r.height-vh)));
    prog += (p-prog)*.09;
    const sf=prog*(S-1), k0=Math.min(S-2,Math.floor(sf)), fr=sf-k0, e=ss(.14,.86,fr), s=k0+e;
    const ci=Math.min(S-1,Math.max(0,Math.round(sf)));
    if(ci!==lastCap){ caps.forEach((c,i)=>c.classList.toggle('on',i===ci)); idx.textContent=String(ci+1).padStart(2,'0'); lastCap=ci; }
    bar.style.transform='scaleX('+prog+')';
    // camera
    const A=K[k0], B=K[k0+1]; const asp=W/H, mul = asp<1.25 ? 1.25/asp : 1;
    const dA=A[1]*mul, dB=B[1]*mul;
    const d=Math.exp(Math.log(dA)+(Math.log(dB)-Math.log(dA))*e);
    const ft = dB/dA>6 ? Math.min(1,Math.max(0,(d-dA)/(dB-dA))) : e;
    tA.fromArray(A[0]); tB.fromArray(B[0]); tgt.lerpVectors(tA,tB,ft);
    const az=A[2]+(B[2]-A[2])*e + Math.sin(time*.00012)*.035*(1-ss(5.2,6,s));
    const el=A[3]+(B[3]-A[3])*e;
    cam.position.set(tgt.x+d*Math.sin(az)*Math.cos(el), tgt.y+d*Math.sin(el), tgt.z+d*Math.cos(az)*Math.cos(el));
    cam.near=Math.max(.05,d*.02); cam.far=d*60+500000*ss(4,6,s); cam.lookAt(tgt); cam.updateProjectionMatrix();
    // fades
    const dimAll = 1 - .72*ss(6.25,6.9,s);
    for(const f of fades){ const o=f.base*f.fn(d,s)*dimAll; f.m.opacity=o; f.obj.visible=o>.003; }
    growKorea(.62*ss(5.7,6.6,s));
    // pulses
    for(const pth of paths){ if(!pth.g.parent && false) continue; for(let i=0;i<pth.n;i++){ at(pth, (pth.off[i]+time*.001*pth.speed)%1, tmpV); pth.arr[i*3]=tmpV.x; pth.arr[i*3+1]=tmpV.y; pth.arr[i*3+2]=tmpV.z; } pth.g.attributes.position.needsUpdate=true; }
    // labels
    for(const L of LB){ const a = ss(L.s0-.25,L.s0+.15,s)*(1-ss(L.s1-.15,L.s1+.25,s))*dimAll;
      if(a<.01){ L.el.style.opacity=0; continue; }
      tmpV.copy(L.pos).project(cam); if(tmpV.z>1){ L.el.style.opacity=0; continue; }
      const x=(tmpV.x*.5+.5)*W, y=(-tmpV.y*.5+.5)*H; L.el.classList.toggle('l', x>W*.58); L.el.style.opacity=a.toFixed(3); L.el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; }
    // HUD
    const worldW = 2*d*Math.tan(THREE.MathUtils.degToRad(cam.fov/2))*asp, mpp=worldW/W, m=nice(mpp*70);
    sb.style.width=(m/mpp).toFixed(1)+'px'; sv.textContent=fmt(m);
    ll.textContent=(37.456 - tgt.z/110540).toFixed(1)+'°N '+(126.705 + tgt.x/89496).toFixed(1)+'°E';
    today.style.opacity=ss(6.35,6.9,s).toFixed(3); today.style.transform=`translate(-50%,-50%) translateY(${(1-ss(6.35,6.9,s))*16}px)`;
    comp.render();
  }
  requestAnimationFrame(frame);
  return true;
}
