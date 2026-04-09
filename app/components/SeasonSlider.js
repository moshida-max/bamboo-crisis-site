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
        const [sz,spd,alp,cnt] = layer===0?[1.6,.42,.28,22]:layer===1?[3.2,.65,.60,15]:[5.5,.90,.88,7];
        return Array.from({length:cnt},()=>({
          x:Math.random()*W, y:Math.random()*H,
          r:sz*(0.7+Math.random()*.6),
          vx:(Math.random()-.5)*.32*(1+Math.random()*.4),
          vy:(Math.random()*.6+.35)*spd*(0.8+Math.random()*.4),
          angle:Math.random()*Math.PI*2,
          spin:(Math.random()-.5)*(.025+Math.random()*.025),
          baseAlpha:alp*(0.7+Math.random()*.6),
          rotY:Math.random()*Math.PI*2,
          rotYSpeed:(Math.random()-.5)*(.02+Math.random()*.025),
          phase:Math.random()*Math.PI*2,
          gravity:.018+Math.random()*.03,
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

        layers.forEach(layer=>layer.forEach(p=>{
          // 物理
          p.vy+=p.gravity; p.vx*=p.airX; p.vy*=p.airY;
          p.phase+=.013;
          p.x+=p.vx+Math.sin(p.phase)*1.0+Math.sin(frame*.005+p.seed*10)*.35;
          p.y+=p.vy;
          p.angle+=p.spin; p.rotY+=p.rotYSpeed;
          // 15%確率でふわっと上昇
          if(Math.random()<.003) p.vy-=.6;
          // ドーム衝突
          domeCollide(p);
          // マウス反発
          mouseRepel(p);

          if(p.x<-20) p.x=W+20; if(p.x>W+20) p.x=-20;
          if(p.y>H+20){ p.y=-20; p.x=Math.random()*W; p.vy=p.gravity*2; p.vx=(Math.random()-.5)*.5; }
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
          const spd=1.5+Math.random()*2.0;
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
          const spd=0.85+Math.random()*.55;
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
        const [sz,spd,alp,cnt]=layer===0?[3.5,.35,.25,14]:layer===1?[7,.65,.55,10]:[12,.90,.85,5];
        return Array.from({length:cnt},()=>({
          x:Math.random()*W, y:Math.random()*H,
          r:sz*(0.7+Math.random()*.6),
          vx:(Math.random()-.5)*.45*(1+Math.random()*.4),
          vy:(Math.random()*.6+.35)*spd*(0.8+Math.random()*.4),
          angle:Math.random()*Math.PI*2,
          spin:(Math.random()-.5)*(.038+Math.random()*.05),
          alpha:alp*(0.7+Math.random()*.6),
          phase:Math.random()*Math.PI*2,
          gravity:.038+Math.random()*.055,
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
          const wind=Math.sin(frame*.03+p.phase)*2.0+(Math.sin(frame*.007+p.seed)*.5)+gustStrength*(Math.random()-.5)*.35;
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

      const bgFlakes  = mkB(60, 1.5, .32, .18); // 粉雪（遠景）
      const midFlakes = mkB(25, 3.5, .22, .35); // 粉雪（中景）
      const crystals  = mkB(9,  6.5, .11, .42); // 結晶（前景）
      const fluffy    = mkB(8,  9,   .08, .28); // 綿雪（前景）

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
          if(p.y>H+15){ p.y=-15; p.x=Math.random()*W; p.vy=p.gravity; }
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

// ── 天気モード：WMOコード変換ユーティリティ ─────────────────────
const wmoScene = (code, hour) => {
  const isNight   = hour < 5 || hour >= 20;
  const isDawn    = hour >= 5 && hour < 7;
  const isEvening = hour >= 17 && hour < 20;
  const time = isNight ? 'night' : isDawn ? 'dawn' : isEvening ? 'evening' : 'day';
  if (code >= 95) return { type:'thunder',  time };
  if (code >= 71 || (code >= 85 && code <= 86)) return { type:'snow', time };
  if (code >= 51 || (code >= 80 && code <= 82)) return { type:'rain', time };
  if (code >= 45) return { type:'fog',      time };
  if (code >= 2)  return { type:'cloudy',   time };
  return               { type:'clear',    time };
};
const wmoEmoji = (code) => {
  if (code >= 95) return '⛈'; if (code >= 71) return '❄️';
  if (code >= 51) return '🌧'; if (code >= 45) return '🌫';
  if (code >= 2)  return '☁️'; return '☀️';
};
const wmoLabel = (code) => {
  if (code >= 95) return '雷雨'; if (code >= 85) return '雪しぐれ';
  if (code >= 80) return 'にわか雨'; if (code >= 71) return '雪';
  if (code >= 61) return '強い雨'; if (code >= 51) return '小雨';
  if (code >= 45) return '霧'; if (code >= 3) return '曇り';
  if (code >= 1)  return '薄曇り'; return '快晴';
};

// ── 天気 Canvas ──────────────────────────────────────────────────
// スカイカラーパレット（type-time ごとのスポットライト色）
const SKY = {
  'clear-night':   ['rgba(8,12,45,1)',    'rgba(14,20,58,0.82)', 'rgba(8,12,45,0.3)'],
  'clear-dawn':    ['rgba(195,85,28,1)',  'rgba(220,120,50,0.75)','rgba(180,65,18,0.25)'],
  'clear-day':     ['rgba(48,118,205,1)', 'rgba(72,145,225,0.78)','rgba(40,100,188,0.22)'],
  'clear-evening': ['rgba(205,68,15,1)',  'rgba(235,95,25,0.78)', 'rgba(185,50,10,0.22)'],
  'rain-night':    ['rgba(22,32,52,1)',   'rgba(28,40,62,0.82)',  'rgba(18,26,42,0.28)'],
  'rain-dawn':     ['rgba(25,36,55,1)',   'rgba(30,42,62,0.80)',  'rgba(20,30,48,0.25)'],
  'rain-day':      ['rgba(38,52,72,1)',   'rgba(48,62,85,0.80)',  'rgba(32,45,64,0.25)'],
  'rain-evening':  ['rgba(30,38,55,1)',   'rgba(36,46,65,0.80)',  'rgba(24,32,48,0.25)'],
  'thunder-night': ['rgba(15,18,38,1)',   'rgba(20,24,48,0.85)',  'rgba(12,15,32,0.32)'],
  'thunder-dawn':  ['rgba(18,22,42,1)',   'rgba(22,28,50,0.83)',  'rgba(14,18,36,0.30)'],
  'thunder-day':   ['rgba(22,28,50,1)',   'rgba(28,34,58,0.82)',  'rgba(18,22,44,0.28)'],
  'thunder-evening':['rgba(16,20,40,1)', 'rgba(20,26,48,0.84)',  'rgba(12,16,34,0.30)'],
  'snow-night':    ['rgba(95,118,165,1)', 'rgba(112,138,185,0.78)','rgba(82,105,152,0.25)'],
  'snow-dawn':     ['rgba(155,178,215,1)','rgba(170,192,225,0.75)','rgba(140,165,205,0.22)'],
  'snow-day':      ['rgba(145,172,215,1)','rgba(162,188,228,0.78)','rgba(130,158,205,0.22)'],
  'snow-evening':  ['rgba(118,140,188,1)','rgba(135,158,205,0.76)','rgba(105,128,178,0.24)'],
  'cloudy-night':  ['rgba(42,48,60,1)',   'rgba(52,58,72,0.80)',  'rgba(36,42,54,0.26)'],
  'cloudy-dawn':   ['rgba(75,82,95,1)',   'rgba(88,95,110,0.78)', 'rgba(65,72,85,0.24)'],
  'cloudy-day':    ['rgba(78,88,105,1)',  'rgba(92,102,120,0.78)','rgba(68,78,95,0.24)'],
  'cloudy-evening':['rgba(60,68,85,1)',   'rgba(72,80,98,0.78)',  'rgba(52,60,76,0.24)'],
  'fog-night':     ['rgba(80,85,98,1)',   'rgba(95,100,115,0.76)','rgba(70,75,88,0.24)'],
  'fog-dawn':      ['rgba(155,158,168,1)','rgba(168,172,182,0.74)','rgba(142,146,158,0.22)'],
  'fog-day':       ['rgba(158,162,172,1)','rgba(172,176,186,0.74)','rgba(145,150,162,0.22)'],
  'fog-evening':   ['rgba(118,122,135,1)','rgba(132,136,150,0.74)','rgba(108,112,125,0.22)'],
};
const skyKey = (type, time) => SKY[`${type}-${time}`] || SKY['clear-day'];

function WeatherCanvas({ weatherCode, hour }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    const { type, time } = wmoScene(weatherCode, hour);
    let raf, frame = 0;

    const SR = Math.min(W,H) * 0.68; // スポットライト半径
    const SCx = W * 0.5, SCy = H * 0.5;

    const stars = (type==='clear' && (time==='night'||time==='dawn'))
      ? Array.from({length: time==='night'?130:50}, ()=>({
          x:Math.random()*W, y:Math.random()*H*.58,
          r:.5+Math.random()*2, phase:Math.random()*Math.PI*2,
          speed:.012+Math.random()*.022,
        })) : [];

    const rainDrops = (type==='rain'||type==='thunder')
      ? Array.from({length:160}, ()=>({
          x:Math.random()*W*1.3-W*.15, y:Math.random()*H,
          l:12+Math.random()*24, speed:8+Math.random()*8,
          opacity:.28+Math.random()*.38,
        })) : [];

    const snowFlakes = type==='snow'
      ? Array.from({length:100}, ()=>({
          x:Math.random()*W, y:Math.random()*H,
          r:1.2+Math.random()*4, vy:.3+Math.random()*.9,
          vx:(Math.random()-.5)*.4, phase:Math.random()*Math.PI*2,
          alpha:.5+Math.random()*.5,
        })) : [];

    const fogPuffs = (type==='fog'||type==='cloudy')
      ? Array.from({length:14}, ()=>({
          x:Math.random()*W, y:H*.1+Math.random()*H*.7,
          w:140+Math.random()*240, h:60+Math.random()*100,
          alpha:type==='fog'?.08+Math.random()*.10:.05+Math.random()*.07,
          vx:(Math.random()-.5)*.14,
        })) : [];

    const moonX=W*.68, moonY=H*.18;
    let flashAlpha=0, nextFlash=80+Math.random()*180;

    const drawSpotlight = () => {
      const [c0,c1,c2] = skyKey(type, time);
      const sg = ctx.createRadialGradient(SCx, SCy, 0, SCx, SCy, SR);
      sg.addColorStop(0,   c0);
      sg.addColorStop(0.5, c1);
      sg.addColorStop(0.85,c2);
      sg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.fillRect(0,0,W,H);
    };

    const drawVignette = () => {
      const vg = ctx.createRadialGradient(SCx, SCy, SR*0.3, SCx, SCy, SR*1.05);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);
    };

    const tick = () => {
      ctx.clearRect(0,0,W,H);

      // ① 空のスポットライト（傘の周囲を照らす）
      drawSpotlight();

      // ② 天気別エフェクト
      if (type==='clear') {
        if (time==='night') {
          // 星
          stars.forEach(s=>{
            const tw=.5+.5*Math.sin(frame*s.speed+s.phase);
            const sg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*2.5);
            sg.addColorStop(0,`rgba(220,230,255,${.92*tw})`);
            sg.addColorStop(1,'rgba(220,230,255,0)');
            ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*2.5,0,Math.PI*2); ctx.fill();
          });
          // 月の光輪
          const gl=ctx.createRadialGradient(moonX,moonY,0,moonX,moonY,80);
          gl.addColorStop(0,'rgba(255,252,228,0.28)'); gl.addColorStop(.4,'rgba(255,250,210,0.10)'); gl.addColorStop(1,'rgba(255,250,210,0)');
          ctx.fillStyle=gl; ctx.fillRect(0,0,W,H);
          // 月面
          ctx.beginPath(); ctx.arc(moonX,moonY,22,0,Math.PI*2);
          const ms=ctx.createRadialGradient(moonX-7,moonY-7,2,moonX,moonY,22);
          ms.addColorStop(0,'rgba(255,255,245,0.97)'); ms.addColorStop(1,'rgba(240,234,200,0.90)');
          ctx.fillStyle=ms; ctx.fill();
          ctx.beginPath(); ctx.arc(moonX+8,moonY-2,18,0,Math.PI*2);
          ctx.fillStyle='rgba(8,12,45,0.90)'; ctx.fill();

        } else if (time==='dawn') {
          // 残星
          stars.forEach(s=>{
            const tw=.25+.2*Math.sin(frame*s.speed+s.phase);
            const sg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*1.8);
            sg.addColorStop(0,`rgba(220,228,255,${.55*tw})`); sg.addColorStop(1,'rgba(220,228,255,0)');
            ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*1.8,0,Math.PI*2); ctx.fill();
          });
          // 地平線グロー
          const rise=ctx.createRadialGradient(W*.5,H*.78,0,W*.5,H*.78,200);
          rise.addColorStop(0,'rgba(255,200,80,0.45)'); rise.addColorStop(.5,'rgba(255,120,30,0.18)'); rise.addColorStop(1,'rgba(255,80,15,0)');
          ctx.fillStyle=rise; ctx.fillRect(0,0,W,H);

        } else if (time==='evening') {
          const pulse=.3+.06*Math.sin(frame*.007);
          const hg=ctx.createRadialGradient(W*.5,H*.72,0,W*.5,H*.72,240);
          hg.addColorStop(0,`rgba(255,160,40,${pulse})`); hg.addColorStop(.4,`rgba(255,80,15,${pulse*.5})`); hg.addColorStop(1,'rgba(255,40,0,0)');
          ctx.fillStyle=hg; ctx.fillRect(0,0,W,H);

        } // day: スポットライトの青空だけで十分

      } else if (type==='cloudy'||type==='fog') {
        fogPuffs.forEach(m=>{
          m.x+=m.vx; if(m.x>W+m.w) m.x=-m.w; if(m.x<-m.w) m.x=W+m.w;
          const mg=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,m.w*.55);
          const col=type==='fog'?'180,185,195':'148,156,170';
          mg.addColorStop(0,`rgba(${col},${m.alpha})`); mg.addColorStop(1,`rgba(${col},0)`);
          ctx.fillStyle=mg; ctx.fillRect(m.x-m.w,m.y-m.h,m.w*2,m.h*2);
        });

      } else if (type==='rain'||type==='thunder') {
        ctx.lineWidth=0.9;
        rainDrops.forEach(d=>{
          ctx.beginPath(); ctx.strokeStyle=`rgba(175,210,235,${d.opacity})`;
          ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-7,d.y+d.l); ctx.stroke();
          d.y+=d.speed; if(d.y>H+20){d.y=-20;d.x=Math.random()*W*1.3-W*.15;}
        });
        if (type==='thunder') {
          nextFlash--;
          if(nextFlash<=0){flashAlpha=0.45;nextFlash=80+Math.random()*180;}
          if(flashAlpha>0.01){
            ctx.fillStyle=`rgba(225,235,255,${flashAlpha})`; ctx.fillRect(0,0,W,H);
            flashAlpha*=.70;
          }
        }

      } else if (type==='snow') {
        snowFlakes.forEach(s=>{
          s.phase+=.009; s.x+=s.vx+Math.sin(s.phase*.7)*.4; s.y+=s.vy;
          if(s.y>H+10){s.y=-10;s.x=Math.random()*W;}
          if(s.x<-10) s.x=W+10; if(s.x>W+10) s.x=-10;
          const sg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*1.8);
          sg.addColorStop(0,`rgba(235,245,255,${s.alpha})`); sg.addColorStop(1,'rgba(235,245,255,0)');
          ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*1.8,0,Math.PI*2); ctx.fill();
        });
      }

      // ③ 端を黒に戻すvignette（ブランドカードとなじむ）
      drawVignette();

      frame++;
      raf=requestAnimationFrame(tick);
    };
    tick();
    return ()=>cancelAnimationFrame(raf);
  },[weatherCode,hour]);

  return <canvas ref={ref} width={800} height={600}
    className="absolute inset-0 w-full h-full pointer-events-none"/>;
}

// ── 今日の一言 ───────────────────────────────────────────────────
const KOTOBA = [
  { word: '覚悟', note: '脱田舎侍' },
  { word: '夜の道', note: 'ドラッグストアの照明明るい' },
  { word: 'ちゃっちい', note: '一歩目を踏み出してみたい' },
  { word: '粘り', note: '物事現状維持で精一杯' },
  { word: '竹を割る', note: '物事をはっきりさせること。竹の性質そのまま。' },
  { word: '一節一節', note: '竹は節を重ねて高く伸びる。人もそう。' },
  { word: '虚心坦懐', note: '竹の内側は空洞。空であることが強さになる。' },
  { word: '節目', note: '竹の節が竹を強くするように、転機が人を育てる。' },
  { word: '雨後の筍', note: '好機は重なるもの。竹林の春に学ぶ。' },
  { word: '竹林七賢', note: '乱世に背を向け、竹林に集まった七人の賢者。' },
  { word: '竹馬の友', note: '幼い頃から共に過ごした、かけがえのない存在。' },
  { word: '破竹の勢い', note: '一節割れれば、あとは一気に。止められない力。' },
  { word: '空節', note: '節と節の間の空洞。余白があるから、強くなれる。' },
  { word: '青竹', note: 'まだ若く、みずみずしい。すべては青竹から始まる。' },
  { word: '竹取', note: '月へ帰る姫を育てたのは、竹を割る老翁だった。' },
  { word: '筍掘り', note: '土の中で育つ力。見えないところに本質がある。' },
  { word: '孟宗竹', note: '日本最大の竹。その生命力は、時に脅威にもなる。' },
  { word: '根を張る', note: '地下茎は見えないが、どこまでも伸びている。' },
  { word: '竹篭', note: '隙間があるから、風が通る。完璧でないことの美しさ。' },
  { word: '竹の子', note: '今日も地面のどこかで、芽吹こうとしている。' },
  { word: '三年枯れず', note: '切られた竹も三年は枯れない。しぶとさという美徳。' },
  { word: '竹炭', note: '燃やすことで、浄化の力に変わる。変容の美学。' },
  { word: '竹細工', note: '割いて、編んで、形にする。手仕事の喜び。' },
  { word: '竹藪', note: '薄暗く、静かで、どこか異世界めいている。' },
  { word: '笹舟', note: '小さな葉が川を渡る。軽さという強み。' },
  { word: '孤高', note: '竹は群れながら、一本一本は真っ直ぐ立つ。' },
  { word: '真竹', note: '120年に一度だけ花を咲かせ、そして枯れる。' },
  { word: '春の訪れ', note: '筍が地面を割る音は、春の足音だ。' },
];

function getTodayKotoba() {
  const now = new Date();
  // 朝6時以前は前日扱い
  const adjusted = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const dayIndex = Math.floor(adjusted.getTime() / (1000 * 60 * 60 * 24));
  return KOTOBA[dayIndex % KOTOBA.length];
}

// ── メインコンポーネント ──────────────────────────────────────────
export default function SeasonSlider() {
  const [idx,setIdx]               = useState(0);
  const [imgSrc,setImgSrc]         = useState(SEASONS[0].img);
  const [imgOpacity,setImgOpacity] = useState(1);
  const [transitioning,setTransitioning] = useState(false);
  const [umbGlow,setUmbGlow]       = useState(null);
  const [isMobile,setIsMobile]     = useState(false);
  const timerRef = useRef(null);

  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<640);
    check();
    window.addEventListener('resize',check);
    return ()=>window.removeEventListener('resize',check);
  },[]);

  // 今日の一言モード
  const [kotobaMode,setKotobaMode] = useState(false);
  const todayKotoba = getTodayKotoba();

  const toggleKotoba = () => {
    setKotobaMode(k => !k);
    if (!kotobaMode) setWeatherMode(false);
  };

  // 天気モード
  const [weatherMode,setWeatherMode]     = useState(false);
  const [weatherData,setWeatherData]     = useState(null);
  const [weatherLoading,setWeatherLoading] = useState(false);
  const [currentHour,setCurrentHour]    = useState(()=>new Date().getHours());

  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=34.9756&longitude=138.3828&current=weathercode,temperature_2m&timezone=Asia%2FTokyo'
      );
      const json = await res.json();
      setWeatherData({ code: json.current.weathercode, temp: Math.round(json.current.temperature_2m) });
    } catch { setWeatherData({ code:0, temp:null }); }
    setWeatherLoading(false);
  };

  const toggleWeather = () => {
    if (!weatherMode && !weatherData) fetchWeather();
    setCurrentHour(new Date().getHours());
    setWeatherMode(w => !w);
    if (!weatherMode) setKotobaMode(false);
  };

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

      {!weatherMode && !kotobaMode && <RainCanvas/>}
      {!kotobaMode && (weatherMode && weatherData
        ? <WeatherCanvas weatherCode={weatherData.code} hour={currentHour}/>
        : !weatherMode && <ParticleCanvas season={cur} key={cur.id} onExplode={handleExplode}/>
      )}

      {/* 左上ブランドカード */}
      {/* ── ブランドカード（PC：左上フル / モバイル：コンパクトバッジのみ） */}
      <div className="absolute z-20" style={{top: isMobile ? 16 : 28, left: isMobile ? 14 : 32}}>
        {isMobile ? (
          /* モバイル：ロゴ＋名前だけのコンパクトバッジ */
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:999,background:'rgba(255,255,255,0.07)',backdropFilter:'blur(14px)',border:'1px solid rgba(255,255,255,0.1)'}}>
            <img src="/okigasa-logo.jpg" alt="okigasa" style={{width:28,height:28,borderRadius:'50%',objectFit:'cover',opacity:.9}}/>
            <p style={{fontSize:13,fontWeight:900,letterSpacing:'0.07em',color:'#d4a870',lineHeight:1}}>okigasa</p>
          </div>
        ) : (
          /* PC：フルカード */
          <div style={{padding:'18px 22px',borderRadius:20,background:'rgba(255,255,255,0.06)',backdropFilter:'blur(14px)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <img src="/okigasa-logo.jpg" alt="okigasa" style={{width:52,height:52,borderRadius:'50%',objectFit:'cover',opacity:.9}}/>
              <div>
                <p style={{fontSize:18,fontWeight:900,letterSpacing:'0.07em',color:'#d4a870',lineHeight:1.2}}>okigasa</p>
                <p style={{fontSize:11,color:'rgba(240,230,210,0.4)',letterSpacing:'0.1em',marginTop:4}}>竹林から、雨の日まで。</p>
              </div>
            </div>
            {/* 縦リスト メニュー */}
            <div style={{display:'flex',flexDirection:'column',marginTop:4,borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:8}}>
              {[
                { label:'竹マップ', sub:'侵食データを見る', href:'/map', active:false, isLink:true },
                { label:'現在の天気', sub:'静岡市の空模様', onClick:toggleWeather, active:weatherMode, isLink:false },
                { label:'今日の一言', sub:'竹にまつわる言葉', onClick:toggleKotoba, active:kotobaMode, isLink:false },
              ].map((item, i, arr) => {
                const isActive = item.active;
                const shared = {
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 4px',
                  cursor:'pointer', textDecoration:'none',
                  borderBottom: i < arr.length-1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  borderLeft: `2px solid ${isActive ? 'rgba(210,175,90,0.8)' : 'transparent'}`,
                  paddingLeft: 10,
                  transition:'all 0.25s ease',
                  background: isActive ? 'rgba(200,165,80,0.07)' : 'transparent',
                  borderRadius: isActive ? '0 8px 8px 0' : 0,
                };
                const inner = (
                  <>
                    <div>
                      <div style={{fontSize:13,fontWeight:800,letterSpacing:'0.04em',color: isActive ? 'rgba(225,185,95,1)' : 'rgba(240,230,210,0.75)',lineHeight:1.2}}>{item.label}</div>
                      <div style={{fontSize:9,color: isActive ? 'rgba(210,175,90,0.6)' : 'rgba(240,230,210,0.28)',marginTop:2,letterSpacing:'0.06em'}}>{item.sub}</div>
                    </div>
                    <div style={{fontSize:10,color: isActive ? 'rgba(210,175,90,0.7)' : 'rgba(240,230,210,0.2)',marginLeft:8}}>→</div>
                  </>
                );
                if (item.isLink) return <Link key={item.label} href={item.href} style={shared}>{inner}</Link>;
                return <button key={item.label} onClick={item.onClick} style={shared}>{inner}</button>;
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── モバイル専用ボトムバー */}
      {isMobile && (
        <div style={{position:'absolute',bottom:24,left:0,right:0,zIndex:20,display:'flex',justifyContent:'center'}}>
          <div style={{display:'flex',gap:6,padding:'8px 12px',borderRadius:999,background:'rgba(12,10,8,0.75)',backdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.1)'}}>
            {[
              { label:'竹マップ', href:'/map', active:false, isLink:true },
              { label:'現在の天気', onClick:toggleWeather, active:weatherMode, isLink:false },
              { label:'今日の一言', onClick:toggleKotoba, active:kotobaMode, isLink:false },
            ].map(item => {
              const isActive = item.active;
              const style = {
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                padding:'7px 13px', borderRadius:999,
                fontSize:11, fontWeight:800, letterSpacing:'0.04em',
                cursor:'pointer', textDecoration:'none', whiteSpace:'nowrap',
                transition:'all 0.25s ease',
                background: isActive ? 'rgba(200,165,80,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isActive ? 'rgba(210,175,90,0.6)' : 'rgba(255,255,255,0.1)'}`,
                color: isActive ? 'rgba(225,185,95,1)' : 'rgba(240,230,210,0.5)',
              };
              if (item.isLink) return <Link key={item.label} href={item.href} style={style}>{item.label}</Link>;
              return <button key={item.label} onClick={item.onClick} style={style}>{item.label}</button>;
            })}
          </div>
        </div>
      )}

      {/* 傘＋ナビ */}
      <div className="relative z-10 flex flex-col items-center" style={{padding: isMobile ? '32px 20px 36px' : '60px 32px 48px'}}>
        {!kotobaMode && (
          <div style={{position:'relative',width: isMobile ? 120 : 290, height: isMobile ? 158 : 380,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <UmbrellaImage src={imgSrc} accent={cur.accent} opacity={imgOpacity}
              transition={imgOpacity===0?'opacity 0.4s ease':'opacity 0.5s ease'}
              glowColor={umbGlow}/>
          </div>
        )}
        {/* 傘の下エリア */}
        <div style={{minHeight: kotobaMode ? 'auto' : isMobile ? 72 : 90, display:'flex', flexDirection:'column', alignItems:'center', justifyContent: kotobaMode ? 'center' : 'flex-start', flex: kotobaMode ? 1 : undefined}}>
          {weatherMode && weatherData && (
            <div style={{marginTop: isMobile ? 16 : 32,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
              <div style={{fontSize: isMobile ? 44 : 56,lineHeight:1}}>{wmoEmoji(weatherData.code)}</div>
              <div style={{fontSize: isMobile ? 18 : 22,fontWeight:700,color:'rgba(240,230,210,0.9)',letterSpacing:'0.08em'}}>{wmoLabel(weatherData.code)}</div>
              {weatherData.temp!==null && <div style={{fontSize: isMobile ? 13 : 15,color:'rgba(240,230,210,0.5)',letterSpacing:'0.12em'}}>{weatherData.temp}°C · 静岡市</div>}
            </div>
          )}
          {kotobaMode && (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:isMobile?12:16,maxWidth: isMobile ? 280 : 360,textAlign:'center',padding:'0 16px', marginTop: isMobile ? 0 : 8}}>
              <div style={{fontSize: isMobile ? 32 : 44,fontWeight:900,color:'rgba(220,180,100,0.95)',letterSpacing:'0.1em',lineHeight:1.2}}>{todayKotoba.word}</div>
              <div style={{fontSize: isMobile ? 13 : 16,color:'rgba(240,230,210,0.6)',lineHeight:1.8,letterSpacing:'0.04em'}}>{todayKotoba.note}</div>
              <div style={{fontSize: isMobile ? 11 : 12,color:'rgba(240,230,210,0.55)',letterSpacing:'0.12em',marginTop:6,border:'1px solid rgba(255,255,255,0.14)',padding:'4px 14px',borderRadius:999}}>毎朝 6:00 更新</div>
            </div>
          )}
          {!weatherMode && !kotobaMode && (
            <div style={{display:'flex',gap: isMobile ? 6 : 12, marginTop: isMobile ? 72 : 40}}>
              {SEASONS.map((s,i)=>{
                const active=i===idx;
                return(
                  <button key={s.id} onClick={()=>{clearInterval(timerRef.current);goTo(i);}}
                    style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,
                      padding: isMobile ? '6px 10px' : '12px 20px',
                      borderRadius:999,
                      minWidth: isMobile ? 44 : 68,
                      background:active?cur.accent:'rgba(255,255,255,0.06)',
                      border:`1.5px solid ${active?cur.accent:'rgba(255,255,255,0.12)'}`,
                      color:active?'#0c0b09':'rgba(240,230,210,0.35)',
                      cursor:'pointer',transition:'all 0.45s cubic-bezier(0.4,0,0.2,1)',
                      transform:active?'scale(1.06)':'scale(1)'}}>
                    <span style={{fontSize: isMobile ? 11 : 17, fontWeight:900,lineHeight:1}}>{s.jp}</span>
                    <span style={{fontSize: isMobile ? 6 : 8, letterSpacing:'0.2em',fontWeight:700,opacity:.8}}>{s.en}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
