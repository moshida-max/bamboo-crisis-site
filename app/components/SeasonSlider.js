'use client';

import { useState, useEffect, useRef } from 'react';

// ── 季節定義 ─────────────────────────────────────────────────────
const SEASONS = [
  {
    id: 'spring',
    jp: '春',
    en: 'SPRING',
    poem: '桜、静かに降る。',
    img: '/umbrella-spring.png',
    particle: 'sakura',
    // 傘の表示スタイル（季節ごとに微妙に角度・大きさが違う）
    imgStyle: { transform: 'rotate(-6deg) scale(1.0)', transformOrigin: 'center bottom' },
    accent: '#c9909a',
    particleColors: ['#f2b8c6','#e8a0b4','#f5c9d5','#eba8bc','#f8d5de'],
  },
  {
    id: 'summer',
    jp: '夏',
    en: 'SUMMER',
    poem: '夜空に、花火。',
    img: '/umbrella-summer.png',
    particle: 'fireworks',
    imgStyle: { transform: 'rotate(4deg) scale(1.05)', transformOrigin: 'center bottom' },
    accent: '#6080c8',
    particleColors: ['#ff6060','#ffcc00','#60d0ff','#ff80ff','#80ff80','#ffaa40'],
  },
  {
    id: 'autumn',
    jp: '秋',
    en: 'AUTUMN',
    poem: '葉が、音もなく。',
    img: '/umbrella-autumn.png',
    particle: 'leaves',
    imgStyle: { transform: 'rotate(-10deg) scale(0.95)', transformOrigin: 'center bottom' },
    accent: '#a06030',
    particleColors: ['#c0602a','#d4782a','#b84820','#e89040','#804020'],
  },
  {
    id: 'winter',
    jp: '冬',
    en: 'WINTER',
    poem: '雪の中に、佇む。',
    img: '/umbrella-winter.png',
    particle: 'snow',
    imgStyle: { transform: 'rotate(3deg) scale(1.02)', transformOrigin: 'center bottom' },
    accent: '#6090b0',
    particleColors: ['#d0e8f8','#e8f4ff','#b8d8f0','#c8e4f8'],
  },
];

// ── パーティクル Canvas ──────────────────────────────────────────
function ParticleCanvas({ season }) {
  const ref = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    const colors = season.particleColors;

    let particles = [];
    let burstTimer = 0;
    const bursts = [];

    if (season.particle === 'sakura') {
      particles = Array.from({ length: 50 }, (_, i) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 7 + 3,
        vx: Math.random() * 0.8 - 0.4,
        vy: Math.random() * 1.0 + 0.4,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.04,
        alpha: Math.random() * 0.55 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
      }));
    } else if (season.particle === 'leaves') {
      particles = Array.from({ length: 30 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 11 + 6,
        vx: Math.random() * 1.0 - 0.5,
        vy: Math.random() * 0.9 + 0.3,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.03,
        alpha: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
      }));
    } else if (season.particle === 'snow') {
      particles = Array.from({ length: 80 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 4 + 1,
        vx: Math.random() * 0.4 - 0.2,
        vy: Math.random() * 0.7 + 0.2,
        alpha: Math.random() * 0.5 + 0.15,
        phase: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
    }

    const drawLeaf = (ctx, x, y, r, angle, color, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r * 0.9, -r * 0.4, r * 0.8, r * 0.4, 0, r * 0.5);
      ctx.bezierCurveTo(-r * 0.8, r * 0.4, -r * 0.9, -r * 0.4, 0, -r);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = alpha * 0.3;
      ctx.strokeStyle = '#60300a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.lineTo(0, r * 0.4);
      ctx.stroke();
      ctx.restore();
    };

    const addBurst = () => {
      const cx = W * 0.15 + Math.random() * W * 0.7;
      const cy = H * 0.05 + Math.random() * H * 0.5;
      const hue = Math.random() * 360;
      const n = 35 + Math.floor(Math.random() * 25);
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.4;
        const spd = Math.random() * 3.5 + 1.5;
        bursts.push({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          life: 1.0, decay: 0.008 + Math.random() * 0.01, r: Math.random() * 2.5 + 0.8, hue });
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, W, H);

      if (season.particle === 'sakura') {
        particles.forEach(p => {
          p.phase += 0.018;
          p.x += p.vx + Math.sin(p.phase) * 0.5;
          p.y += p.vy;
          p.angle += p.spin;
          if (p.y > H + 15) { p.y = -15; p.x = Math.random() * W; }
          if (p.x < -15) p.x = W + 15;
          if (p.x > W + 15) p.x = -15;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      } else if (season.particle === 'leaves') {
        particles.forEach(p => {
          p.phase += 0.015;
          p.x += p.vx + Math.sin(p.phase) * 0.7;
          p.y += p.vy;
          p.angle += p.spin;
          if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
          drawLeaf(ctx, p.x, p.y, p.r, p.angle, p.color, p.alpha);
        });
      } else if (season.particle === 'snow') {
        particles.forEach(p => {
          p.phase += 0.012;
          p.x += p.vx + Math.sin(p.phase) * 0.3;
          p.y += p.vy;
          if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
          if (p.x < -10) p.x = W + 10;
          if (p.x > W + 10) p.x = -10;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2);
          g.addColorStop(0, p.color);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      } else if (season.particle === 'fireworks') {
        // 背景を少し暗くして軌跡を出す（軽くだけ）
        ctx.fillStyle = 'rgba(248,246,240,0.08)';
        ctx.fillRect(0, 0, W, H);
        burstTimer++;
        if (burstTimer % 80 === 0 || bursts.length === 0) addBurst();
        for (let i = bursts.length - 1; i >= 0; i--) {
          const b = bursts[i];
          b.x += b.vx; b.y += b.vy; b.vy += 0.055; b.vx *= 0.985;
          b.life -= b.decay;
          if (b.life <= 0) { bursts.splice(i, 1); continue; }
          ctx.globalAlpha = b.life * 0.8;
          ctx.fillStyle = `hsl(${b.hue}, 80%, 55%)`;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * b.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    tick();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [season]);

  return (
    <canvas ref={ref} width={800} height={600}
      className="absolute inset-0 w-full h-full pointer-events-none" />
  );
}

// ── メインコンポーネント ──────────────────────────────────────────
export default function SeasonSlider() {
  const [idx, setIdx]         = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  const [fading, setFading]   = useState(false);
  const timerRef = useRef(null);

  const goTo = (next) => {
    if (fading || next === idx) return;
    setPrevIdx(idx);
    setIdx(next);
    setFading(true);
    setTimeout(() => { setPrevIdx(null); setFading(false); }, 900);
  };

  const advance = () => goTo((idx + 1) % SEASONS.length);

  useEffect(() => {
    timerRef.current = setInterval(advance, 5500);
    return () => clearInterval(timerRef.current);
  }, [idx, fading]);

  const cur = SEASONS[idx];
  const prv = prevIdx !== null ? SEASONS[prevIdx] : null;

  return (
    <section style={{ background: '#f8f6f0' }} className="relative overflow-hidden">

      {/* 大きな季節文字（背景に薄く） */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="font-black transition-all duration-1000"
          style={{
            fontSize: 'clamp(180px, 40vw, 380px)',
            color: cur.accent,
            opacity: 0.06,
            lineHeight: 1,
            letterSpacing: '-0.05em',
          }}>
          {cur.jp}
        </span>
      </div>

      {/* パーティクル（現在） */}
      <ParticleCanvas season={cur} key={cur.id} />

      {/* コンテンツ */}
      <div className="relative z-10 max-w-4xl mx-auto px-8 py-20 flex flex-col items-center">

        {/* 季節ラベル */}
        <div className="flex items-center gap-4 mb-12">
          <div className="h-px w-12" style={{ background: cur.accent, opacity: 0.4 }} />
          <p className="text-xs tracking-[0.5em] font-bold transition-colors duration-700"
            style={{ color: cur.accent }}>{cur.en}</p>
          <div className="h-px w-12" style={{ background: cur.accent, opacity: 0.4 }} />
        </div>

        {/* 傘エリア（フェードクロス） */}
        <div className="relative flex items-center justify-center"
          style={{ width: 340, height: 440 }}>

          {/* 前の傘（フェードアウト） */}
          {prv && (
            <img src={prv.img} alt={prv.jp}
              className="absolute"
              style={{
                ...prv.imgStyle,
                width: 320, height: 420,
                objectFit: 'contain',
                opacity: 0,
                transition: 'opacity 0.9s ease',
              }} />
          )}

          {/* 現在の傘（フェードイン） */}
          <img src={cur.img} alt={cur.jp}
            className="absolute"
            style={{
              ...cur.imgStyle,
              width: 320, height: 420,
              objectFit: 'contain',
              opacity: fading ? 0 : 1,
              transition: fading
                ? 'opacity 0s'
                : 'opacity 0.9s ease, transform 1.2s cubic-bezier(0.4,0,0.2,1)',
              filter: `drop-shadow(0 30px 50px ${cur.accent}40)`,
            }} />
        </div>

        {/* 詩的なコピー */}
        <div className="mt-10 text-center">
          <p className="text-2xl font-bold tracking-wider transition-colors duration-700"
            style={{ color: '#2a2018', letterSpacing: '0.12em' }}>
            {cur.poem}
          </p>
          <p className="mt-2 text-sm tracking-[0.3em] transition-colors duration-700"
            style={{ color: cur.accent, opacity: 0.7 }}>okigasa</p>
        </div>

        {/* シーズンナビ */}
        <div className="flex items-center gap-10 mt-14">
          {SEASONS.map((s, i) => (
            <button key={s.id} onClick={() => { clearInterval(timerRef.current); goTo(i); }}
              className="flex flex-col items-center gap-2 transition-all duration-500 hover:opacity-100"
              style={{ opacity: i === idx ? 1 : 0.3 }}>
              <div className="rounded-full transition-all duration-500"
                style={{
                  width: i === idx ? 32 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === idx ? cur.accent : '#b0a898',
                  transition: 'width 0.5s ease, background 0.5s ease',
                }} />
              <span className="text-xs tracking-widest font-bold transition-colors duration-500"
                style={{ color: i === idx ? cur.accent : '#b0a898', fontSize: 10 }}>
                {s.jp}
              </span>
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}
