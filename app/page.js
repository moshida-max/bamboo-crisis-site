'use client';

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SeasonSlider from "./components/SeasonSlider";

// ── CSS アニメーション ─────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes sway {
    0%,100% { transform: rotate(-4deg); }
    50%      { transform: rotate(4deg); }
  }
  @keyframes float {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-18px); }
  }
  @keyframes floatSlow {
    0%,100% { transform: translateY(0px) rotate(0deg); }
    50%      { transform: translateY(-10px) rotate(6deg); }
  }
  @keyframes rain {
    0%   { transform: translateY(-20px) translateX(0); opacity:0; }
    10%  { opacity:0.6; }
    100% { transform: translateY(100vh) translateX(-40px); opacity:0; }
  }
  @keyframes reveal {
    from { opacity:0; transform:translateY(40px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes spinSlow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes grow {
    from { transform: scaleY(0); transform-origin: bottom; }
    to   { transform: scaleY(1); transform-origin: bottom; }
  }
  @keyframes pulse-glow {
    0%,100% { box-shadow: 0 0 20px rgba(200,169,110,0.2); }
    50%      { box-shadow: 0 0 50px rgba(200,169,110,0.5); }
  }
  .sway      { animation: sway 6s ease-in-out infinite; }
  .float     { animation: float 5s ease-in-out infinite; }
  .float-slow{ animation: floatSlow 8s ease-in-out infinite; }
  .reveal    { animation: reveal 0.9s cubic-bezier(0.22,1,0.36,1) forwards; }
  .pulse-glow{ animation: pulse-glow 3s ease-in-out infinite; }
`;

// ── 雨アニメーション（Canvas） ────────────────────────────────
function RainCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const drops = Array.from({length:60}, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      l: Math.random() * 18 + 8,
      speed: Math.random() * 3 + 2,
      opacity: Math.random() * 0.3 + 0.1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      drops.forEach(d => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(80,120,80,${d.opacity})`;
        ctx.lineWidth = 0.8;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 5, d.y + d.l);
        ctx.stroke();
        d.y += d.speed;
        if (d.y > c.height) { d.y = -20; d.x = Math.random() * c.width; }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={1200} height={800}
    className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />;
}

// ── SVG 傘シルエット ──────────────────────────────────────────
function UmbrellaSVG({ size = 120, color = '#c8a96e', style = {} }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 100 130" fill="none" style={style}>
      {/* 傘の骨 */}
      {[0,20,40,60,80,100,120,140,160,180,200,220,240,260,280,300,320,340].map((deg,i) => (
        <line key={i}
          x1="50" y1="30"
          x2={50 + 48 * Math.cos((deg-90)*Math.PI/180)}
          y2={30 + 30 * Math.sin((deg-90)*Math.PI/180)}
          stroke={color} strokeWidth="0.5" opacity="0.4" />
      ))}
      {/* 傘の天蓋 */}
      <ellipse cx="50" cy="30" rx="48" ry="28" fill={color} opacity="0.15" />
      <path d="M2 30 Q50 0 98 30 Q74 60 50 58 Q26 60 2 30Z" fill={color} opacity="0.85" />
      {/* 波打ちエッジ */}
      <path d="M2 30 Q8 38 14 34 Q20 42 26 38 Q32 46 38 42 Q44 50 50 46 Q56 50 62 42 Q68 46 74 38 Q80 42 86 34 Q92 38 98 30"
        stroke={color} strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* 柄（竹） */}
      <rect x="47.5" y="56" width="5" height="55" rx="2.5" fill="#a0825a" />
      <rect x="47.5" y="70" width="5" height="3" rx="1" fill="#7a6040" />
      <rect x="47.5" y="88" width="5" height="3" rx="1" fill="#7a6040" />
      {/* 石突 */}
      <circle cx="50" cy="112" r="3" fill="#a0825a" />
      {/* 露先（フリンジ） */}
      <path d="M2 30 Q-2 35 2 40 M14 34 Q12 40 16 44 M26 38 Q24 44 28 48 M38 42 Q36 48 40 52 M50 46 Q50 52 50 56 M62 42 Q64 48 60 52 M74 38 Q76 44 72 48 M86 34 Q88 40 84 44 M98 30 Q102 35 98 40"
        stroke={color} strokeWidth="1.2" fill="none" opacity="0.5" />
      {/* 石 */}
      <circle cx="50" cy="28" r="3" fill={color} />
    </svg>
  );
}

// ── 竹シルエット ─────────────────────────────────────────────
function BambooSVG({ height = 300, color = '#4a7c40', x = 0 }) {
  const nodes = [0.2, 0.38, 0.54, 0.68, 0.80, 0.90];
  return (
    <svg width="40" height={height} viewBox={`0 0 40 ${height}`} style={{position:'absolute', left:x}}>
      <rect x="14" y="0" width="12" height={height} rx="6" fill={color} opacity="0.7" />
      {nodes.map((n, i) => (
        <rect key={i} x="11" y={n * height} width="18" height="5" rx="2.5"
          fill={color} opacity="0.9" />
      ))}
    </svg>
  );
}

// ── ヒーローセクション ────────────────────────────────────────
function Hero() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{background: '#f8f6f0'}}>

      <RainCanvas />

      {/* 竹シルエット群（背景） */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="sway" style={{position:'absolute', bottom:0, left:'5%', transformOrigin:'bottom center'}}>
          <BambooSVG height={380} color="#5a8a50" />
        </div>
        <div className="sway" style={{position:'absolute', bottom:0, left:'10%', animationDelay:'1s', transformOrigin:'bottom center'}}>
          <BambooSVG height={500} color="#4a7a42" />
        </div>
        <div className="sway" style={{position:'absolute', bottom:0, right:'8%', animationDelay:'2s', transformOrigin:'bottom center'}}>
          <BambooSVG height={450} color="#5a8a50" />
        </div>
        <div className="sway" style={{position:'absolute', bottom:0, right:'14%', animationDelay:'0.5s', transformOrigin:'bottom center'}}>
          <BambooSVG height={320} color="#3e6e36" />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 gap-8 max-w-5xl mx-auto">

        {/* ブランド名 */}
        <div className={`transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs tracking-[0.4em] font-bold mb-3" style={{color:'#a08060', opacity:0.8}}>BAMBOO CRAFT</p>
          <h1 className="text-7xl md:text-9xl font-black tracking-tight" style={{color:'#1a1208', letterSpacing:'-0.02em', lineHeight:1}}>
            oki<span style={{color:'#b07840'}}>gasa</span>
          </h1>
          <p className="text-base md:text-lg mt-4 font-light" style={{color:'rgba(40,28,12,0.45)', letterSpacing:'0.15em'}}>
            置 き 傘
          </p>
        </div>

        {/* 傘 + ロゴカード */}
        <div className={`flex flex-col md:flex-row items-center gap-10 mt-4 transition-all duration-700 delay-200 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* 左：SVG傘 アニメーション */}
          <div className="float" style={{filter:'drop-shadow(0 20px 40px rgba(160,120,60,0.25))'}}>
            <UmbrellaSVG size={160} color="#b07840" />
          </div>

          {/* 中：ロゴカード */}
          <div className="rounded-3xl flex flex-col items-center justify-center p-8 gap-6"
            style={{background:'rgba(255,255,255,0.7)', border:'1px solid rgba(160,120,60,0.2)', backdropFilter:'blur(8px)'}}>
            <img src="/okigasa-logo.jpg" alt="okigasa logo"
              className="w-32 h-32 rounded-full object-cover"
              style={{boxShadow:'0 10px 30px rgba(0,0,0,0.15)'}} />
            <div className="text-center">
              <p className="text-2xl font-black tracking-widest" style={{color:'#b07840'}}>okigasa</p>
              <p className="text-xs mt-1" style={{color:'rgba(40,28,12,0.4)'}}>竹林から、雨の日まで。</p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              {['孟宗竹','竹和紙','手作業'].map(t => (
                <span key={t} className="text-[10px] px-3 py-1.5 rounded-full font-bold"
                  style={{background:'rgba(160,120,60,0.1)',color:'#b07840',border:'1px solid rgba(160,120,60,0.25)'}}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* 右：SVG傘（色違い） */}
          <div className="float-slow" style={{filter:'drop-shadow(0 20px 40px rgba(80,150,80,0.2))', animationDelay:'2s'}}>
            <UmbrellaSVG size={130} color="#5a9a5e" />
          </div>
        </div>

        {/* CTAボタン */}
        <div className={`flex flex-wrap gap-4 justify-center mt-2 transition-all duration-700 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Link href="/map"
            className="px-8 py-4 rounded-2xl font-black text-sm transition-all hover:-translate-y-1"
            style={{background:'rgba(0,0,0,0.07)', color:'#1a1208', border:'1px solid rgba(0,0,0,0.12)'}}>
            竹林マップ →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── (削除済み) FactSection ────────────────────────────────────
function FactSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden"
      style={{background:'#0d0d0a'}}>
      <div className="max-w-5xl mx-auto">

        {/* ビッグスタット */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px mb-24"
          style={{background:'rgba(200,169,110,0.1)', borderRadius:24, overflow:'hidden'}}>
          {[
            {n:'17万', u:'ヘクタール', l:'管理放棄竹林の推計面積'},
            {n:'1.2m', u:'/ 日', l:'孟宗竹が伸びる速さ'},
            {n:'120年', u:'に1度', l:'真竹が花を咲かせる周期'},
          ].map(s => (
            <div key={s.l} className="flex flex-col items-center justify-center py-12 px-8 text-center"
              style={{background:'#0d0d0a'}}>
              <span className="text-5xl md:text-6xl font-black" style={{color:'#c8a96e'}}>{s.n}</span>
              <span className="text-lg font-bold mb-2" style={{color:'rgba(200,169,110,0.6)'}}>{s.u}</span>
              <p className="text-xs" style={{color:'rgba(240,235,224,0.35)', letterSpacing:'0.1em'}}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* ストーリー */}
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-black leading-snug mb-6" style={{color:'#f0ebe0'}}>
              問題を見て、<br />怒るより、<br /><span style={{color:'#c8a96e'}}>作ることにした。</span>
            </h2>
            <div className="space-y-4 text-sm leading-relaxed" style={{color:'rgba(240,235,224,0.5)'}}>
              <p>竹は悪者じゃない。ただ、誰も使わなくなっただけ。</p>
              <p>かつて日本人は竹で籠を編み、家を建て、傘を張った。それが途絶えた今、竹は「問題」になった。</p>
              <p>okigasaは竹から和傘を作る。データで嘆くのではなく、手を動かして竹林に還る。それが私たちの答えだ。</p>
            </div>
          </div>
          <div className="flex-1 relative">
            {/* 写真：赤傘 */}
            <div className="rounded-3xl overflow-hidden aspect-[3/4] relative"
              style={{boxShadow:'0 40px 80px rgba(0,0,0,0.6)'}}>
              <img src="/umbrella-red.jpg" alt="okigasa 赤傘"
                className="w-full h-full object-cover" />
              <div className="absolute inset-0"
                style={{background:'linear-gradient(to top, rgba(10,10,8,0.6) 0%, transparent 50%)'}} />
            </div>
            {/* フローティングバッジ */}
            <div className="absolute -top-4 -right-4 rounded-2xl px-4 py-3 text-center"
              style={{background:'#c8a96e', color:'#0a0a08', boxShadow:'0 10px 30px rgba(200,169,110,0.4)'}}>
              <p className="text-xs font-bold">竹製の柄</p>
              <p className="text-2xl font-black">100%</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 作品セクション ────────────────────────────────────────────
function ProductSection() {
  return (
    <section id="products" className="py-24 px-6"
      style={{background:'linear-gradient(180deg, #0d0d0a 0%, #111209 100%)'}}>
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <p className="text-xs tracking-widest font-bold mb-3" style={{color:'#7bc67e'}}>COLLECTION</p>
          <h2 className="text-4xl md:text-5xl font-black" style={{color:'#f0ebe0'}}>
            竹が、雨に<span style={{color:'#7bc67e'}}>なる</span>。
          </h2>
          <p className="mt-4 text-sm" style={{color:'rgba(240,235,224,0.35)'}}>
            一本一本、竹林から始まる。
          </p>
        </div>

        {/* グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* メイン：緑傘 */}
          <div className="rounded-3xl overflow-hidden relative group aspect-square md:aspect-auto md:row-span-2"
            style={{boxShadow:'0 30px 60px rgba(0,0,0,0.5)'}}>
            <img src="/umbrella-green.jpg" alt="okigasa 緑傘"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </div>

          {/* 赤傘 */}
          <div className="rounded-3xl overflow-hidden relative group aspect-square"
            style={{boxShadow:'0 30px 60px rgba(0,0,0,0.5)'}}>
            <img src="/umbrella-red.jpg" alt="okigasa 赤傘"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </div>

          {/* ロゴカード */}
          <div className="rounded-3xl flex flex-col items-center justify-center aspect-square p-8 gap-6"
            style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(200,169,110,0.2)'}}>
            <img src="/okigasa-logo.jpg" alt="okigasa logo"
              className="w-32 h-32 rounded-full object-cover"
              style={{boxShadow:'0 10px 30px rgba(0,0,0,0.4)'}} />
            <div className="text-center">
              <p className="text-2xl font-black tracking-widest" style={{color:'#c8a96e'}}>okigasa</p>
              <p className="text-xs mt-1" style={{color:'rgba(240,235,224,0.3)'}}>
                竹林から、雨の日まで。
              </p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              {['孟宗竹','竹和紙','手作業'].map(t => (
                <span key={t} className="text-[10px] px-3 py-1.5 rounded-full font-bold"
                  style={{background:'rgba(200,169,110,0.1)',color:'#c8a96e',border:'1px solid rgba(200,169,110,0.25)'}}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 竹マップ接続 ─────────────────────────────────────────────
function MapSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden"
      style={{background:'#080d07'}}>
      {/* 背景竹シルエット */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {[5,15,25,70,80,90].map((l,i) => (
          <div key={i} className="sway absolute bottom-0"
            style={{left:`${l}%`, transformOrigin:'bottom center', animationDelay:`${i*0.7}s`}}>
            <BambooSVG height={300+i*40} color="#3a6a30" />
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto relative z-10 text-center">
        <h2 className="text-3xl md:text-4xl font-black leading-snug mb-6" style={{color:'#f0ebe0'}}>
          竹の現状を、<br /><span style={{color:'#7bc67e'}}>地図で見てほしい。</span>
        </h2>
        <p className="text-sm leading-relaxed mb-10" style={{color:'rgba(240,235,224,0.45)'}}>
          林野庁の実測データと衛星データをもとに、<br />
          47都道府県の孟宗竹侵食状況を1915年から2050年まで可視化した。<br />
          楽しくて、ちょっと怖い。
        </p>

        {/* マップカード */}
        <div className="rounded-3xl overflow-hidden relative"
          style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(123,198,126,0.2)',boxShadow:'0 30px 60px rgba(0,0,0,0.4)'}}>
          {/* プレビュー */}
          <div className="h-40 relative overflow-hidden flex items-center justify-center"
            style={{background:'linear-gradient(135deg,#060e06,#0d1a0a)'}}>
            <div className="flex gap-4 opacity-50">
              {[...Array(8)].map((_,i) => (
                <div key={i} className="rounded-lg"
                  style={{
                    width: 28, height: 28+i*8,
                    background:`hsl(${100+i*15},60%,${25+i*4}%)`,
                    transform:`translateY(${Math.sin(i)*10}px)`,
                  }} />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl">🗾</span>
            </div>
          </div>

          <div className="p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-left">
              <h3 className="text-xl font-black mb-2" style={{color:'#f0ebe0'}}>孟宗竹 侵食マップ</h3>
              <p className="text-xs leading-relaxed" style={{color:'rgba(240,235,224,0.4)'}}>
                タイムスライダーで1915〜2050年を体感。<br />
                ホバーで都道府県ごとの詳細データ表示。
              </p>
            </div>
            <Link href="/map"
              className="shrink-0 px-8 py-4 rounded-2xl font-black text-sm transition-all hover:-translate-y-1"
              style={{background:'#7bc67e',color:'#080d07',boxShadow:'0 10px 30px rgba(123,198,126,0.3)'}}>
              マップを開く →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── フッター ─────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-12 px-6 text-center"
      style={{background:'#080806',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
      <p className="text-2xl font-black tracking-widest mb-2" style={{color:'#d4a870'}}>okigasa</p>
      <p className="text-xs mb-6" style={{color:'rgba(240,230,210,0.22)'}}>竹林から、雨の日まで。</p>
      <p className="text-[10px] leading-loose" style={{color:'rgba(240,230,210,0.14)'}}>
        竹林データ：林野庁 森林資源現況調査（2022年）・JAXA 高解像度土地被覆図 2024年版<br />
        本サイトは農林水産省・林野庁・JAXAとは無関係の個人制作サイトです。
      </p>
    </footer>
  );
}

// ── ページ ───────────────────────────────────────────────────
export default function Home() {
  const [pandaOpen, setPandaOpen] = useState(false);

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <main style={{background:'#0c0b09'}}>
        <SeasonSlider />
        <Footer />
      </main>

      {/* レッサーパンダ ボタン（左下固定） */}
      <button
        onClick={() => setPandaOpen(true)}
        aria-label="レッサーパンダへの笹プロジェクト"
        style={{
          position:'fixed', bottom:28, left:28, zIndex:50,
          width:72, height:72,
          borderRadius:'50%',
          background:'rgba(20,16,12,0.75)',
          backdropFilter:'blur(12px)',
          border:'1.5px solid rgba(255,255,255,0.12)',
          boxShadow:'0 8px 32px rgba(0,0,0,0.55), 0 0 0 0 rgba(210,130,40,0)',
          cursor:'pointer',
          padding:0,
          overflow:'hidden',
          transition:'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.12)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(210,130,40,0.35)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.55)';
        }}
      >
        <img src="/red-panda.png" alt="レッサーパンダ"
          style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
      </button>

      {/* モーダル オーバーレイ */}
      <div
        onClick={() => setPandaOpen(false)}
        style={{
          position:'fixed', inset:0, zIndex:60,
          background:'rgba(6,5,4,0.72)',
          backdropFilter:'blur(4px)',
          opacity: pandaOpen ? 1 : 0,
          pointerEvents: pandaOpen ? 'auto' : 'none',
          transition:'opacity 0.4s ease',
        }}
      />

      {/* モーダル パネル（下からスライドイン） */}
      <div
        style={{
          position:'fixed', inset:0, zIndex:61,
          display:'flex', alignItems:'flex-end', justifyContent:'center',
          pointerEvents: pandaOpen ? 'auto' : 'none',
        }}
      >
        <div
          style={{
            width:'100%', maxWidth:580,
            background:'linear-gradient(160deg,#1a140e 0%,#14100c 60%,#100e0a 100%)',
            borderRadius:'28px 28px 0 0',
            border:'1px solid rgba(255,255,255,0.09)',
            borderBottom:'none',
            boxShadow:'0 -24px 80px rgba(0,0,0,0.7)',
            padding:'0 0 48px',
            transform: pandaOpen ? 'translateY(0)' : 'translateY(100%)',
            transition:'transform 0.5s cubic-bezier(0.22,1,0.36,1)',
            maxHeight:'92vh',
            overflowY:'auto',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ドラッグハンドル */}
          <div style={{display:'flex',justifyContent:'center',padding:'14px 0 0'}}>
            <div style={{width:40,height:4,borderRadius:2,background:'rgba(255,255,255,0.12)'}}/>
          </div>

          {/* 閉じるボタン */}
          <div style={{display:'flex',justifyContent:'flex-end',padding:'8px 20px 0'}}>
            <button
              onClick={() => setPandaOpen(false)}
              style={{
                width:36,height:36,borderRadius:'50%',
                background:'rgba(255,255,255,0.06)',
                border:'1px solid rgba(255,255,255,0.10)',
                color:'rgba(240,230,210,0.5)',
                fontSize:16,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',
                transition:'all 0.2s ease',
              }}
            >✕</button>
          </div>

          {/* コンテンツ */}
          <div style={{padding:'12px 32px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:24}}>
            {/* イラスト */}
            <img src="/red-panda.png" alt="レッサーパンダ"
              style={{width:140,height:140,objectFit:'contain',borderRadius:'50%',
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.08)',
                padding:8,
              }}/>

            {/* タイトル */}
            <div style={{textAlign:'center'}}>
              <p style={{fontSize:10,letterSpacing:'0.18em',color:'rgba(210,165,90,0.6)',fontWeight:700,marginBottom:8}}>
                OKIGASA × ZOO
              </p>
              <h2 style={{fontSize:22,fontWeight:900,color:'rgba(240,230,210,0.92)',lineHeight:1.3,letterSpacing:'0.04em'}}>
                レッサーパンダへの笹
              </h2>
            </div>

            {/* 本文 */}
            <div style={{
              width:'100%',
              background:'rgba(255,255,255,0.04)',
              borderRadius:16,
              border:'1px solid rgba(255,255,255,0.07)',
              padding:'20px 22px',
              display:'flex',flexDirection:'column',gap:16,
            }}>
              <p style={{fontSize:13.5,lineHeight:1.8,color:'rgba(240,230,210,0.72)',margin:0}}>
                okigasaは月に一回、放任竹林を整備すると共に、その際に出る笹の葉を
                <span style={{color:'rgba(210,165,90,0.9)',fontWeight:700}}>日本平動物園</span>
                のレッサーパンダの餌として活用しています。その活動記録をここでは更新していきます。
              </p>
              <div style={{height:1,background:'rgba(255,255,255,0.06)'}}/>
              <p style={{fontSize:13,lineHeight:1.8,color:'rgba(240,230,210,0.48)',margin:0}}>
                手入れされなくなった竹林は、年々拡大し里山の生態系を圧迫します。
                竹を使い切る循環をつくることが、森と動物、どちらの未来にも繋がると信じています。
              </p>
            </div>

            {/* タグ */}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
              {['竹林再生','動物園連携','月次活動'].map(tag => (
                <span key={tag} style={{
                  fontSize:10,fontWeight:700,letterSpacing:'0.1em',
                  padding:'5px 12px',borderRadius:999,
                  background:'rgba(210,165,90,0.10)',
                  border:'1px solid rgba(210,165,90,0.22)',
                  color:'rgba(210,165,90,0.7)',
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
