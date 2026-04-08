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
    accent: '#c9909a',
  },
  {
    id: 'summer',
    jp: '夏',
    en: 'SUMMER',
    poem: '蛍、静かに灯る。',
    img: '/umbrella-summer.png',
    particle: 'fireflies',
    accent: '#5878b8',
  },
  {
    id: 'autumn',
    jp: '秋',
    en: 'AUTUMN',
    poem: '葉が、音もなく。',
    img: '/umbrella-autumn.png',
    particle: 'leaves',
    accent: '#a06030',
  },
  {
    id: 'winter',
    jp: '冬',
    en: 'WINTER',
    poem: '雪の中に、佇む。',
    img: '/umbrella-winter.png',
    particle: 'snow',
    accent: '#6090b0',
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

    // ── 春：桜（奥行き3層） ──────────────────────────────────
    if (season.particle === 'sakura') {
      const petalColors = ['#f2b8c6', '#e8a0b4', '#f5c9d5', '#eba8bc', '#f8d5de'];
      const layers = [
        // 遠景：小さく淡く速め
        Array.from({ length: 35 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 2 + 0.8,
          vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 1.0 + 0.5,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.05,
          alpha: Math.random() * 0.18 + 0.06, phase: Math.random() * Math.PI * 2,
          color: petalColors[Math.floor(Math.random() * petalColors.length)],
        })),
        // 中景：標準
        Array.from({ length: 20 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 3.5 + 2.5,
          vx: (Math.random() - 0.5) * 0.45, vy: Math.random() * 0.75 + 0.3,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.035,
          alpha: Math.random() * 0.32 + 0.14, phase: Math.random() * Math.PI * 2,
          color: petalColors[Math.floor(Math.random() * petalColors.length)],
        })),
        // 近景：大きく濃くゆっくり
        Array.from({ length: 8 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 4 + 6,
          vx: (Math.random() - 0.5) * 0.2, vy: Math.random() * 0.45 + 0.15,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.02,
          alpha: Math.random() * 0.38 + 0.2, phase: Math.random() * Math.PI * 2,
          color: petalColors[Math.floor(Math.random() * petalColors.length)],
        })),
      ];

      const drawPetal = (p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        // 花びら形（楕円を2枚重ね）
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = p.alpha * 0.5;
        ctx.beginPath();
        ctx.ellipse(p.r * 0.18, -p.r * 0.12, p.r * 0.72, p.r * 0.35, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        // 下部に淡いピンクのもや
        const fog = ctx.createLinearGradient(0, H * 0.6, 0, H);
        fog.addColorStop(0, 'rgba(242,184,200,0)');
        fog.addColorStop(1, 'rgba(242,184,200,0.07)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, W, H);

        layers.forEach(layer => {
          layer.forEach(p => {
            p.phase += 0.014;
            p.x += p.vx + Math.sin(p.phase) * 0.4;
            p.y += p.vy;
            p.angle += p.spin;
            if (p.y > H + 16) { p.y = -16; p.x = Math.random() * W; }
            if (p.x < -16) p.x = W + 16;
            if (p.x > W + 16) p.x = -16;
            drawPetal(p);
          });
        });

        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

    // ── 夏：蛍 ──────────────────────────────────────────────
    } else if (season.particle === 'fireflies') {
      const flies = Array.from({ length: 22 }, () => ({
        x: W * 0.1 + Math.random() * W * 0.8,
        y: H * 0.25 + Math.random() * H * 0.6,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.018 + Math.random() * 0.018,
        r: Math.random() * 1.4 + 0.8,
        halo: Math.random() * 14 + 10,
        baseAlpha: Math.random() * 0.45 + 0.25,
        wanderAngle: Math.random() * Math.PI * 2,
        wanderSpeed: (Math.random() - 0.5) * 0.018,
        hue: 88 + Math.random() * 30,  // 黄緑〜緑
      }));

      // 遠くの小さな蛍
      const farFlies = Array.from({ length: 14 }, () => ({
        x: Math.random() * W, y: H * 0.1 + Math.random() * H * 0.75,
        vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.1,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.012 + Math.random() * 0.014,
        r: Math.random() * 0.7 + 0.3,
        halo: Math.random() * 6 + 4,
        baseAlpha: Math.random() * 0.22 + 0.08,
        wanderAngle: Math.random() * Math.PI * 2,
        wanderSpeed: (Math.random() - 0.5) * 0.012,
        hue: 90 + Math.random() * 25,
      }));

      const drawFly = (f) => {
        const pulse = (Math.sin(f.phase) + 1) / 2;
        const alpha = f.baseAlpha * (0.25 + pulse * 0.75);

        // 外側のぼんやりしたハロー
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.halo);
        g.addColorStop(0, `hsla(${f.hue},80%,68%,${alpha * 0.35})`);
        g.addColorStop(0.4, `hsla(${f.hue},70%,60%,${alpha * 0.12})`);
        g.addColorStop(1, `hsla(${f.hue},60%,50%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.halo, 0, Math.PI * 2);
        ctx.fill();

        // 中心の光点
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = `hsl(${f.hue + 20},90%,88%)`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      };

      const tick = () => {
        ctx.clearRect(0, 0, W, H);

        [...farFlies, ...flies].forEach(f => {
          f.phase += f.pulseSpeed;
          f.wanderAngle += f.wanderSpeed + (Math.random() - 0.5) * 0.008;
          f.x += f.vx + Math.cos(f.wanderAngle) * 0.28;
          f.y += f.vy + Math.sin(f.wanderAngle * 0.65) * 0.18;
          if (f.x < 0) f.x = W;
          if (f.x > W) f.x = 0;
          if (f.y < H * 0.05) f.y = H * 0.88;
          if (f.y > H * 0.95) f.y = H * 0.12;
          drawFly(f);
        });

        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

    // ── 秋：落ち葉（奥行き3層） ──────────────────────────────
    } else if (season.particle === 'leaves') {
      const leafColors = ['#c0602a', '#d4782a', '#b84820', '#e09040', '#7a3a10', '#cc6020'];

      const layers = [
        // 遠景
        Array.from({ length: 18 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 4 + 2.5,
          vx: (Math.random() - 0.5) * 0.35, vy: Math.random() * 0.6 + 0.22,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.025,
          alpha: Math.random() * 0.2 + 0.08, phase: Math.random() * Math.PI * 2,
          color: leafColors[Math.floor(Math.random() * leafColors.length)],
        })),
        // 中景
        Array.from({ length: 12 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 5 + 6,
          vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * 0.75 + 0.28,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.022,
          alpha: Math.random() * 0.35 + 0.18, phase: Math.random() * Math.PI * 2,
          color: leafColors[Math.floor(Math.random() * leafColors.length)],
        })),
        // 近景
        Array.from({ length: 5 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 5 + 12,
          vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.45 + 0.15,
          angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.015,
          alpha: Math.random() * 0.4 + 0.22, phase: Math.random() * Math.PI * 2,
          color: leafColors[Math.floor(Math.random() * leafColors.length)],
        })),
      ];

      const drawLeaf = (p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(0, -p.r);
        ctx.bezierCurveTo(p.r * 0.88, -p.r * 0.38, p.r * 0.78, p.r * 0.38, 0, p.r * 0.52);
        ctx.bezierCurveTo(-p.r * 0.78, p.r * 0.38, -p.r * 0.88, -p.r * 0.38, 0, -p.r);
        ctx.fillStyle = p.color;
        ctx.fill();
        // 葉脈
        ctx.globalAlpha = p.alpha * 0.28;
        ctx.strokeStyle = '#60280a';
        ctx.lineWidth = Math.max(0.5, p.r * 0.07);
        ctx.beginPath();
        ctx.moveTo(0, -p.r * 0.82);
        ctx.lineTo(0, p.r * 0.42);
        ctx.stroke();
        ctx.restore();
      };

      const tick = () => {
        ctx.clearRect(0, 0, W, H);
        // 底部に琥珀色のもや
        const fog = ctx.createLinearGradient(0, H * 0.62, 0, H);
        fog.addColorStop(0, 'rgba(160,70,20,0)');
        fog.addColorStop(1, 'rgba(160,70,20,0.055)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, W, H);

        layers.forEach(layer => {
          layer.forEach(p => {
            p.phase += 0.012;
            p.x += p.vx + Math.sin(p.phase) * 0.55;
            p.y += p.vy;
            p.angle += p.spin;
            if (p.y > H + 22) { p.y = -22; p.x = Math.random() * W; }
            drawLeaf(p);
          });
        });

        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

    // ── 冬：雪（スノーグローブ3層） ──────────────────────────
    } else if (season.particle === 'snow') {
      const layers = [
        // 遠景：細かく速め
        Array.from({ length: 65 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 0.9 + 0.3,
          vx: (Math.random() - 0.5) * 0.2, vy: Math.random() * 0.55 + 0.18,
          alpha: Math.random() * 0.18 + 0.05, phase: Math.random() * Math.PI * 2,
        })),
        // 中景
        Array.from({ length: 28 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.6 + 1.2,
          vx: (Math.random() - 0.5) * 0.28, vy: Math.random() * 0.38 + 0.12,
          alpha: Math.random() * 0.28 + 0.1, phase: Math.random() * Math.PI * 2,
        })),
        // 近景：大きくぼんやり
        Array.from({ length: 10 }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 2.5 + 3,
          vx: (Math.random() - 0.5) * 0.12, vy: Math.random() * 0.2 + 0.06,
          alpha: Math.random() * 0.22 + 0.08, phase: Math.random() * Math.PI * 2,
        })),
      ];

      const tick = () => {
        ctx.clearRect(0, 0, W, H);

        layers.forEach((layer, li) => {
          layer.forEach(p => {
            p.phase += 0.009;
            p.x += p.vx + Math.sin(p.phase) * 0.22;
            p.y += p.vy;
            if (p.y > H + 12) { p.y = -12; p.x = Math.random() * W; }
            if (p.x < -12) p.x = W + 12;
            if (p.x > W + 12) p.x = -12;

            if (li === 2) {
              // 近景：放射グラデーションで柔らかいぼかし
              const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
              g.addColorStop(0, `rgba(210,230,255,${p.alpha})`);
              g.addColorStop(0.5, `rgba(210,230,255,${p.alpha * 0.4})`);
              g.addColorStop(1, 'rgba(210,230,255,0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.globalAlpha = p.alpha;
              ctx.fillStyle = li === 0 ? '#b8d0e8' : '#cce0f5';
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          });
        });

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
    <section style={{ background: '#f8f6f0' }} className="relative overflow-hidden">

      {/* 大きな季節文字（背景に薄く） */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="font-black transition-all duration-1000"
          style={{
            fontSize: 'clamp(180px, 40vw, 380px)',
            color: cur.accent,
            opacity: 0.055,
            lineHeight: 1,
            letterSpacing: '-0.05em',
          }}>
          {cur.jp}
        </span>
      </div>

      {/* パーティクル */}
      <ParticleCanvas season={cur} key={cur.id} />

      {/* 左上ロゴカード */}
      <div className="absolute z-20" style={{ top: 28, left: 32 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.07)',
        }}>
          <img src="/okigasa-logo.jpg" alt="okigasa"
            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.08em', color: '#b07840', lineHeight: 1.2 }}>
              okigasa
            </p>
            <p style={{ fontSize: 9, color: 'rgba(40,28,12,0.45)', letterSpacing: '0.1em', marginTop: 2 }}>
              竹林から、雨の日まで。
            </p>
          </div>
        </div>
      </div>

      {/* メインコンテンツ（季節） */}
      <div className="relative z-10 max-w-3xl mx-auto px-8 py-16 flex flex-col items-center">

        {/* 季節ラベル */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px w-10" style={{ background: cur.accent, opacity: 0.35 }} />
          <p className="text-xs tracking-[0.5em] font-bold transition-colors duration-700"
            style={{ color: cur.accent }}>{cur.en}</p>
          <div className="h-px w-10" style={{ background: cur.accent, opacity: 0.35 }} />
        </div>

        {/* 傘エリア（小さめ） */}
        <div className="relative flex items-center justify-center"
          style={{ width: 290, height: 380 }}>
          <img src={imgSrc} alt={cur.jp}
            style={{
              position: 'absolute',
              width: 270,
              height: 360,
              objectFit: 'contain',
              opacity: imgOpacity,
              transition: imgOpacity === 0 ? 'opacity 0.4s ease' : 'opacity 0.5s ease',
              mixBlendMode: 'multiply',
              filter: `drop-shadow(0 20px 40px ${cur.accent}40)`,
            }} />
        </div>

        {/* 詩的なコピー */}
        <div className="mt-8 text-center">
          <p className="text-xl font-bold tracking-wider transition-colors duration-700"
            style={{ color: '#2a2018', letterSpacing: '0.12em' }}>
            {cur.poem}
          </p>
        </div>

        {/* シーズンナビ（ピル型ボタン） */}
        <div className="flex items-center gap-3 mt-10">
          {SEASONS.map((s, i) => {
            const active = i === idx;
            return (
              <button
                key={s.id}
                onClick={() => { clearInterval(timerRef.current); goTo(i); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '12px 20px',
                  borderRadius: 999,
                  minWidth: 68,
                  background: active ? cur.accent : 'rgba(0,0,0,0.04)',
                  border: `1.5px solid ${active ? cur.accent : 'rgba(0,0,0,0.1)'}`,
                  color: active ? '#fff' : 'rgba(40,28,12,0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1)',
                  transform: active ? 'scale(1.06)' : 'scale(1)',
                }}>
                <span style={{ fontSize: 17, fontWeight: 900, lineHeight: 1 }}>{s.jp}</span>
                <span style={{ fontSize: 8, letterSpacing: '0.2em', fontWeight: 700, opacity: 0.8 }}>
                  {s.en}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}
