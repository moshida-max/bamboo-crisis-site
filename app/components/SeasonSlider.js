'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const SEASONS = [
  { id:'spring', jp:'春', en:'SPRING', img:'/umbrella-spring.png',  particle:'sakura',    accent:'#e8a0b4' },
  { id:'summer', jp:'夏', en:'SUMMER', img:'/umbrella-summer.png',  particle:'fireworks', accent:'#e8c87a' },
  { id:'autumn', jp:'秋', en:'AUTUMN', img:'/umbrella-autumn.png',  particle:'leaves',    accent:'#d08050' },
  { id:'winter', jp:'冬', en:'WINTER', img:'/umbrella-winter.png',  particle:'snow',      accent:'#88b8d8' },
];

const PILE_Y_RATIO  = 0.66;
const PILE_HW_RATIO = 0.13;

// ── 雨 Canvas ────────────────────────────────────────────────────
function RainCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    const drops = Array.from({length:55}, ()=>({
      x:Math.random()*c.width, y:Math.random()*c.height,
      l:Math.random()*15+6, speed:Math.random()*3+2, opacity:Math.random()*0.13+0.04,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      drops.forEach(d => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(160,200,180,${d.opacity})`; ctx.lineWidth=0.6;
        ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-4,d.y+d.l); ctx.stroke();
        d.y+=d.speed; if(d.y>c.height){d.y=-20;d.x=Math.random()*c.width;}
      });
      raf=requestAnimationFrame(draw);
    };
    draw(); return ()=>cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={ref} width={1400} height={900}
    className="absolute inset-0 w-full h-full pointer-events-none" style={{opacity:0.4}}/>;
}

// ── 白背景除去 傘 ────────────────────────────────────────────────
function UmbrellaImage({ src, accent, opacity, transition, glowColor }) {
  const canvasRef = useRef(null);
  const W=270, H=360;
  useEffect(()=>{
    if(!src) return;
    const img=new Image();
    img.onload=()=>{
      const c=canvasRef.current; if(!c) return;
      c.width=W*2; c.height=H*2;
      const ctx=c.getContext('2d');
      const scale=Math.min((W*2)/img.width,(H*2)/img.height);
      const dw=img.width*scale, dh=img.height*scale;
      ctx.clearRect(0,0,c.width,c.height);
      ctx.drawImage(img,(W*2-dw)/2,(H*2-dh)/2,dw,dh);
      const data=ctx.getImageData(0,0,c.width,c.height); const d=data.data;
      for(let i=0;i<d.length;i+=4){
        const r=d[i],g=d[i+1],b=d[i+2];
        const bright=r*0.299+g*0.587+b*0.114, sat=Math.max(r,g,b)-Math.min(r,g,b);
        if(bright>210&&sat<45) d[i+3]=Math.round(d[i+3]*Math.max(0,1-(bright-210)/45));
      }
      ctx.putImageData(data,0,0);
    };
    img.src=src;
  },[src]);
  return <canvas ref={canvasRef} style={{
    width:W, height:H, display:'block', opacity, transition,
    filter: glowColor
      ? `drop-shadow(0 0 35px ${glowColor}) drop-shadow(0 20px 55px ${accent}65)`
      : `drop-shadow(0 20px 55px ${accent}65)`,
  }}/>;
}

// ── パーティクル Canvas ──────────────────────────────────────────
function ParticleCanvas({ season, onExplode }) {
  const ref = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x:-9999, y:-9999 });

  useEffect(()=>{
    const c=ref.current; if(!c) return;
    const ctx=c.getContext('2d');
    const W=c.width, H=c.height;

    // マウス追跡
    const onMove=(e)=>{
      const r=c.getBoundingClientRect();
      mouseRef.current={ x:(e.clientX-r.left)*(W/r.width), y:(e.clientY-r.top)*(H/r.height) };
    };
    document.addEventListener('mousemove',onMove);

    // 積もり管理
    const PILE_Y=H*PILE_Y_RATIO, PILE_CX=W*.5, PILE_HW=W*PILE_HW_RATIO;
    const NC=100, cw=W/NC, ground=new Float32Array(NC);
    const inZone=(x)=>Math.abs(x-PILE_CX)<=PILE_HW*2.4;
    const settleY=(x)=>{
      if(!inZone(x)) return H+50;
      return PILE_Y-ground[Math.max(0,Math.min(NC-1,(x/cw)|0))];
    };
    const addGnd=(x,amt,max)=>{
      const i=Math.max(0,Math.min(NC-1,(x/cw)|0));
      if(ground[i]>=max) return;
      ground[i]=Math.min(max,ground[i]+amt);
      for(let d=1;d<=7;d++){
        const v=Math.max(0,ground[i]-d*1.8);
        if(i-d>=0) ground[i-d]=Math.max(ground[i-d],v);
        if(i+d<NC)  ground[i+d]=Math.max(ground[i+d],v);
      }
    };

    // 傘ドーム（衝突判定）
    const DOME_CX=W*.5, DOME_CY=H*.38, DOME_R=W*.1;
    const domeCollide=(p)=>{
      const dx=p.x-DOME_CX, dy=p.y-DOME_CY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<DOME_R&&dist>0){
        const nx=dx/dist, ny=dy/dist;
        p.x=DOME_CX+nx*(DOME_R+1); p.y=DOME_CY+ny*(DOME_R+1);
        const dot=p.vx*nx+p.vy*ny; if(dot<0){p.vx-=dot*nx; p.vy-=dot*ny;}
        p.vx+=nx*0.35; p.vy+=0.2;
      }
    };

    // マウス反発
    const mouseRepel=(p)=>{
      const {x:mx,y:my}=mouseRef.current;
      const dx=p.x-mx, dy=p.y-my, dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<30&&dist>0){const f=(30-dist)/30*.3; p.vx+=(dx/dist)*f; p.vy+=(dy/dist)*f;}
    };

    // ────────────────────────────────────────────────────────────
    // 春：桜
    // ────────────────────────────────────────────────────────────
    if(season.particle==='sakura'){
      // SVGパスで本物の花びら形（仕様に沿う）
      // M0,-8 C4,-8 8,-4 8,0 C8,4 4,8 0,10 C-4,8 -8,4 -8,0 C-8,-4 -4,-8 0,-8Z をスケール
      const petalPath=(s)=>{
        ctx.beginPath();
        ctx.moveTo(0,-8*s);
        ctx.bezierCurveTo(4*s,-8*s, 8*s,-4*s, 8*s,0);
        ctx.bezierCurveTo(8*s,4*s, 4*s,8*s, 0,10*s);
        ctx.bezierCurveTo(-4*s,8*s, -8*s,4*s, -8*s,0);
        ctx.bezierCurveTo(-8*s,-4*s, -4*s,-8*s, 0,-8*s);
        ctx.closePath();
      };

      const mk=(layer)=>{
        const [sz,spd,alp,cnt] = layer===0?[1.6,.65,.28,22]:layer===1?[3.2,1.0,.60,15]:[5.5,1.4,.88,7];
        return Array.from({length:cnt},()=>({
          x:Math.random()*W, y:Math.random()*H,
          r:sz*(0.7+Math.random()*.6),
          vx:(Math.random()-.5)*.5*(1+Math.random()*.4),
          vy:(Math.random()*.6+.35)*spd*(0.8+Math.random()*.4),
          angle:Math.random()*Math.PI*2,
          spin:(Math.random()-.5)*(.04+Math.random()*.04),
          baseAlpha:alp*(0.7+Math.random()*.6),
          rotY:Math.random()*Math.PI*2,
          rotYSpeed:(Math.random()-.5)*(.03+Math.random()*.04),
          phase:Math.random()*Math.PI*2,
          gravity:.03+Math.random()*.05,
          seed:Math.random(),
          airX:.995+Math.random()*.003,
          airY:.993+Math.random()*.004,
        }));
      };
      const layers=[mk(0),mk(1),mk(2)];
      const settled=[];

      const drawPetal=(x,y,r,angle,baseAlpha,rotY,flat=false)=>{
        const s=r/9;
        const scaleX=Math.abs(Math.cos(rotY));
        const alpha=baseAlpha*(flat?.65:(.3+.7*Math.abs(Math.cos(rotY))));
        if(alpha<0.01) return;
        ctx.save();
        ctx.globalAlpha=alpha;
        ctx.translate(x,y); ctx.rotate(angle);
        if(flat) ctx.scale(1,.22);
        else ctx.scale(scaleX,1);
        petalPath(s);
        const g=ctx.createRadialGradient(0,-2*s,0, 0,0,9*s);
        g.addColorStop(0,'#E8B4C8'); g.addColorStop(1,'#FFF0F5');
        ctx.fillStyle=g; ctx.fill();
        // ハイライト
        ctx.globalAlpha=alpha*.42;
        ctx.fillStyle='rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.ellipse(-2.5*s,-5*s,2.5*s,1.4*s,-.4,0,Math.PI*2); ctx.fill();
        ctx.restore();
      };

      let frame=0;
      const tick=()=>{
        ctx.clearRect(0,0,W,H);
        // ピンクアンビエント光
        const amb=ctx.createRadialGradient(W*.5,H*.45,0,W*.5,H*.45,H*.7);
        amb.addColorStop(0,'rgba(255,210,225,0.045)'); amb.addColorStop(1,'rgba(255,210,225,0)');
        ctx.fillStyle=amb; ctx.fillRect(0,0,W,H);

        settled.forEach(p=>drawPetal(p.x,p.y,p.r,p.angle,p.baseAlpha,0,true));

        const maxG=Math.max(...ground);
        if(maxG>1){
          const l=PILE_CX-PILE_HW*2.8, r2=PILE_CX+PILE_HW*2.8;
          const lc=Math.max(0,(l/cw)|0), rc=Math.min(NC-1,(r2/cw)|0);
          ctx.beginPath(); ctx.moveTo(l,PILE_Y);
          for(let i=lc;i<=rc;i++) ctx.lineTo(i*cw+cw/2,PILE_Y-ground[i]*.3);
          ctx.lineTo(r2,PILE_Y); ctx.closePath();
          ctx.fillStyle='rgba(255,185,210,0.07)'; ctx.fill();
        }

        layers.forEach(layer=>layer.forEach(p=>{
          // 物理
          p.vy+=p.gravity; p.vx*=p.airX; p.vy*=p.airY;
          p.phase+=.013;
          p.x+=p.vx+Math.sin(p.phase)*1.5+Math.sin(frame*.005+p.seed*10)*.5;
          p.y+=p.vy;
          p.angle+=p.spin; p.rotY+=p.rotYSpeed;
          // 15%確率でふわっと上昇
          if(Math.random()<.003) p.vy-=.6;
          // ドーム衝突
          domeCollide(p);
          // マウス反発
          mouseRepel(p);

          if(p.x<-20) p.x=W+20; if(p.x>W+20) p.x=-20;
          const gnd=settleY(p.x);
          if(p.y>=gnd-p.r*.5){
            if(inZone(p.x)&&settled.length<250)
              settled.push({x:p.x,y:gnd-p.r*.08,r:p.r,angle:p.angle+(Math.random()-.5)*.6,baseAlpha:p.baseAlpha*.6});
            if(inZone(p.x)) addGnd(p.x,p.r*.7,65);
            p.y=-20; p.x=Math.random()*W; p.vy=p.gravity*2; p.vx=(Math.random()-.5)*.5;
          }
          drawPetal(p.x,p.y,p.r,p.angle,p.baseAlpha,p.rotY);
        }));
        frame++;
        rafRef.current=requestAnimationFrame(tick);
      };
      tick();

    // ────────────────────────────────────────────────────────────
    // 夏：花火（3段階）
    // ────────────────────────────────────────────────────────────
    } else if(season.particle==='fireworks'){
      const SCHEMES=[
        {inner:'#FFD700',outer:'#FF6B00',flash:'#FFD700',fr:255,fg:215,fb:0},
        {inner:'#B0E0FF',outer:'#FFFFFF',flash:'#C8EAFF',fr:176,fg:224,fb:255},
        {inner:'#FF4444',outer:'#FF9966',flash:'#FF5555',fr:255,fg:80,fb:80},
        {inner:'#FFFFFF',outer:'#AAD4FF',flash:'#FFFFFF',fr:255,fg:255,fb:255},
        {inner:'#88FF99',outer:'#FFFF66',flash:'#88FF99',fr:136,fg:255,fb:153},
        {inner:'#EE88FF',outer:'#FF99EE',flash:'#EE88FF',fr:238,fg:136,fb:255},
      ];

      const rockets=[];
      let frame=0;

      const launch=()=>{
        const sc=SCHEMES[Math.floor(Math.random()*SCHEMES.length)];
        rockets.push({
          phase:'launch',
          x:W*.15+Math.random()*W*.7, y:H,
          vy:-(8+Math.random()*4),
          targetY:H*.07+Math.random()*H*.32,
          sc, trail:[], sparks:[], flashAlpha:0, flashFrame:0,
        });
      };

      const explode=(r)=>{
        r.phase='burst';
        r.flashAlpha=0.92; r.flashFrame=0;
        onExplode?.(`rgba(${r.sc.fr},${r.sc.fg},${r.sc.fb},0.7)`);
        const n=130+Math.floor(Math.random()*60);
        for(let i=0;i<n;i++){
          const a=(Math.PI*2*i)/n+(Math.random()-.5)*.12;
          const spd=2.2+Math.random()*2.8;
          r.sparks.push({
            x:r.x,y:r.y,
            vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
            life:1,decay:.005+Math.random()*.007,
            r:Math.random()*1.6+.5, tail:[],
            inner: i%3===0, // 一部は内輪色
          });
        }
        // 内側の輪（遅い）
        const n2=32+Math.floor(Math.random()*18);
        for(let i=0;i<n2;i++){
          const a=(Math.PI*2*i)/n2;
          const spd=1.2+Math.random()*.8;
          r.sparks.push({
            x:r.x,y:r.y, vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
            life:1,decay:.008+Math.random()*.008, r:Math.random()*.9+.3, tail:[],inner:true,
          });
        }
      };

      const tick=()=>{
        ctx.fillStyle='rgba(12,11,9,0.20)'; ctx.fillRect(0,0,W,H);

        for(let ri=rockets.length-1;ri>=0;ri--){
          const r=rockets[ri];

          if(r.phase==='launch'){
            r.trail.push({x:r.x,y:r.y}); if(r.trail.length>14) r.trail.shift();
            r.vy+=.10; // 重力で減速
            r.y+=r.vy;
            // 軌跡
            r.trail.forEach((t,ti)=>{
              const a=(ti/r.trail.length)*.85;
              ctx.globalAlpha=a;
              ctx.fillStyle='#fffde0';
              ctx.beginPath(); ctx.arc(t.x,t.y,1.6*(ti/r.trail.length),0,Math.PI*2); ctx.fill();
            });
            ctx.globalAlpha=1;
            if(r.y<=r.targetY) explode(r);

          } else {
            // 爆発フラッシュ
            r.flashFrame++;
            if(r.flashAlpha>0){
              // 画面全体にうっすらフラッシュ
              ctx.save();
              ctx.globalAlpha=r.flashAlpha*.13;
              ctx.fillStyle=r.sc.flash; ctx.fillRect(0,0,W,H);
              // 中心閃光
              const fr=55*(1-r.flashFrame/12);
              if(fr>0){
                const fg=ctx.createRadialGradient(r.x,r.y,0,r.x,r.y,fr);
                fg.addColorStop(0,`rgba(255,255,255,${r.flashAlpha*.85})`);
                fg.addColorStop(1,'rgba(255,255,255,0)');
                ctx.globalAlpha=1; ctx.fillStyle=fg;
                ctx.beginPath(); ctx.arc(r.x,r.y,fr,0,Math.PI*2); ctx.fill();
              }
              // 傘へのリフレクション
              ctx.globalAlpha=r.flashAlpha*.4;
              const umbG=ctx.createRadialGradient(DOME_CX,DOME_CY,0,DOME_CX,DOME_CY,DOME_R*2.5);
              umbG.addColorStop(0,`rgba(${r.sc.fr},${r.sc.fg},${r.sc.fb},0.25)`);
              umbG.addColorStop(1,'rgba(0,0,0,0)');
              ctx.fillStyle=umbG; ctx.beginPath(); ctx.arc(DOME_CX,DOME_CY,DOME_R*2.5,0,Math.PI*2); ctx.fill();
              ctx.restore();
              r.flashAlpha-=.08;
            }

            // 火花
            for(let i=r.sparks.length-1;i>=0;i--){
              const s=r.sparks[i];
              s.tail.push({x:s.x,y:s.y}); if(s.tail.length>5) s.tail.shift();
              s.x+=s.vx; s.y+=s.vy;
              s.vy+=.12; s.vx*=.990;
              s.life-=s.decay; if(s.life<=0){r.sparks.splice(i,1);continue;}
              // 尾
              s.tail.forEach((t,ti)=>{
                ctx.globalAlpha=(ti/s.tail.length)*s.life*.5;
                ctx.fillStyle=s.inner?r.sc.inner:r.sc.outer;
                ctx.beginPath(); ctx.arc(t.x,t.y,s.r*.5,0,Math.PI*2); ctx.fill();
              });
              ctx.globalAlpha=Math.pow(s.life,.5)*.9;
              ctx.fillStyle=s.life>.45?r.sc.inner:r.sc.outer;
              ctx.beginPath(); ctx.arc(s.x,s.y,s.r*Math.sqrt(s.life),0,Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha=1;
            if(r.sparks.length===0) rockets.splice(ri,1);
          }
        }

        frame++;
        if(frame%100===1||(rockets.length===0&&frame>10)){
          launch();
          if(Math.random()>.4) setTimeout(launch,900+Math.random()*700);
        }
        rafRef.current=requestAnimationFrame(tick);
      };
      launch(); setTimeout(launch,1200); tick();

    // ────────────────────────────────────────────────────────────
    // 秋：落ち葉（3種類）
    // ────────────────────────────────────────────────────────────
    } else if(season.particle==='leaves'){
      // 色ペア（グラデーション用）
      const COLOR_PAIRS=[
        ['#8B0000','#CC4400'],['#CC4400','#D47C00'],['#D47C00','#8B4500'],
        ['#8B0000','#D47C00'],['#2D1B00','#8B0000'],['#CC4400','#FFAA00'],
      ];

      // 種類A：広葉樹
      const drawLeafA=(r,c1,c2)=>{
        ctx.beginPath();
        ctx.moveTo(0,-r);
        ctx.bezierCurveTo(r*.9,-r*.35, r*.8,r*.35, 0,r*.55);
        ctx.bezierCurveTo(-r*.8,r*.35,-r*.9,-r*.35, 0,-r);
        const g=ctx.createLinearGradient(0,-r,0,r*.6);
        g.addColorStop(0,c1); g.addColorStop(1,c2);
        ctx.fillStyle=g; ctx.fill();
        // 葉脈
        ctx.save(); ctx.globalAlpha*=.3; ctx.strokeStyle='#1a0800';
        ctx.lineWidth=Math.max(.4,r*.06);
        ctx.beginPath(); ctx.moveTo(0,-r*.82); ctx.lineTo(0,r*.42); ctx.stroke();
        for(let v=-.5;v<=.5;v+=.25){
          const bx=r*.56*(1-Math.abs(v));
          ctx.beginPath(); ctx.moveTo(0,v*r*.7); ctx.lineTo(bx,v*r*.7-r*.12); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0,v*r*.7); ctx.lineTo(-bx,v*r*.7-r*.12); ctx.stroke();
        }
        ctx.restore();
      };

      // 種類B：イチョウ
      const drawLeafB=(r,c1,c2)=>{
        ctx.beginPath();
        ctx.moveTo(0,r*.15);
        ctx.bezierCurveTo(-r*.5,r*.1, -r*1.0,-r*.4, -r*.9,-r*.82);
        ctx.bezierCurveTo(-r*.65,-r*1.1, -r*.2,-r*1.0, 0,-r*.95);
        ctx.bezierCurveTo(r*.2,-r*1.0, r*.65,-r*1.1, r*.9,-r*.82);
        ctx.bezierCurveTo(r*1.0,-r*.4, r*.5,r*.1, 0,r*.15);
        ctx.closePath();
        const g=ctx.createLinearGradient(-r*.5,-r*1.1,r*.5,r*.15);
        g.addColorStop(0,c1); g.addColorStop(1,c2);
        ctx.fillStyle=g; ctx.fill();
        // イチョウの扇状脈
        ctx.save(); ctx.globalAlpha*=.25; ctx.strokeStyle='#1a0800'; ctx.lineWidth=Math.max(.4,r*.05);
        for(let i=-2;i<=2;i++){
          const a=(i/3)*(.8);
          ctx.beginPath(); ctx.moveTo(0,r*.1);
          ctx.lineTo(Math.sin(a)*r*.8,-r*.85-Math.cos(a)*r*.1); ctx.stroke();
        }
        ctx.restore();
      };

      // 種類C：ボロボロ枯れ葉（シード依存ジッター）
      const drawLeafC=(r,c1,c2,seed)=>{
        const nPts=14;
        ctx.beginPath();
        for(let i=0;i<nPts;i++){
          const a=(i/nPts)*Math.PI*2;
          const j=Math.sin(seed*1.7+i*2.3)*0.35;
          const rad=r*(0.7+j)*(Math.abs(Math.sin(a))*.25+.75);
          const x=Math.cos(a)*rad*.85, y=Math.sin(a)*rad;
          i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.closePath();
        const g=ctx.createLinearGradient(0,-r,0,r);
        g.addColorStop(0,c1); g.addColorStop(1,c2);
        ctx.fillStyle=g; ctx.fill();
      };

      const drawLeaf=(p,flat=false)=>{
        ctx.save();
        ctx.globalAlpha=p.alpha*(flat?.62:1);
        ctx.translate(p.x,p.y); ctx.rotate(p.angle);
        if(flat) ctx.scale(1,.2);
        const [c1,c2]=COLOR_PAIRS[p.colorPair];
        if(p.type===0) drawLeafA(p.r,c1,c2);
        else if(p.type===1) drawLeafB(p.r,c1,c2);
        else drawLeafC(p.r,c1,c2,p.seed);
        ctx.restore();
      };

      const mk=(layer)=>{
        const [sz,spd,alp,cnt]=layer===0?[3.5,.55,.25,14]:layer===1?[7,1.0,.55,10]:[12,1.4,.85,5];
        return Array.from({length:cnt},()=>({
          x:Math.random()*W, y:Math.random()*H,
          r:sz*(0.7+Math.random()*.6),
          vx:(Math.random()-.5)*.7*(1+Math.random()*.4),
          vy:(Math.random()*.6+.35)*spd*(0.8+Math.random()*.4),
          angle:Math.random()*Math.PI*2,
          spin:(Math.random()-.5)*(.06+Math.random()*.08),
          alpha:alp*(0.7+Math.random()*.6),
          phase:Math.random()*Math.PI*2,
          gravity:.06+Math.random()*.09,
          airX:.990+Math.random()*.005,
          airY:.988+Math.random()*.006,
          type:Math.floor(Math.random()*3),
          colorPair:Math.floor(Math.random()*COLOR_PAIRS.length),
          seed:Math.random()*100,
        }));
      };
      const layers=[mk(0),mk(1),mk(2)];
      const settled=[];
      let frame=0, gustStrength=0;

      const tick=()=>{
        ctx.clearRect(0,0,W,H);
        settled.forEach(p=>drawLeaf(p,true));

        const maxG=Math.max(...ground);
        if(maxG>1){
          const l=PILE_CX-PILE_HW*2.8,r2=PILE_CX+PILE_HW*2.8;
          const lc=Math.max(0,(l/cw)|0),rc=Math.min(NC-1,(r2/cw)|0);
          ctx.beginPath(); ctx.moveTo(l,PILE_Y);
          for(let i=lc;i<=rc;i++) ctx.lineTo(i*cw+cw/2,PILE_Y-ground[i]*.28);
          ctx.lineTo(r2,PILE_Y); ctx.closePath();
          ctx.fillStyle='rgba(140,60,15,0.06)'; ctx.fill();
        }

        // 突風
        frame++;
        if(frame%180===0) gustStrength=2+Math.random()*3.5;
        gustStrength*=.97;

        layers.forEach(layer=>layer.forEach(p=>{
          p.vy+=p.gravity; p.vx*=p.airX; p.vy*=p.airY;
          p.phase+=.015;
          // 台風感のある強い風
          const wind=Math.sin(frame*.03+p.phase)*3.0+(Math.sin(frame*.007+p.seed)*.8)+gustStrength*(Math.random()-.5)*.5;
          p.x+=p.vx+wind*(.04+p.r*.003);
          p.y+=p.vy;
          p.angle+=p.spin;
          domeCollide(p); mouseRepel(p);
          if(p.x<-25) p.x=W+25; if(p.x>W+25) p.x=-25;
          const gnd=settleY(p.x);
          if(p.y>=gnd-p.r*.4){
            if(inZone(p.x)&&settled.length<180)
              settled.push({...p,y:gnd-p.r*.06,angle:p.angle+(Math.random()-.5)*.7,alpha:p.alpha*.62});
            if(inZone(p.x)) addGnd(p.x,p.r*.82,58);
            p.y=-25; p.x=Math.random()*W; p.vy=p.gravity*2; p.vx=(Math.random()-.5)*.7;
          }
          drawLeaf(p);
        }));
        rafRef.current=requestAnimationFrame(tick);
      };
      tick();

    // ────────────────────────────────────────────────────────────
    // 冬：雪（3種類）
    // ────────────────────────────────────────────────────────────
    } else if(season.particle==='snow'){
      // 種類A：結晶（アームの長さ個別設定）
      const drawCrystal=(x,y,r,alpha,arms)=>{
        ctx.save(); ctx.globalAlpha=alpha;
        ctx.strokeStyle=`rgba(220,238,255,${Math.min(1,alpha*1.2)})`; ctx.lineCap='round';
        for(let i=0;i<6;i++){
          const a=(i*Math.PI)/3;
          const al=r*arms[i];
          ctx.lineWidth=r*.14;
          ctx.beginPath(); ctx.moveTo(x,y);
          ctx.lineTo(x+Math.cos(a)*al,y+Math.sin(a)*al); ctx.stroke();
          // 小枝（2段）
          ctx.lineWidth=r*.09;
          for(let depth=0;depth<2;depth++){
            const bpos=.45+depth*.3;
            const bx=x+Math.cos(a)*al*bpos, by=y+Math.sin(a)*al*bpos;
            const bl=al*(depth===0?.35:.22);
            for(let j=-1;j<=1;j+=2){
              const ba=a+j*Math.PI/3;
              ctx.beginPath(); ctx.moveTo(bx,by);
              ctx.lineTo(bx+Math.cos(ba)*bl,by+Math.sin(ba)*bl); ctx.stroke();
            }
          }
        }
        // 中心輝点
        const cg=ctx.createRadialGradient(x,y,0,x,y,r*.35);
        cg.addColorStop(0,'rgba(255,255,255,.9)'); cg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(x,y,r*.35,0,Math.PI*2); ctx.fill();
        ctx.restore();
      };

      // 種類B：粉雪（小さい円、輝点付き）
      const drawPowder=(x,y,r,alpha)=>{
        ctx.save();
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,`rgba(240,248,255,${alpha})`);
        g.addColorStop(.4,`rgba(220,235,255,${alpha*.7})`);
        g.addColorStop(1,'rgba(220,235,255,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
        ctx.restore();
      };

      // 種類C：綿雪（不規則blob）
      const drawFluffySnow=(x,y,r,alpha)=>{
        ctx.save(); ctx.globalAlpha=alpha;
        const nBlobs=6;
        for(let i=0;i<nBlobs;i++){
          const a=(i/nBlobs)*Math.PI*2;
          const br=r*(.38+Math.sin(i*2.3)*.12);
          const bx=x+Math.cos(a)*r*.38, by=y+Math.sin(a)*r*.38;
          const g=ctx.createRadialGradient(bx,by,0,bx,by,br*1.4);
          g.addColorStop(0,'rgba(255,255,255,.92)'); g.addColorStop(1,'rgba(240,248,255,0)');
          ctx.fillStyle=g; ctx.beginPath(); ctx.arc(bx,by,br*1.4,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
      };

      const mkB=(cnt,sz,spd,alp)=>Array.from({length:cnt},()=>({
        x:Math.random()*W, y:Math.random()*H,
        r:sz*(0.6+Math.random()*.8), vx:(Math.random()-.5)*.2, vy:Math.random()*spd+.08,
        alpha:alp*(0.6+Math.random()*.8), phase:Math.random()*Math.PI*2,
        gravity:.01+Math.random()*.03, airX:.997, airY:.998,
        arms: Array.from({length:6},()=>0.75+Math.random()*.5),
      }));

      const bgFlakes  = mkB(60, 1.5, .5,  .18); // 粉雪（遠景）
      const midFlakes = mkB(25, 3.5, .35, .35); // 粉雪（中景）
      const crystals  = mkB(9,  6.5, .18, .42); // 結晶（前景）
      const fluffy    = mkB(8,  9,   .12, .28); // 綿雪（前景）

      const drawSnowPile=()=>{
        const maxG=Math.max(...ground); if(maxG<1) return;
        const l=PILE_CX-PILE_HW*2.8,r2=PILE_CX+PILE_HW*2.8;
        const lc=Math.max(0,(l/cw)|0),rc=Math.min(NC-1,(r2/cw)|0);
        ctx.beginPath(); ctx.moveTo(l,PILE_Y);
        for(let i=lc;i<=rc;i++) ctx.lineTo(i*cw+cw/2,PILE_Y-ground[i]);
        ctx.lineTo(r2,PILE_Y); ctx.closePath();
        const sg=ctx.createLinearGradient(0,PILE_Y-maxG-8,0,PILE_Y);
        sg.addColorStop(0,'rgba(225,240,255,0.97)'); sg.addColorStop(1,'rgba(210,230,255,1.0)');
        ctx.fillStyle=sg; ctx.fill();
        ctx.beginPath();
        for(let i=lc;i<=rc;i++){
          i===lc?ctx.moveTo(i*cw+cw/2,PILE_Y-ground[i]):ctx.lineTo(i*cw+cw/2,PILE_Y-ground[i]);
        }
        ctx.strokeStyle='rgba(245,252,255,0.8)'; ctx.lineWidth=1.8; ctx.stroke();
      };

      let frame=0;
      const tick=()=>{
        ctx.clearRect(0,0,W,H);
        // 青白色温度オーバーレイ
        ctx.save(); ctx.globalAlpha=.055; ctx.fillStyle='#E8F4FF'; ctx.fillRect(0,0,W,H); ctx.restore();
        drawSnowPile();

        const allFlakes=[...bgFlakes,...midFlakes,...crystals,...fluffy];
        allFlakes.forEach((p,idx2)=>{
          const isCrystal=idx2>=bgFlakes.length+midFlakes.length&&idx2<bgFlakes.length+midFlakes.length+crystals.length;
          const isFluffy =idx2>=bgFlakes.length+midFlakes.length+crystals.length;
          p.vy+=p.gravity; p.vx*=p.airX; p.vy*=p.airY;
          p.phase+=.008+(isFluffy?.002:0);
          // 非常に穏やかな揺れ
          p.x+=p.vx+Math.sin(p.phase*.8+idx2*.5)*.45;
          p.y+=p.vy;
          if(p.x<-15) p.x=W+15; if(p.x>W+15) p.x=-15;
          domeCollide(p); mouseRepel(p);
          const gnd=settleY(p.x);
          if(p.y>=gnd-p.r){
            if(inZone(p.x)) addGnd(p.x,isFluffy?1.8:isCrystal?1.3:.45,90);
            p.y=-15; p.x=Math.random()*W; p.vy=p.gravity;
          }
          if(isCrystal) drawCrystal(p.x,p.y,p.r,p.alpha,p.arms);
          else if(isFluffy) drawFluffySnow(p.x,p.y,p.r,p.alpha);
          else drawPowder(p.x,p.y,p.r,p.alpha);
        });
        frame++;
        rafRef.current=requestAnimationFrame(tick);
      };
      tick();
    }

    return ()=>{
      document.removeEventListener('mousemove',onMove);
      if(rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  },[season]);

  return <canvas ref={ref} width={800} height={600}
    className="absolute inset-0 w-full h-full pointer-events-none"/>;
}

// ── メインコンポーネント ──────────────────────────────────────────
export default function SeasonSlider() {
  const [idx,setIdx]               = useState(0);
  const [imgSrc,setImgSrc]         = useState(SEASONS[0].img);
  const [imgOpacity,setImgOpacity] = useState(1);
  const [transitioning,setTransitioning] = useState(false);
  const [umbGlow,setUmbGlow]       = useState(null);
  const timerRef = useRef(null);

  const goTo=(next)=>{
    if(transitioning||next===idx) return;
    setTransitioning(true); setImgOpacity(0);
    setTimeout(()=>{
      setIdx(next); setImgSrc(SEASONS[next].img);
      setTimeout(()=>{setImgOpacity(1);setTimeout(()=>setTransitioning(false),500);},50);
    },400);
  };

  const advance=()=>goTo((idx+1)%SEASONS.length);
  useEffect(()=>{
    timerRef.current=setInterval(advance,6000);
    return ()=>clearInterval(timerRef.current);
  },[idx,transitioning]);

  const handleExplode=(color)=>{
    setUmbGlow(color); setTimeout(()=>setUmbGlow(null),900);
  };

  const cur=SEASONS[idx];

  return (
    <section className="relative overflow-hidden flex flex-col items-center justify-center"
      style={{minHeight:'100vh',background:'linear-gradient(170deg,#0c0b09 0%,#100e0a 60%,#0e0d0b 100%)'}}>

      <RainCanvas/>
      <ParticleCanvas season={cur} key={cur.id} onExplode={handleExplode}/>

      {/* 左上ブランドカード */}
      <div className="absolute z-20" style={{top:28,left:32}}>
        <div style={{padding:'14px 18px',borderRadius:18,background:'rgba(255,255,255,0.06)',backdropFilter:'blur(14px)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <img src="/okigasa-logo.jpg" alt="okigasa" style={{width:42,height:42,borderRadius:'50%',objectFit:'cover',opacity:.9}}/>
            <div>
              <p style={{fontSize:15,fontWeight:900,letterSpacing:'0.07em',color:'#d4a870',lineHeight:1.2}}>okigasa</p>
              <p style={{fontSize:9,color:'rgba(240,230,210,0.4)',letterSpacing:'0.1em',marginTop:3}}>竹林から、雨の日まで。</p>
            </div>
          </div>
          <Link href="/map" style={{display:'block',textAlign:'center',padding:'7px 14px',borderRadius:10,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',fontSize:10,fontWeight:700,color:'rgba(240,230,210,0.55)',letterSpacing:'0.08em',textDecoration:'none'}}>
            竹林マップ →
          </Link>
        </div>
      </div>

      {/* 傘＋ナビ */}
      <div className="relative z-10 flex flex-col items-center" style={{padding:'60px 32px 48px'}}>
        <div style={{position:'relative',width:290,height:380,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <UmbrellaImage src={imgSrc} accent={cur.accent} opacity={imgOpacity}
            transition={imgOpacity===0?'opacity 0.4s ease':'opacity 0.5s ease'}
            glowColor={umbGlow}/>
        </div>
        <div style={{display:'flex',gap:12,marginTop:40}}>
          {SEASONS.map((s,i)=>{
            const active=i===idx;
            return(
              <button key={s.id} onClick={()=>{clearInterval(timerRef.current);goTo(i);}}
                style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'12px 20px',borderRadius:999,minWidth:68,background:active?cur.accent:'rgba(255,255,255,0.06)',border:`1.5px solid ${active?cur.accent:'rgba(255,255,255,0.12)'}`,color:active?'#0c0b09':'rgba(240,230,210,0.35)',cursor:'pointer',transition:'all 0.45s cubic-bezier(0.4,0,0.2,1)',transform:active?'scale(1.06)':'scale(1)'}}>
                <span style={{fontSize:17,fontWeight:900,lineHeight:1}}>{s.jp}</span>
                <span style={{fontSize:8,letterSpacing:'0.2em',fontWeight:700,opacity:.8}}>{s.en}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
