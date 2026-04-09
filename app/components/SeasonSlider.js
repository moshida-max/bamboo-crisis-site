'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const SEASONS = [
  { id:'spring', jp:'春', en:'SPRING', img:'/umbrella-spring.png',  particle:'sakura',    accent:'#e8a0b4' },
  { id:'summer', jp:'夏', en:'SUMMER', img:'/umbrella-summer.png',  particle:'fireworks', accent:'#e8c87a' },
  { id:'autumn', jp:'秋', en:'AUTUMN', img:'/umbrella-autumn.png',  particle:'leaves',    accent:'#d08050' },
  { id:'winter', jp:'冬', en:'WINTER', img:'/umbrella-winter.png',  particle:'snow',      accent:'#88b8d8' },
];

// ── 雨 Canvas ────────────────────────────────────────────────────
function RainCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    const drops = Array.from({ length: 55 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      l: Math.random() * 15 + 6, speed: Math.random() * 3 + 2,
      opacity: Math.random() * 0.14 + 0.04,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      drops.forEach(d => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(160,200,180,${d.opacity})`;
        ctx.lineWidth = 0.6;
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 4, d.y + d.l); ctx.stroke();
        d.y += d.speed;
        if (d.y > c.height) { d.y = -20; d.x = Math.random() * c.width; }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={1400} height={900}
    className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.45 }} />;
}

// ── 白背景除去 傘 ────────────────────────────────────────────────
function UmbrellaImage({ src, accent, opacity, transition }) {
  const canvasRef = useRef(null);
  const W = 270, H = 360;
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current; if (!c) return;
      c.width = W * 2; c.height = H * 2;
      const ctx = c.getContext('2d');
      const scale = Math.min((W*2)/img.width, (H*2)/img.height);
      const dw = img.width*scale, dh = img.height*scale;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, (W*2-dw)/2, (H*2-dh)/2, dw, dh);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      const d = data.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const bright = r*0.299 + g*0.587 + b*0.114;
        const sat = Math.max(r,g,b) - Math.min(r,g,b);
        if (bright > 210 && sat < 45)
          d[i+3] = Math.round(d[i+3] * Math.max(0, 1 - (bright-210)/45));
      }
      ctx.putImageData(data, 0, 0);
    };
    img.src = src;
  }, [src]);
  return <canvas ref={canvasRef} style={{
    width: W, height: H, display:'block', opacity,
    transition, filter:`drop-shadow(0 20px 55px ${accent}65)`,
  }} />;
}

// ── パーティクル Canvas ──────────────────────────────────────────
// PILE_Y: 傘の根元のcanvas y座標（canvas=800x600, セクション100vh想定）
// コンテンツの配置: padding-top 60px + 傘380px → 根元 y ≈ H * 0.66
const PILE_Y_RATIO = 0.66;
const PILE_HW_RATIO = 0.13; // 積もり範囲の半幅 (x方向)

function ParticleCanvas({ season }) {
  const ref = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;

    const PILE_Y  = H * PILE_Y_RATIO;
    const PILE_CX = W * 0.5;
    const PILE_HW = W * PILE_HW_RATIO;

    // 積もり高さマップ (PILE_Y を基準とした上方向の高さ)
    const NC = 100;
    const cw = W / NC;
    const ground = new Float32Array(NC);

    const inZone = (x) => Math.abs(x - PILE_CX) <= PILE_HW * 2.4;

    const settleY = (x) => {
      if (!inZone(x)) return H + 50; // 範囲外：画面外まで落ちてリセット
      const col = Math.max(0, Math.min(NC-1, (x/cw)|0));
      return PILE_Y - ground[col];
    };

    const addGnd = (x, amt, max) => {
      const i = Math.max(0, Math.min(NC-1, (x/cw)|0));
      if (ground[i] >= max) return;
      ground[i] = Math.min(max, ground[i] + amt);
      for (let d = 1; d <= 7; d++) {
        const v = Math.max(0, ground[i] - d * 1.8);
        if (i-d >= 0)  ground[i-d] = Math.max(ground[i-d], v);
        if (i+d < NC)  ground[i+d] = Math.max(ground[i+d], v);
      }
    };

    // ── 春：桜 ─────────────────────────────────────────────────
    if (season.particle === 'sakura') {
      const COLORS = ['#ffb7c5','#ffc8d4','#ff9eb5','#ffd4de','#f8a0b8'];
      const settled = [];

      const petalPath = (r) => {
        ctx.beginPath();
        ctx.moveTo(0, r*0.9);
        ctx.bezierCurveTo(-r*.5,r*.5,  -r*.72,-r*.25, -r*.42,-r*.68);
        ctx.bezierCurveTo(-r*.18,-r*.96, 0,-r*.84, 0,-r*.84);
        ctx.bezierCurveTo(0,-r*.84, r*.18,-r*.96, r*.42,-r*.68);
        ctx.bezierCurveTo(r*.72,-r*.25, r*.5,r*.5, 0,r*.9);
      };

      const drawPetal = (x, y, r, angle, color, alpha, flat=false) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y); ctx.rotate(angle);
        if (flat) ctx.scale(1, 0.25);
        petalPath(r);
        const g = ctx.createRadialGradient(0,-r*.2,0, 0,0,r*1.1);
        g.addColorStop(0,'rgba(255,240,245,0.95)');
        g.addColorStop(.6,color+'dd');
        g.addColorStop(1,color+'88');
        ctx.fillStyle = g; ctx.fill();
        ctx.restore();
      };

      const flying = [
        ...Array.from({length:32},()=>({ x:Math.random()*W,y:Math.random()*H,r:Math.random()*2.2+1,  vx:(Math.random()-.5)*.35,vy:Math.random()*.9+.45,angle:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.052,alpha:Math.random()*.28+.1, phase:Math.random()*Math.PI*2,color:COLORS[Math.floor(Math.random()*COLORS.length)] })),
        ...Array.from({length:18},()=>({ x:Math.random()*W,y:Math.random()*H,r:Math.random()*3+2.8,  vx:(Math.random()-.5)*.42,vy:Math.random()*.7+.3, angle:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.038,alpha:Math.random()*.4+.18, phase:Math.random()*Math.PI*2,color:COLORS[Math.floor(Math.random()*COLORS.length)] })),
        ...Array.from({length:8}, ()=>({ x:Math.random()*W,y:Math.random()*H,r:Math.random()*3.5+5.5,vx:(Math.random()-.5)*.22,vy:Math.random()*.45+.18,angle:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.02, alpha:Math.random()*.48+.24,phase:Math.random()*Math.PI*2,color:COLORS[Math.floor(Math.random()*COLORS.length)] })),
      ];

      const tick = () => {
        ctx.clearRect(0, 0, W, H);

        // 積もった花びら
        settled.forEach(p => drawPetal(p.x, p.y, p.r, p.angle, p.color, p.alpha, true));

        // うっすらピンクのもや（積もり部分）
        const maxG = Math.max(...ground);
        if (maxG > 1) {
          const l = PILE_CX - PILE_HW*2.8, r2 = PILE_CX + PILE_HW*2.8;
          const lc = Math.max(0,(l/cw)|0), rc = Math.min(NC-1,(r2/cw)|0);
          ctx.beginPath(); ctx.moveTo(l, PILE_Y);
          for (let i=lc;i<=rc;i++) ctx.lineTo(i*cw+cw/2, PILE_Y-ground[i]*0.35);
          ctx.lineTo(r2, PILE_Y); ctx.closePath();
          ctx.fillStyle='rgba(255,185,210,0.08)'; ctx.fill();
        }

        flying.forEach(p => {
          p.phase += .013;
          p.x += p.vx + Math.sin(p.phase)*.42; p.y += p.vy; p.angle += p.spin;
          if (p.x<-20) p.x=W+20; if (p.x>W+20) p.x=-20;
          const gnd = settleY(p.x);
          if (p.y >= gnd - p.r) {
            if (inZone(p.x) && settled.length < 220)
              settled.push({x:p.x, y:gnd-p.r*.1, r:p.r, angle:p.angle+(Math.random()-.5)*.5, color:p.color, alpha:p.alpha*.68});
            if (inZone(p.x)) addGnd(p.x, p.r*.75, 65);
            p.y = -20; p.x = Math.random()*W;
          }
          drawPetal(p.x, p.y, p.r, p.angle, p.color, p.alpha);
        });

        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

    // ── 夏：花火 ────────────────────────────────────────────────
    } else if (season.particle === 'fireworks') {
      const rockets=[], bursts=[];
      let frame=0;
      const COLORS=[[55,90,100],[0,85,65],[200,80,65],[120,80,65],[280,80,65],[30,90,75]];

      const launch = () => {
        const [h,s,l]=COLORS[Math.floor(Math.random()*COLORS.length)];
        rockets.push({x:W*.15+Math.random()*W*.7, y:H, vy:-(5.5+Math.random()*3.5),
          targetY:H*.08+Math.random()*H*.35, h,s,l, trail:[]});
      };

      const explode=(x,y,h,s,l)=>{
        const sparks=[];
        const n=55+Math.floor(Math.random()*35);
        for(let i=0;i<n;i++){
          const a=(Math.PI*2*i)/n+(Math.random()-.5)*.1;
          const spd=2.8+Math.random()*2.2;
          sparks.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,decay:.009+Math.random()*.007,r:Math.random()*1.8+.6,h,s,l});
        }
        const n2=28+Math.floor(Math.random()*20);
        for(let i=0;i<n2;i++){
          const a=(Math.PI*2*i)/n2;
          const spd=1.4+Math.random()*1;
          sparks.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,decay:.013+Math.random()*.009,r:Math.random()*1.2+.4,h:(h+40)%360,s,l:l+10});
        }
        bursts.push({sparks});
      };

      const tick=()=>{
        ctx.fillStyle='rgba(12,11,9,0.22)'; ctx.fillRect(0,0,W,H);
        for(let i=rockets.length-1;i>=0;i--){
          const r=rockets[i];
          r.trail.push({x:r.x,y:r.y}); if(r.trail.length>10) r.trail.shift();
          r.y+=r.vy;
          r.trail.forEach((t,ti)=>{
            ctx.globalAlpha=(ti/r.trail.length)*.7;
            ctx.fillStyle=`hsl(${r.h},${r.s}%,${r.l}%)`;
            ctx.beginPath(); ctx.arc(t.x,t.y,1.8*(ti/r.trail.length),0,Math.PI*2); ctx.fill();
          });
          ctx.globalAlpha=1;
          if(r.y<=r.targetY){explode(r.x,r.y,r.h,r.s,r.l); rockets.splice(i,1);}
        }
        bursts.forEach(b=>{
          for(let i=b.sparks.length-1;i>=0;i--){
            const s=b.sparks[i];
            s.x+=s.vx; s.y+=s.vy; s.vy+=.038; s.vx*=.988; s.life-=s.decay;
            if(s.life<=0){b.sparks.splice(i,1);continue;}
            ctx.globalAlpha=Math.pow(s.life,.6)*.92;
            ctx.fillStyle=`hsl(${s.h},${s.s}%,${Math.min(90,s.l+s.life*35)}%)`;
            ctx.beginPath(); ctx.arc(s.x,s.y,s.r*Math.sqrt(s.life),0,Math.PI*2); ctx.fill();
          }
        });
        for(let i=bursts.length-1;i>=0;i--) if(bursts[i].sparks.length===0) bursts.splice(i,1);
        ctx.globalAlpha=1;
        frame++;
        if(frame%95===1||(rockets.length===0&&bursts.length===0&&frame>10)){
          launch(); if(Math.random()>.45) setTimeout(launch,900+Math.random()*600);
        }
        rafRef.current=requestAnimationFrame(tick);
      };
      launch(); setTimeout(launch,1200); tick();

    // ── 秋：紅葉 ────────────────────────────────────────────────
    } else if (season.particle === 'leaves') {
      const COLORS=['#c0521a','#d4681a','#b03a10','#e07828','#722808','#c85010','#e09828'];
      const settled=[];

      const drawLeaf=(x,y,r,angle,color,alpha,flat=false)=>{
        ctx.save();
        ctx.globalAlpha=alpha; ctx.translate(x,y); ctx.rotate(angle);
        if(flat) ctx.scale(1,.2);
        ctx.beginPath();
        ctx.moveTo(0,-r);
        ctx.bezierCurveTo(r*.9,-r*.35, r*.8,r*.35, 0,r*.55);
        ctx.bezierCurveTo(-r*.8,r*.35,-r*.9,-r*.35, 0,-r);
        ctx.fillStyle=color; ctx.fill();
        ctx.globalAlpha=alpha*.26; ctx.strokeStyle='#501808'; ctx.lineWidth=Math.max(.4,r*.065);
        ctx.beginPath(); ctx.moveTo(0,-r*.85); ctx.lineTo(0,r*.45); ctx.stroke();
        for(let v=-.5;v<=.5;v+=.25){
          const bx=r*.58*(1-Math.abs(v));
          ctx.beginPath(); ctx.moveTo(0,v*r*.7); ctx.lineTo(bx,v*r*.7-r*.12); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0,v*r*.7); ctx.lineTo(-bx,v*r*.7-r*.12); ctx.stroke();
        }
        ctx.restore();
      };

      const flying=[
        ...Array.from({length:16},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*4+2.5,  vx:(Math.random()-.5)*.38,vy:Math.random()*.55+.22,angle:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.028,alpha:Math.random()*.28+.1, phase:Math.random()*Math.PI*2,color:COLORS[Math.floor(Math.random()*COLORS.length)]})),
        ...Array.from({length:12},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*5+6,    vx:(Math.random()-.5)*.5, vy:Math.random()*.72+.28,angle:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.022,alpha:Math.random()*.45+.2, phase:Math.random()*Math.PI*2,color:COLORS[Math.floor(Math.random()*COLORS.length)]})),
        ...Array.from({length:5}, ()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*5+11,   vx:(Math.random()-.5)*.28,vy:Math.random()*.42+.15,angle:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.015,alpha:Math.random()*.5+.25, phase:Math.random()*Math.PI*2,color:COLORS[Math.floor(Math.random()*COLORS.length)]})),
      ];

      const tick=()=>{
        ctx.clearRect(0,0,W,H);
        settled.forEach(p=>drawLeaf(p.x,p.y,p.r,p.angle,p.color,p.alpha,true));

        // 積もり部分の暖かいもや
        const maxG=Math.max(...ground);
        if(maxG>1){
          const l=PILE_CX-PILE_HW*2.8, r2=PILE_CX+PILE_HW*2.8;
          const lc=Math.max(0,(l/cw)|0), rc=Math.min(NC-1,(r2/cw)|0);
          ctx.beginPath(); ctx.moveTo(l,PILE_Y);
          for(let i=lc;i<=rc;i++) ctx.lineTo(i*cw+cw/2, PILE_Y-ground[i]*.3);
          ctx.lineTo(r2,PILE_Y); ctx.closePath();
          ctx.fillStyle='rgba(160,70,20,0.07)'; ctx.fill();
        }

        flying.forEach(p=>{
          p.phase+=.012; p.x+=p.vx+Math.sin(p.phase)*.58; p.y+=p.vy; p.angle+=p.spin;
          if(p.x<-20) p.x=W+20; if(p.x>W+20) p.x=-20;
          const gnd=settleY(p.x);
          if(p.y>=gnd-p.r*.5){
            if(inZone(p.x)&&settled.length<180)
              settled.push({x:p.x,y:gnd-p.r*.08,r:p.r,angle:p.angle+(Math.random()-.5)*.6,color:p.color,alpha:p.alpha*.7});
            if(inZone(p.x)) addGnd(p.x,p.r*.88,58);
            p.y=-25; p.x=Math.random()*W;
          }
          drawLeaf(p.x,p.y,p.r,p.angle,p.color,p.alpha);
        });
        rafRef.current=requestAnimationFrame(tick);
      };
      tick();

    // ── 冬：雪 ─────────────────────────────────────────────────
    } else if (season.particle === 'snow') {
      const drawCrystal=(x,y,r,alpha)=>{
        ctx.save(); ctx.globalAlpha=alpha;
        ctx.strokeStyle=`rgba(210,230,255,${alpha})`; ctx.lineWidth=r*.25; ctx.lineCap='round';
        for(let i=0;i<6;i++){
          const a=(i*Math.PI)/3;
          ctx.save(); ctx.translate(x,y); ctx.rotate(a);
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-r); ctx.stroke();
          ctx.translate(0,-r*.55);
          for(let j=-1;j<=1;j+=2){
            ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(j*r*.32,-r*.32); ctx.stroke();
          }
          ctx.restore();
        }
        ctx.restore();
      };

      const bg  = Array.from({length:70}, ()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*.8+.3, vx:(Math.random()-.5)*.18,vy:Math.random()*.5+.15, alpha:Math.random()*.2+.06,phase:Math.random()*Math.PI*2}));
      const mid = Array.from({length:30}, ()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+1.2,vx:(Math.random()-.5)*.25,vy:Math.random()*.35+.1,  alpha:Math.random()*.3+.12,phase:Math.random()*Math.PI*2}));
      const fg  = Array.from({length:10}, ()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*3+4,   vx:(Math.random()-.5)*.1, vy:Math.random()*.18+.06, alpha:Math.random()*.22+.1, phase:Math.random()*Math.PI*2}));

      const drawSnowPile=()=>{
        const maxG=Math.max(...ground); if(maxG<1) return;
        const l=PILE_CX-PILE_HW*2.8, r2=PILE_CX+PILE_HW*2.8;
        const lc=Math.max(0,(l/cw)|0), rc=Math.min(NC-1,(r2/cw)|0);
        ctx.beginPath(); ctx.moveTo(l,PILE_Y);
        for(let i=lc;i<=rc;i++) ctx.lineTo(i*cw+cw/2, PILE_Y-ground[i]);
        ctx.lineTo(r2,PILE_Y); ctx.closePath();
        const sg=ctx.createLinearGradient(0,PILE_Y-maxG-8,0,PILE_Y);
        sg.addColorStop(0,'rgba(225,238,255,0.95)'); sg.addColorStop(1,'rgba(210,228,255,1.0)');
        ctx.fillStyle=sg; ctx.fill();
        // ハイライト縁
        ctx.beginPath();
        for(let i=lc;i<=rc;i++){
          if(i===lc) ctx.moveTo(i*cw+cw/2,PILE_Y-ground[i]);
          else ctx.lineTo(i*cw+cw/2,PILE_Y-ground[i]);
        }
        ctx.strokeStyle='rgba(240,248,255,0.75)'; ctx.lineWidth=1.5; ctx.stroke();
      };

      const tick=()=>{
        ctx.clearRect(0,0,W,H);
        drawSnowPile();

        [...bg,...mid,...fg].forEach((p,idx2)=>{
          const isFg=idx2>=bg.length+mid.length;
          const isMid=!isFg&&idx2>=bg.length;
          p.phase+=isFg?.007:isMid?.01:.009;
          p.x+=p.vx+Math.sin(p.phase)*(isFg?.12:isMid?.22:.18);
          p.y+=p.vy;
          if(p.x<-15) p.x=W+15; if(p.x>W+15) p.x=-15;
          const gnd=settleY(p.x);
          if(p.y>=gnd-p.r){
            if(inZone(p.x)) addGnd(p.x,isFg?1.5:isMid?.8:.4,88);
            p.y=-15; p.x=Math.random()*W;
          }
          if(isFg){
            drawCrystal(p.x,p.y,p.r,p.alpha);
          } else if(isMid){
            const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*2);
            g.addColorStop(0,`rgba(220,235,255,${p.alpha})`); g.addColorStop(1,'rgba(220,235,255,0)');
            ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*2,0,Math.PI*2); ctx.fill();
          } else {
            ctx.globalAlpha=p.alpha; ctx.fillStyle='#b8d0ea';
            ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
          }
        });
        rafRef.current=requestAnimationFrame(tick);
      };
      tick();
    }

    return ()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [season]);

  return <canvas ref={ref} width={800} height={600}
    className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ── メインコンポーネント ──────────────────────────────────────────
export default function SeasonSlider() {
  const [idx, setIdx]               = useState(0);
  const [imgSrc, setImgSrc]         = useState(SEASONS[0].img);
  const [imgOpacity, setImgOpacity] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef(null);

  const goTo=(next)=>{
    if(transitioning||next===idx) return;
    setTransitioning(true); setImgOpacity(0);
    setTimeout(()=>{
      setIdx(next); setImgSrc(SEASONS[next].img);
      setTimeout(()=>{ setImgOpacity(1); setTimeout(()=>setTransitioning(false),500); },50);
    },400);
  };

  const advance=()=>goTo((idx+1)%SEASONS.length);
  useEffect(()=>{
    timerRef.current=setInterval(advance,6000);
    return ()=>clearInterval(timerRef.current);
  },[idx,transitioning]);

  const cur=SEASONS[idx];

  return (
    <section className="relative overflow-hidden flex flex-col items-center justify-center"
      style={{ minHeight:'100vh', background:'linear-gradient(170deg,#0c0b09 0%,#100e0a 60%,#0e0d0b 100%)' }}>

      <RainCanvas />
      <ParticleCanvas season={cur} key={cur.id} />

      {/* 左上：ブランドカード */}
      <div className="absolute z-20" style={{ top:28, left:32 }}>
        <div style={{ padding:'14px 18px', borderRadius:18, background:'rgba(255,255,255,0.06)', backdropFilter:'blur(14px)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <img src="/okigasa-logo.jpg" alt="okigasa" style={{ width:42, height:42, borderRadius:'50%', objectFit:'cover', opacity:.9 }} />
            <div>
              <p style={{ fontSize:15, fontWeight:900, letterSpacing:'0.07em', color:'#d4a870', lineHeight:1.2 }}>okigasa</p>
              <p style={{ fontSize:9, color:'rgba(240,230,210,0.4)', letterSpacing:'0.1em', marginTop:3 }}>竹林から、雨の日まで。</p>
            </div>
          </div>
          <Link href="/map" style={{ display:'block', textAlign:'center', padding:'7px 14px', borderRadius:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', fontSize:10, fontWeight:700, color:'rgba(240,230,210,0.55)', letterSpacing:'0.08em', textDecoration:'none' }}>
            竹林マップ →
          </Link>
        </div>
      </div>

      {/* 傘＋ナビのみ */}
      <div className="relative z-10 flex flex-col items-center" style={{ padding:'60px 32px 48px' }}>

        <div style={{ position:'relative', width:290, height:380, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <UmbrellaImage src={imgSrc} accent={cur.accent} opacity={imgOpacity}
            transition={imgOpacity===0?'opacity 0.4s ease':'opacity 0.5s ease'} />
        </div>

        <div style={{ display:'flex', gap:12, marginTop:40 }}>
          {SEASONS.map((s,i)=>{
            const active=i===idx;
            return (
              <button key={s.id} onClick={()=>{ clearInterval(timerRef.current); goTo(i); }}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'12px 20px', borderRadius:999, minWidth:68, background:active?cur.accent:'rgba(255,255,255,0.06)', border:`1.5px solid ${active?cur.accent:'rgba(255,255,255,0.12)'}`, color:active?'#0c0b09':'rgba(240,230,210,0.35)', cursor:'pointer', transition:'all 0.45s cubic-bezier(0.4,0,0.2,1)', transform:active?'scale(1.06)':'scale(1)' }}>
                <span style={{ fontSize:17, fontWeight:900, lineHeight:1 }}>{s.jp}</span>
                <span style={{ fontSize:8, letterSpacing:'0.2em', fontWeight:700, opacity:.8 }}>{s.en}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
