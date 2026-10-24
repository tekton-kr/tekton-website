
(() => {
  const IW = 1983, IH = 793;
  const stage = document.getElementById('stage');
  const glc = document.getElementById('gl');
  const fxc = document.getElementById('fx');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);
  const SCAN = params.get('scan') !== '0';

  // ---------- cover-fit stage + slow push-in ----------
  let base = 1;
  // horizontal anchor: 0 = left edge, 0.5 = center, 1 = right edge (keep the building in frame)
  const ALIGN_X = 0.9;
  function fit(){
    const W = stage.parentElement.clientWidth, H = stage.parentElement.clientHeight;
    base = Math.max(W/IW, H/IH);
    const extra = Math.max(0, IW*base - W);          // hidden width in screen px
    const shift = (0.5 - ALIGN_X) * extra;           // move stage left to reveal the right side
    stage.style.width = IW + 'px'; stage.style.height = IH + 'px';
    stage.style.marginLeft = (-IW/2 + shift) + 'px'; stage.style.marginTop = (-IH/2) + 'px';
  }
  fit(); addEventListener('resize', fit);
  stage.style.transform = `scale(${base})`;
  // push-in toward the building (focal point inside the frame keeps the viewport covered)
  const FX = (0.66-0.5)*IW, FY = (0.42-0.5)*IH;
  function stageTransform(t){
    if (reduce) return `scale(${base})`;
    const p = (Math.sin((t/48) * Math.PI*2 - Math.PI/2) + 1) / 2;
    const z = 1 + 0.05*(p*p*(3-2*p));
    return `scale(${base}) translate(${FX*(1-z)}px, ${FY*(1-z)}px) scale(${z})`;
  }

  // ---------- masks (sky=R, river=G, building=B) ----------
  const SKY = [[0,0],[1983,0],[1983,268],[1950,268],[1950,250],[1892,250],[1892,272],[1820,272],[1820,245],[1772,245],[1766,160],[1498,152],[1376,192],[1296,238],[1212,255],[1196,262],[1130,262],[1100,266],[905,232],[900,165],[866,165],[862,238],[760,268],[255,262],[240,270],[90,262],[0,278]];
  const RIVER = [[0,565],[200,553],[380,543],[560,535],[700,522],[790,503],[960,497],[965,515],[820,535],[650,560],[560,588],[470,608],[310,628],[240,655],[0,692]];
  const BLDG = [[1204,296],[1204,793],[1816,793],[1816,262],[1762,255],[1758,168],[1500,162],[1378,203],[1298,248],[1214,268]];
  function poly(ctx, pts){ ctx.beginPath(); pts.forEach(([x,y],i)=> i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); ctx.fill(); }
  function maskCanvas(){
    const c = document.createElement('canvas'); c.width = IW; c.height = IH;
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0,0,IW,IH);
    x.globalCompositeOperation = 'lighter';
    x.filter = 'blur(6px)'; x.fillStyle = '#ff0000'; poly(x, SKY);
    x.filter = 'blur(10px)'; x.fillStyle = '#00ff00'; poly(x, RIVER);
    x.filter = 'blur(2px)'; x.fillStyle = '#0000ff'; poly(x, BLDG);
    return c;
  }

  // ---------- lit window panes (measured from the image) ----------
  const PANES = [[1479,653,1501,687],[1479,740,1500,777],[1455,645,1474,678],[1528,663,1543,702],[1508,402,1525,432],[1529,404,1545,436],[1349,607,1364,640],[1529,488,1544,521],[1332,393,1347,415],[1684,462,1697,497],[1300,734,1312,762],[1269,317,1285,341],[1683,611,1695,642],[1398,703,1415,737],[1644,403,1659,427],[1350,530,1365,553]];
  const paneState = PANES.map((_,i)=>({period: 16 + (i*7)%13, phase: (i*5.3)%17, off: 2.5 + (i%4)}));
  function paneLevel(i, t){
    const s = paneState[i]; const u = (t + s.phase) % s.period;
    if (u < s.off) return 0.0;                         // light off
    const k = u - s.off;
    if (k < 0.45) return (Math.sin(k*70) > 0.2) ? 1 : 0.15; // fluorescent flicker on
    return 1.0;
  }

  // ---------- WebGL ----------
  const gl = glc.getContext('webgl', {premultipliedAlpha:false, antialias:false, preserveDrawingBuffer:true});
  glc.width = IW; glc.height = IH; gl.viewport(0, 0, IW, IH);
  const VS = `attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p,0.,1.); }`;
  const FS = `precision highp float;
  varying vec2 uv; uniform sampler2D img; uniform sampler2D msk; uniform float t;
  uniform vec4 panes[16]; uniform float lv[16]; uniform float scanY; uniform float scanOn; uniform float dbg;
  const vec2 RES = vec2(${IW}.0, ${IH}.0);
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
  float lum(vec3 c){ return dot(c, vec3(.3,.59,.11)); }
  void main(){
    vec4 m = texture2D(msk, uv);
    vec3 col = texture2D(img, uv).rgb;

    // clouds: two-phase flow map, motion fades out toward the skyline
    float w = m.r * smoothstep(0.31, 0.06, uv.y);
    if (w > 0.001){
      vec2 flow = vec2(0.010, 0.0) + 0.006*vec2(n(uv*3. + t*.015) - .5, n(uv*3. + 7.3 - t*.012) - .5);
      float sp = t * 0.022;
      float p0 = fract(sp), p1 = fract(sp + .5);
      vec2 u0 = uv - flow * p0 * w, u1 = uv - flow * p1 * w;
      vec3 a = texture2D(img, u0).rgb, b = texture2D(img, u1).rgb;
      // never pull in pixels from outside the sky
      a = mix(col, a, step(.6, texture2D(msk, u0).r));
      b = mix(col, b, step(.6, texture2D(msk, u1).r));
      float bl = abs(p0 - .5) * 2.;
      col = mix(col, mix(a, b, bl), w);
    }

    // river shimmer: small horizontal ripples on reflections
    if (m.g > 0.001){
      float rip = sin(uv.y*RES.y*0.9 + t*2.4 + n(uv*vec2(8.,60.) + t*.3)*6.) * (1.6/RES.x);
      vec3 r = texture2D(img, uv + vec2(rip, 0.)).rgb;
      col = mix(col, r, m.g);
    }

    // building: individual window panes switching on / off + diagnostic scan
    if (m.b > 0.001){
      vec2 px = uv * RES;
      float L = lum(col);
      float lit = smoothstep(.36, .62, L);
      for (int i = 0; i < 16; i++){
        vec4 r = panes[i] + vec4(-4., -4., 4., 4.);
        float inside = step(r.x, px.x) * step(px.x, r.z) * step(r.y, px.y) * step(px.y, r.w);
        float f = mix(0.2, 1.0, lv[i]);
        col = mix(col, col * vec3(f, f, f*1.08), inside * lit);
      }
      float d = px.y - scanY;
      float band = exp(-d*d / (2.*26.*26.)) * scanOn;
      float line = exp(-d*d / (2.*1.2*1.2)) * scanOn;
      col += col * lit * band * 0.45 * m.b;
      col += vec3(.27, 1., .09) * (band * 0.05 + line * 0.32) * m.b;
    }
    gl_FragColor = dbg > .5 ? vec4(m.rgb*.8 + col*.2, 1.) : vec4(col, 1.);
  }`;
  function sh(type, src){ const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  function tex(unit, src){ const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); return tx; }
  const U = n => gl.getUniformLocation(pr, n);
  gl.uniform4fv(U('panes'), new Float32Array(PANES.flat()));

  // ---------- 2D overlay: traffic lights + rooftop beacon ----------
  const fx = fxc.getContext('2d'); const S = 2; fxc.width = IW*S; fxc.height = IH*S;
  const ROADS = [
    {pts:[[688,793],[860,750],[1010,712],[1157,684]], color:[255,70,50],  n:9, speed:46, len:16, w:2.2},  // red, going away
    {pts:[[1157,664],[1010,694],[870,730],[740,768],[650,793]], color:[255,236,200], n:9, speed:52, len:14, w:2.4}, // headlights
    {pts:[[0,694],[120,676],[240,660],[330,648]], color:[255,214,150], n:4, speed:24, len:8, w:1.6},
    {pts:[[378,490],[560,486],[760,488],[968,488]], color:[255,220,170], n:6, speed:22, len:6, w:1.3},
    {pts:[[968,494],[760,494],[560,492],[378,496]], color:[255,80,60], n:5, speed:20, len:6, w:1.3},
  ];
  ROADS.forEach(r => { let L=0; r.seg = r.pts.slice(1).map((p,i)=>{ const a=r.pts[i]; const l=Math.hypot(p[0]-a[0],p[1]-a[1]); L+=l; return {a,b:p,l}; }); r.L=L;
    r.cars = Array.from({length:r.n}, (_,i)=>({o: (i/r.n)*L + Math.random()*L/(r.n*2), v: r.speed*(0.8+Math.random()*0.4)})); });
  function at(r, d){ d = ((d % r.L) + r.L) % r.L; for (const s of r.seg){ if (d <= s.l){ const k=d/s.l; return [s.a[0]+(s.b[0]-s.a[0])*k, s.a[1]+(s.b[1]-s.a[1])*k]; } d -= s.l; } return r.pts[r.pts.length-1]; }
  const BEACON = [1578, 170];
  function drawFX(t, dt){
    fx.setTransform(S,0,0,S,0,0); fx.clearRect(0,0,IW,IH); fx.globalCompositeOperation = 'lighter'; fx.lineCap = 'round';
    for (const r of ROADS){ const [R,G,B] = r.color;
      for (const c of r.cars){ c.o += c.v*dt; const p = at(r, c.o), q = at(r, c.o - r.len);
        const fade = Math.min(1, Math.min(c.o % r.L, r.L - (c.o % r.L)) / 40);
        const g = fx.createLinearGradient(q[0],q[1],p[0],p[1]);
        g.addColorStop(0, `rgba(${R},${G},${B},0)`); g.addColorStop(1, `rgba(${R},${G},${B},${0.85*fade})`);
        fx.strokeStyle = g; fx.lineWidth = r.w; fx.beginPath(); fx.moveTo(q[0],q[1]); fx.lineTo(p[0],p[1]); fx.stroke();
        fx.fillStyle = `rgba(${R},${G},${B},${0.25*fade})`; fx.beginPath(); fx.arc(p[0],p[1],r.w*2.2,0,Math.PI*2); fx.fill(); } }
    const pulse = Math.pow((Math.sin(t*Math.PI) + 1)/2, 3); // ~2s cycle
    const rad = 5 + 16*pulse; const g = fx.createRadialGradient(BEACON[0],BEACON[1],0,BEACON[0],BEACON[1],rad);
    g.addColorStop(0, `rgba(120,255,80,${0.55+0.45*pulse})`); g.addColorStop(.35, `rgba(70,255,22,${0.35*pulse})`); g.addColorStop(1, 'rgba(70,255,22,0)');
    fx.fillStyle = g; fx.beginPath(); fx.arc(BEACON[0],BEACON[1],rad,0,Math.PI*2); fx.fill();
  }

  // ---------- loop ----------
  const img = new Image(); img.src = document.getElementById('poster').currentSrc || document.getElementById('poster').src;
  img.onload = () => {
    tex(0, img); tex(1, maskCanvas());
    gl.uniform1i(U('img'), 0); gl.uniform1i(U('msk'), 1);
    gl.uniform1f(U('dbg'), params.get('debug') === 'mask' ? 1 : 0);
    window.__heroDebug.state = () => ({ t: performance.now() });
    let last = performance.now(), t0 = last;
    const frame = now => {
      const t = (now - t0)/1000, dt = Math.min(0.05, (now - last)/1000); last = now;
      const tt = reduce ? 0 : t;
      gl.uniform1f(U('t'), tt);
      gl.uniform1fv(U('lv'), new Float32Array(PANES.map((_,i)=> reduce ? 1 : paneLevel(i, tt))));
      const cyc = tt % 11, on = SCAN && !reduce && cyc < 4.2 ? 1 : 0;
      gl.uniform1f(U('scanOn'), on * Math.min(1, cyc*3) * Math.min(1, (4.2-cyc)*3));
      gl.uniform1f(U('scanY'), 150 + (cyc/4.2) * 660);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduce) drawFX(tt, dt);
      stage.style.transform = stageTransform(tt);
      stage.classList.add('ready');
      if (!reduce) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  window.__heroDebug = { PANES, ROADS, SKY, RIVER, BLDG };
})();
