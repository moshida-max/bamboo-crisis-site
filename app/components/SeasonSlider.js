'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── 季節定義 ────────────────────────────────────────────────────
const SEASONS = [
  {
    id: 'spring',
    name: 'Spring',
    jp: '春',
    tagline: '桜の下に、傘がある。',
    img: '/umbrella-red.jpg',
    particle: 'sakura',
    bg: 'linear-gradient(160deg, #1a0a12 0%, #2a0f1a 60%, #1a0d15 100%)',
    accent: '#f4a8c0',
    glow: 'rgba(244,168,192,0.3)',
  },
  {
    id: 'summer',
    name: 'Summer',
    jp: '夏',
    tagline: '夜空に、花火が咲く。',
    img: '/umbrella-summer.png',
    particle: 'fireworks',
    bg: 'linear-gradient(160deg, #080a1a 0%, #0a0f2a 60%, #050818 100%)',
    accent: '#60a0ff',
    glow: 'rgba(96,160,255,0.3)',
  },
  {
    id: 'autumn',
    name: 'Autumn',
    jp: '秋',
    tagline: '枯れ葉が、静かに落ちる。',
    img: null, // 秋の傘は準備中
    particle: 'leaves',
    bg: 'linear-gradient(160deg, #1a0e05 0%, #2a1506 60%, #1a0f05 100%)',
    accent: '#d4783a',
    glow: 'rgba(212,120,58,0.3)',
  },
  {
    id: 'winter',
    name: 'Winter',
    jp: '冬',
    tagline: '雪の中に、佇む。',
    img: '/umbrella-winter.png',
    particle: 'snow',
    bg: 'linear-gradient(160deg, #080c14 0%, #0c1220 60%, #080c18 100%)',
    accent: '#b8d8f8',
    glow: 'rgba(184,216,248,0.3)',
  },
];

// ── パーティクルCanvas ─────────────────────────────────────────
function ParticleCanvas({ type, accent }) {
  const ref = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    let particles = [];

    if (type === 'sakura') {
      particles = Array.from({ length: 55 }, () => ({
        x: Math.random() * W, y: Math.random() * H - H,
        size: Math.random() * 8 + 4,
        speedY: Math.random() * 1.5 + 0.8,
        speedX: Math.random() * 1.2 - 0.6,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.06,
        opacity: Math.random() * 0.6 + 0.3,
        hue: Math.random() * 20 - 10, // ピンクのバリエーション
      }));
      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          // 桜の花びら（楕円）
          ctx.globalAlpha = p.opacity;
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          g.addColorStop(0, `hsl(${345 + p.hue}, 80%, 85%)`);
          g.addColorStop(1, `hsl(${345 + p.hue}, 70%, 70%)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          p.y += p.speedY;
          p.x += p.speedX + Math.sin(p.y * 0.02) * 0.5;
          p.angle += p.spin;
          if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
        });
        animRef.current = requestAnimationFrame(draw);
      };
      draw();
    }

    else if (type === 'fireworks') {
      // 花火：炸裂後に光の粒が放射→落下
      const bursts = [];
      const addBurst = () => {
        const cx = W * 0.2 + Math.random() * W * 0.6;
        const cy = H * 0.1 + Math.random() * H * 0.5;
        const hue = Math.random() * 360;
        const count = 40 + Math.floor(Math.random() * 30);
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
          const speed = Math.random() * 4 + 2;
          bursts.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: Math.random() * 0.012 + 0.008,
            size: Math.random() * 3 + 1,
            hue,
          });
        }
      };
      addBurst();
      let timer = 0;
      const draw = () => {
        ctx.fillStyle = 'rgba(8,10,26,0.18)';
        ctx.fillRect(0, 0, W, H);
        bursts.forEach((p, i) => {
          p.x += p.vx; p.y += p.vy;
          p.vy += 0.06; // 重力
          p.vx *= 0.98;
          p.life -= p.decay;
          if (p.life <= 0) { bursts.splice(i, 1); return; }
          ctx.globalAlpha = p.life * 0.9;
          ctx.fillStyle = `hsl(${p.hue}, 100%, 75%)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
          // 軌跡
          ctx.globalAlpha = p.life * 0.3;
          ctx.beginPath();
          ctx.arc(p.x - p.vx * 2, p.y - p.vy * 2, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        timer++;
        if (timer % 90 === 0) addBurst();
        animRef.current = requestAnimationFrame(draw);
      };
      draw();
    }

    else if (type === 'leaves') {
      particles = Array.from({ length: 40 }, () => ({
        x: Math.random() * W, y: Math.random() * H - H,
        size: Math.random() * 12 + 6,
        speedY: Math.random() * 1.2 + 0.5,
        speedX: Math.random() * 1.5 - 0.75,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.04,
        opacity: Math.random() * 0.5 + 0.3,
        hue: Math.random() * 40, // 赤橙茶
        type: Math.floor(Math.random() * 3),
      }));
      const drawLeaf = (ctx, size, hue) => {
        const g = ctx.createRadialGradient(0, -size * 0.3, 0, 0, 0, size);
        g.addColorStop(0, `hsl(${20 + hue}, 85%, 60%)`);
        g.addColorStop(1, `hsl(${10 + hue}, 70%, 35%)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.bezierCurveTo(size * 0.8, -size * 0.5, size * 0.9, size * 0.3, 0, size * 0.5);
        ctx.bezierCurveTo(-size * 0.9, size * 0.3, -size * 0.8, -size * 0.5, 0, -size);
        ctx.fill();
        // 葉脈
        ctx.strokeStyle = `hsla(${30 + hue}, 60%, 25%, 0.4)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.9);
        ctx.lineTo(0, size * 0.4);
        ctx.stroke();
      };
      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.globalAlpha = p.opacity;
          drawLeaf(ctx, p.size, p.hue);
          ctx.restore();
          p.y += p.speedY;
          p.x += p.speedX + Math.sin(p.y * 0.015) * 0.8;
          p.angle += p.spin;
          if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
        });
        animRef.current = requestAnimationFrame(draw);
      };
      draw();
    }

    else if (type === 'snow') {
      particles = Array.from({ length: 80 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        size: Math.random() * 4 + 1,
        speedY: Math.random() * 1.2 + 0.3,
        drift: Math.random() * 0.8 - 0.4,
        opacity: Math.random() * 0.6 + 0.2,
        phase: Math.random() * Math.PI * 2,
      }));
      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
          p.phase += 0.02;
          p.y += p.speedY;
          p.x += p.drift + Math.sin(p.phase) * 0.4;
          if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
          if (p.x > W + 10) p.x = -10;
          if (p.x < -10) p.x = W + 10;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, `rgba(240,248,255,${p.opacity})`);
          g.addColorStop(1, `rgba(200,225,255,0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        animRef.current = requestAnimationFrame(draw);
      };
      draw();
    }

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [type]);

  return (
    <canvas ref={ref} width={600} height={700}
      className="absolute inset-0 w-full h-full pointer-events-none" />
  );
}

// ── メインコンポーネント ──────────────────────────────────────
export default function SeasonSlider() {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev]       = useState(null);
  const [dir, setDir]         = useState(1); // 1=right→left, -1=left→right
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);

  const go = useCallback((nextIdx, direction) => {
    if (animating) return;
    setDir(direction);
    setPrev(current);
    setCurrent(nextIdx);
    setAnimating(true);
    setTimeout(() => { setPrev(null); setAnimating(false); }, 600);
  }, [animating, current]);

  // 自動スライド
  useEffect(() => {
    timerRef.current = setInterval(() => {
      go((current + 1) % SEASONS.length, 1);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [current, go]);

  const goTo = (idx) => {
    clearInterval(timerRef.current);
    const d = idx > current ? 1 : -1;
    go(idx, d);
  };

  const s = SEASONS[current];
  const p = prev !== null ? SEASONS[prev] : null;

  return (
    <section className="py-16 px-6 overflow-hidden" style={{ background: '#080808' }}>
      <div className="max-w-5xl mx-auto">

        {/* タイトル */}
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.4em] font-bold mb-2" style={{ color: 'rgba(240,235,224,0.3)' }}>
            FOUR SEASONS
          </p>
          <h2 className="text-3xl md:text-4xl font-black" style={{ color: '#f0ebe0' }}>
            四季と、傘。
          </h2>
        </div>

        {/* スライダー */}
        <div className="relative overflow-hidden rounded-3xl"
          style={{ minHeight: 480, background: s.bg, transition: 'background 0.6s ease',
            boxShadow: `0 40px 80px rgba(0,0,0,0.6), 0 0 60px ${s.glow}` }}>

          {/* 前スライド（退場） */}
          {p && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{
                animation: `slideOut${dir > 0 ? 'Left' : 'Right'} 0.6s cubic-bezier(0.4,0,0.2,1) forwards`,
                zIndex: 1,
              }}>
              <SlideContent season={p} />
            </div>
          )}

          {/* 現スライド（登場） */}
          <div className="relative flex items-center justify-center"
            style={{
              animation: animating ? `slideIn${dir > 0 ? 'Right' : 'Left'} 0.6s cubic-bezier(0.4,0,0.2,1) forwards` : 'none',
              zIndex: 2, minHeight: 480,
            }}>
            <ParticleCanvas type={s.particle} accent={s.accent} key={s.id} />
            <SlideContent season={s} />
          </div>

        </div>

        {/* ドットナビ */}
        <div className="flex justify-center gap-4 mt-8">
          {SEASONS.map((season, i) => (
            <button key={season.id} onClick={() => goTo(i)}
              className="flex flex-col items-center gap-2 transition-all hover:scale-110"
              style={{ opacity: i === current ? 1 : 0.35 }}>
              <div className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: i === current ? season.accent : 'rgba(255,255,255,0.4)',
                  boxShadow: i === current ? `0 0 10px ${season.glow}` : 'none',
                  width: i === current ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                }} />
              <span className="text-[10px] font-bold tracking-widest"
                style={{ color: i === current ? season.accent : 'rgba(255,255,255,0.3)' }}>
                {season.jp}
              </span>
            </button>
          ))}
        </div>

      </div>

      {/* CSS アニメーション定義 */}
      <style>{`
        @keyframes slideInRight {
          from { opacity:0; transform: translateX(80px); }
          to   { opacity:1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity:0; transform: translateX(-80px); }
          to   { opacity:1; transform: translateX(0); }
        }
        @keyframes slideOutLeft {
          from { opacity:1; transform: translateX(0); }
          to   { opacity:0; transform: translateX(-80px); }
        }
        @keyframes slideOutRight {
          from { opacity:1; transform: translateX(0); }
          to   { opacity:0; transform: translateX(80px); }
        }
      `}</style>
    </section>
  );
}

// ── スライドの中身 ────────────────────────────────────────────
function SlideContent({ season }) {
  return (
    <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-12 px-8 py-16 w-full">

      {/* 傘 写真 or プレースホルダー */}
      <div className="shrink-0 relative">
        {season.img ? (
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl blur-2xl scale-90"
              style={{ background: season.glow, opacity: 0.5 }} />
            <img src={season.img} alt={season.jp}
              className="relative rounded-3xl object-cover"
              style={{
                width: 220, height: 280,
                objectFit: 'contain',
                filter: `drop-shadow(0 20px 40px ${season.glow})`,
              }} />
          </div>
        ) : (
          <div className="rounded-3xl flex items-center justify-center"
            style={{
              width: 220, height: 280,
              background: `${season.accent}15`,
              border: `2px dashed ${season.accent}40`,
            }}>
            <div className="text-center">
              <p className="text-4xl mb-3">🎋</p>
              <p className="text-xs font-bold" style={{ color: season.accent }}>準備中</p>
              <p className="text-[10px] mt-1" style={{ color: `${season.accent}60` }}>coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* テキスト */}
      <div className="text-center md:text-left max-w-xs">
        <p className="text-xs tracking-[0.4em] font-bold mb-3"
          style={{ color: season.accent, opacity: 0.7 }}>
          {season.name.toUpperCase()}
        </p>
        <h3 className="text-6xl font-black mb-4"
          style={{ color: season.accent, textShadow: `0 0 40px ${season.glow}` }}>
          {season.jp}
        </h3>
        <p className="text-lg font-bold leading-snug" style={{ color: '#f0ebe0' }}>
          {season.tagline}
        </p>
        <div className="mt-6 w-12 h-px" style={{ background: season.accent, opacity: 0.4 }} />
      </div>

    </div>
  );
}
