'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ── 季節定義 ─────────────────────────────────────────────────────
const SEASONS = [
  {
    id: 'spring',
    jp: '春',
    en: 'SPRING',
    poem: '桜、静かに降る。',
    img: '/umbrella-spring.png',
    particle: 'sakura',
    accent: '#e8a0b4',
  },
  {
    id: 'summer',
    jp: '夏',
    en: 'SUMMER',
    poem: '蛍、静かに灯る。',
    img: '/umbrella-summer.png',
    particle: 'fireflies',
    accent: '#7aabde',
  },
  {
    id: 'autumn',
    jp: '秋',
    en: 'AUTUMN',
    poem: '葉が、音もなく。',
    img: '/umbrella-autumn.png',
    particle: 'leaves',
    accent: '#d08050',
  },
  {
    id: 'winter',
    jp: '冬',
    en: 'WINTER',
    poem: '雪の中に、佇む。',
    img: '/umbrella-winter.png',
    particle: 'snow',
    accent: '#88b8d8',
  },
];

// ── 雨 Canvas ────────────────────────────────────────────────────
function RainCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const drops = Array.from({ length: 55 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      l: Math.random() * 16 + 7,
      speed: Math.random() * 3 + 2,
      opacity: Math.random() * 0.18 + 0.06,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      drops.forEach(d => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(160,200,180,${d.opacity})`;
        ctx.lineWidth = 0.7;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 4, d.y + d.l);
        ctx.stroke();
        d.y += d.speed;
        if (d.y > c.height) { d.y = -20; d.x = Math.random() * c.width; }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas ref={ref} width={1400} height={900}
      className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.5 }} />
  );
}

// ── 竹シルエット ─────────────────────────────────────────────────
function BambooSVG({ height = 300, color = '#1e3818' }) {
  const nodes = [0.2, 0.38, 0.54, 0.68, 0.80, 0.90];
  return (
    <svg width="36" height={height} viewBox={`0 0 36 ${height}`}>
      <rect x="12" y="0" width="12" height={height} rx="6" fill={color} opacity="0.75" />
      {nodes.map((n, i) => (
        <rect key={i} x="9" y={n * height} width="18" height="5" rx="2.5" fill={color} opacity="0.95" />
      ))}
    </svg>
  );
}

// ── 白背景除去 Canvas 傘 ─────────────────────────────────────────
function UmbrellaImage({ src, accent, opacity, transition }) {
  const canvasRef = useRef(null);
  const displayW = 270, displayH = 360;

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = displayW * 2;
      c.height = displayH * 2;
      const ctx = c.getContext('2d');
      const iw = img.width, ih = img.height;
      const cw = c.width, ch = c.height;
      const scale = Math.min(cw / iw, ch / ih);
      const dw = iw * scale, dh = ih * scale;
      const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
      const imgData = ctx.getImageData(0, 0, cw, ch);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
        if (a === 0) continue;
        const brightness = r * 0.299 + g * 0.587 + b * 0.114;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (brightness > 210 && sat < 45) {
          const fade = Math.max(0, (brightness - 210) / 45);
          d[i + 3] = Math.round(a * (1 - fade));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    };
    img.src = src;
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: displayW,
        height: displayH,
        display: 'block',
        opacity,
        transition,
        filter: `drop-shadow(0 20px 50px ${accent}60)`,
      }}
    />
  );
}

// ── パーティクル Canvas ──────────────────────────────────────────
function ParticleCanvas({ season }) {
  const ref = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;

    if (season.particle === 'sakura') {
      const colors = ['#f2b8c6', '#e8a0b4', '#f5c9d5', '#eba8bc', '#ffd0de'];
      const layers = [
        Array.from({ length: 35 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 2 + 0.8,
          vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 1.0 + 0.5,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.05,
          alpha: Math.random() * 0.3 + 0.1, phase: Math.random() * Math.PI * 2,
          color: colors[Math.floor(Math.random() * colors.length)],
        })),
        Array.from({ length: 20 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 3.5 + 2.5,
          vx: (Math.random() - 0.5) * 0.45, vy: Math.random() * 0.75 + 0.3,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.035,
          alpha: Math.random() * 0.45 + 0.18, phase: Math.random() * Math.PI * 2,
          color: colors[Math.floor(Math.random() * colors.length)],
        })),
        Array.from({ length: 8 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 4 + 6,
          vx: (Math.random() - 0.5) * 0.2, vy: Math.random() * 0.45 + 0.15,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.02,
          alpha: Math.random() * 0.5 + 0.25, phase: Math.random() * Math.PI * 2,
          color: colors[Math.floor(Math.random() * colors.length)],
        })),
      ];
      const drawPetal = (p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha; ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = p.alpha * 0.5;
        ctx.beginPath(); ctx.ellipse(p.r * 0.18, -p.r * 0.12, p.r * 0.72, p.r * 0.35, 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      };
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        layers.forEach(layer => layer.forEach(p => {
          p.phase += 0.014; p.x += p.vx + Math.sin(p.phase) * 0.4; p.y += p.vy; p.angle += p.spin;
          if (p.y > H + 16) { p.y = -16; p.x = Math.random() * W; }
          if (p.x < -16) p.x = W + 16; if (p.x > W + 16) p.x = -16;
          drawPetal(p);
        }));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

    } else if (season.particle === 'fireflies') {
      const flies = Array.from({ length: 22 }, () => ({
        x: W * 0.1 + Math.random() * W * 0.8, y: H * 0.25 + Math.random() * H * 0.6,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2,
        phase: Math.random() * Math.PI * 2, pulseSpeed: 0.018 + Math.random() * 0.018,
        r: Math.random() * 1.4 + 0.8, halo: Math.random() * 14 + 10,
        baseAlpha: Math.random() * 0.55 + 0.3,
        wanderAngle: Math.random() * Math.PI * 2, wanderSpeed: (Math.random() - 0.5) * 0.018,
        hue: 88 + Math.random() * 30,
      }));
      const farFlies = Array.from({ length: 14 }, () => ({
        x: Math.random() * W, y: H * 0.1 + Math.random() * H * 0.75,
        vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.1,
        phase: Math.random() * Math.PI * 2, pulseSpeed: 0.012 + Math.random() * 0.014,
        r: Math.random() * 0.7 + 0.3, halo: Math.random() * 6 + 4,
        baseAlpha: Math.random() * 0.28 + 0.1,
        wanderAngle: Math.random() * Math.PI * 2, wanderSpeed: (Math.random() - 0.5) * 0.012,
        hue: 90 + Math.random() * 25,
      }));
      const drawFly = (f) => {
        const pulse = (Math.sin(f.phase) + 1) / 2;
        const alpha = f.baseAlpha * (0.25 + pulse * 0.75);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.halo);
        g.addColorStop(0, `hsla(${f.hue},80%,68%,${alpha * 0.5})`);
        g.addColorStop(0.5, `hsla(${f.hue},70%,55%,${alpha * 0.15})`);
        g.addColorStop(1, `hsla(${f.hue},60%,45%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.halo, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = alpha * 0.92;
        ctx.fillStyle = `hsl(${f.hue + 20},90%,88%)`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      };
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        [...farFlies, ...flies].forEach(f => {
          f.phase += f.pulseSpeed;
          f.wanderAngle += f.wanderSpeed + (Math.random() - 0.5) * 0.008;
          f.x += f.vx + Math.cos(f.wanderAngle) * 0.28;
          f.y += f.vy + Math.sin(f.wanderAngle * 0.65) * 0.18;
          if (f.x < 0) f.x = W; if (f.x > W) f.x = 0;
          if (f.y < H * 0.05) f.y = H * 0.88; if (f.y > H * 0.95) f.y = H * 0.12;
          drawFly(f);
        });
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

    } else if (season.particle === 'leaves') {
      const leafColors = ['#c0602a', '#d4782a', '#b84820', '#e09040', '#7a3a10', '#cc6020'];
      const layers = [
        Array.from({ length: 18 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 4 + 2.5,
          vx: (Math.random() - 0.5) * 0.35, vy: Math.random() * 0.6 + 0.22,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.025,
          alpha: Math.random() * 0.28 + 0.1, phase: Math.random() * Math.PI * 2,
          color: leafColors[Math.floor(Math.random() * leafColors.length)],
        })),
        Array.from({ length: 12 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 5 + 6,
          vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * 0.75 + 0.28,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.022,
          alpha: Math.random() * 0.45 + 0.2, phase: Math.random() * Math.PI * 2,
          color: leafColors[Math.floor(Math.random() * leafColors.length)],
        })),
        Array.from({ length: 5 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 5 + 12,
          vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.45 + 0.15,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.015,
          alpha: Math.random() * 0.5 + 0.25, phase: Math.random() * Math.PI * 2,
          color: leafColors[Math.floor(Math.random() * leafColors.length)],
        })),
      ];
      const drawLeaf = (p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha; ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(0, -p.r);
        ctx.bezierCurveTo(p.r * 0.88, -p.r * 0.38, p.r * 0.78, p.r * 0.38, 0, p.r * 0.52);
        ctx.bezierCurveTo(-p.r * 0.78, p.r * 0.38, -p.r * 0.88, -p.r * 0.38, 0, -p.r);
        ctx.fillStyle = p.color; ctx.fill();
        ctx.globalAlpha = p.alpha * 0.25;
        ctx.strokeStyle = '#60280a'; ctx.lineWidth = Math.max(0.5, p.r * 0.07);
        ctx.beginPath(); ctx.moveTo(0, -p.r * 0.82); ctx.lineTo(0, p.r * 0.42); ctx.stroke();
        ctx.restore();
      };
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        layers.forEach(layer => layer.forEach(p => {
          p.phase += 0.012; p.x += p.vx + Math.sin(p.phase) * 0.55; p.y += p.vy; p.angle += p.spin;
          if (p.y > H + 22) { p.y = -22; p.x = Math.random() * W; }
          drawLeaf(p);
        }));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

    } else if (season.particle === 'snow') {
      const layers = [
        Array.from({ length: 65 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 0.9 + 0.3,
          vx: (Math.random() - 0.5) * 0.2, vy: Math.random() * 0.55 + 0.18,
          alpha: Math.random() * 0.25 + 0.08, phase: Math.random() * Math.PI * 2,
        })),
        Array.from({ length: 28 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.6 + 1.2,
          vx: (Math.random() - 0.5) * 0.28, vy: Math.random() * 0.38 + 0.12,
          alpha: Math.random() * 0.38 + 0.14, phase: Math.random() * Math.PI * 2,
        })),
        Array.from({ length: 10 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 2.5 + 3,
          vx: (Math.random() - 0.5) * 0.12, vy: Math.random() * 0.2 + 0.06,
          alpha: Math.random() * 0.28 + 0.1, phase: Math.random() * Math.PI * 2,
        })),
      ];
      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        layers.forEach((layer, li) => layer.forEach(p => {
          p.phase += 0.009;
          p.x += p.vx + Math.sin(p.phase) * 0.22; p.y += p.vy;
          if (p.y > H + 12) { p.y = -12; p.x = Math.random() * W; }
          if (p.x < -12) p.x = W + 12; if (p.x > W + 12) p.x = -12;
          if (li === 2) {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
            g.addColorStop(0, `rgba(200,225,255,${p.alpha})`);
            g.addColorStop(0.5, `rgba(200,225,255,${p.alpha * 0.4})`);
            g.addColorStop(1, 'rgba(200,225,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = li === 0 ? '#a8c8e8' : '#c0daf8';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
          }
        }));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    }

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [season]);

  return (
    <canvas ref={ref} width={800} height={600}
      className="absolute inset-0 w-full h-full pointer-events-none" />
  );
}

// ── メインコンポーネント ──────────────────────────────────────────
export default function SeasonSlider() {
  const [idx, setIdx]               = useState(0);
  const [imgSrc, setImgSrc]         = useState(SEASONS[0].img);
  const [imgOpacity, setImgOpacity] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef(null);

  const goTo = (next) => {
    if (transitioning || next === idx) return;
    setTransitioning(true);
    setImgOpacity(0);
    setTimeout(() => {
      setIdx(next);
      setImgSrc(SEASONS[next].img);
      setTimeout(() => {
        setImgOpacity(1);
        setTimeout(() => setTransitioning(false), 500);
      }, 50);
    }, 400);
  };

  const advance = () => goTo((idx + 1) % SEASONS.length);

  useEffect(() => {
    timerRef.current = setInterval(advance, 5500);
    return () => clearInterval(timerRef.current);
  }, [idx, transitioning]);

  const cur = SEASONS[idx];

  return (
    <section
      className="relative overflow-hidden flex flex-col items-center justify-center"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(170deg, #0c0b09 0%, #100e0a 60%, #0e0d0b 100%)',
      }}>

      {/* 雨 */}
      <RainCanvas />

      {/* 竹シルエット */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { left: '4%',  h: 420, delay: '0s'   },
          { left: '9%',  h: 560, delay: '1.2s' },
          { left: '14%', h: 340, delay: '0.6s' },
          { right: '5%', h: 480, delay: '1.8s' },
          { right: '11%',h: 360, delay: '0.3s' },
          { right: '17%',h: 500, delay: '2.4s' },
        ].map((b, i) => (
          <div key={i} className="sway" style={{
            position: 'absolute', bottom: 0,
            left: b.left, right: b.right,
            transformOrigin: 'bottom center',
            animationDelay: b.delay,
          }}>
            <BambooSVG height={b.h} color={i % 2 === 0 ? '#1e3818' : '#182e14'} />
          </div>
        ))}
      </div>

      {/* 左上：ブランドカード */}
      <div className="absolute z-20" style={{ top: 28, left: 32 }}>
        <div style={{
          padding: '14px 18px',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/okigasa-logo.jpg" alt="okigasa"
              style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', opacity: 0.9 }} />
            <div>
              <p style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.07em', color: '#d4a870', lineHeight: 1.2 }}>
                okigasa
              </p>
              <p style={{ fontSize: 9, color: 'rgba(240,230,210,0.4)', letterSpacing: '0.1em', marginTop: 3 }}>
                竹林から、雨の日まで。
              </p>
            </div>
          </div>
          <Link href="/map" style={{
            display: 'block',
            textAlign: 'center',
            padding: '7px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(240,230,210,0.55)',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            transition: 'background 0.3s',
          }}>
            竹林マップ →
          </Link>
        </div>
      </div>

      {/* 季節コンテンツ（中央） */}
      <div className="relative z-10 flex flex-col items-center" style={{ padding: '80px 32px 48px' }}>

        {/* 季節ラベル */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{ height: 1, width: 40, background: cur.accent, opacity: 0.4 }} />
          <p style={{
            fontSize: 10, letterSpacing: '0.5em', fontWeight: 700,
            color: cur.accent, transition: 'color 0.7s',
          }}>{cur.en}</p>
          <div style={{ height: 1, width: 40, background: cur.accent, opacity: 0.4 }} />
        </div>

        {/* 傘 */}
        <div style={{ position: 'relative', width: 290, height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UmbrellaImage
            src={imgSrc}
            accent={cur.accent}
            opacity={imgOpacity}
            transition={imgOpacity === 0 ? 'opacity 0.4s ease' : 'opacity 0.5s ease'}
          />
        </div>

        {/* 詩 */}
        <p style={{
          marginTop: 28,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'rgba(240,230,210,0.82)',
          transition: 'color 0.7s',
          textAlign: 'center',
        }}>
          {cur.poem}
        </p>

        {/* 季節ナビ */}
        <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
          {SEASONS.map((s, i) => {
            const active = i === idx;
            return (
              <button
                key={s.id}
                onClick={() => { clearInterval(timerRef.current); goTo(i); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '12px 20px', borderRadius: 999, minWidth: 68,
                  background: active ? cur.accent : 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${active ? cur.accent : 'rgba(255,255,255,0.12)'}`,
                  color: active ? '#0c0b09' : 'rgba(240,230,210,0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1)',
                  transform: active ? 'scale(1.06)' : 'scale(1)',
                }}>
                <span style={{ fontSize: 17, fontWeight: 900, lineHeight: 1 }}>{s.jp}</span>
                <span style={{ fontSize: 8, letterSpacing: '0.2em', fontWeight: 700, opacity: 0.8 }}>{s.en}</span>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}
