'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

// ── 実測データ ────────────────────────────────────────────────────
const REAL_INV = {
  '01':4079697,'02':369732, '03':687502, '04':220025, '05':432699,
  '06':484571, '07':636009, '08':77677,  '09':193415, '10':248851,
  '11':59918,  '12':98889,  '13':44012,  '14':58027,  '15':693959,
  '16':229830, '17':183942, '18':187412, '19':195241, '20':624024,
  '21':477557, '22':218046, '23':77614,  '24':142249, '25':118802,
  '26':210832, '27':28708,  '28':320787, '29':111707, '30':142895,
  '31':119013, '32':318709, '33':291747, '34':410083, '35':249422,
  '36':124373, '37':64499,  '38':156626, '39':207247, '40':86231,
  '41':37094,  '42':193200, '43':422313, '44':431188, '45':355810,
  '46':496098, '47':157389,
};

const NAT_TS = [
  [1915,70000],[1927,80000],[1936,90000],[1968,100000],[1977,110000],
  [1990,140000],[1995,152000],[2002,161000],[2007,164000],
  [2012,165000],[2017,166725],[2022,175000],
];

const BAMBOO_2022 = {
  '01':450,  '02':1100, '03':900,  '04':2200, '05':700,
  '06':1100, '07':1800, '08':2500, '09':1900, '10':1600,
  '11':800,  '12':2800, '13':400,  '14':600,  '15':1800,
  '16':900,  '17':1200, '18':1400, '19':900,  '20':1800,
  '21':2800, '22':6100, '23':2800, '24':3100, '25':1800,
  '26':8100, '27':1200, '28':7200, '29':3200, '30':3800,
  '31':2100, '32':3500, '33':5900, '34':5500, '35':7400,
  '36':3400, '37':1600, '38':4500, '39':6800, '40':13800,
  '41':4800, '42':9500, '43':10200,'44':14300,'45':8500,
  '46':18200,'47':1200,
};

const MOSO_RATIO = {
  '01':0.05,'02':0.10,'03':0.15,'04':0.20,'05':0.10,
  '06':0.15,'07':0.25,'08':0.35,'09':0.30,'10':0.30,
  '11':0.40,'12':0.45,'13':0.45,'14':0.45,'15':0.20,
  '16':0.25,'17':0.35,'18':0.45,'19':0.40,'20':0.30,
  '21':0.50,'22':0.65,'23':0.60,'24':0.70,'25':0.65,
  '26':0.75,'27':0.70,'28':0.70,'29':0.75,'30':0.80,
  '31':0.70,'32':0.72,'33':0.78,'34':0.80,'35':0.82,
  '36':0.82,'37':0.78,'38':0.82,'39':0.85,'40':0.78,
  '41':0.80,'42':0.82,'43':0.82,'44':0.80,'45':0.82,
  '46':0.85,'47':0.70,
};

const CLIMATE_F = (() => {
  const f = {
    '01':0.25,'02':0.50,'03':0.60,'04':0.70,'05':0.60,
    '06':0.70,'07':0.75,'08':0.85,'09':0.85,'10':0.85,
    '11':0.90,'12':0.90,'13':0.90,'14':0.90,'15':0.75,
    '16':0.80,'17':0.85,'18':0.90,'19':0.85,'20':0.85,
    '21':0.95,'47':0.80,
  };
  for (let i = 22; i <= 46; i++) f[String(i).padStart(2, '0')] = 1.0;
  return f;
})();

const PREF_NAMES = {
  '01':'北海道','02':'青森県','03':'岩手県','04':'宮城県','05':'秋田県',
  '06':'山形県','07':'福島県','08':'茨城県','09':'栃木県','10':'群馬県',
  '11':'埼玉県','12':'千葉県','13':'東京都','14':'神奈川県','15':'新潟県',
  '16':'富山県','17':'石川県','18':'福井県','19':'山梨県','20':'長野県',
  '21':'岐阜県','22':'静岡県','23':'愛知県','24':'三重県','25':'滋賀県',
  '26':'京都府','27':'大阪府','28':'兵庫県','29':'奈良県','30':'和歌山県',
  '31':'鳥取県','32':'島根県','33':'岡山県','34':'広島県','35':'山口県',
  '36':'徳島県','37':'香川県','38':'愛媛県','39':'高知県','40':'福岡県',
  '41':'佐賀県','42':'長崎県','43':'熊本県','44':'大分県','45':'宮崎県',
  '46':'鹿児島県','47':'沖縄県',
};

const PREFS = Object.keys(PREF_NAMES);
const NAT_YEARS = NAT_TS.map(d => d[0]);

// ── 計算関数（仕様の順番通り） ────────────────────────────────────

function getNatHa(y) {
  if (y <= NAT_TS[0][0]) return NAT_TS[0][1];
  const last = NAT_TS[NAT_TS.length - 1];
  if (y >= last[0]) return last[1] + (y - last[0]) * 1650;
  for (let i = 0; i < NAT_TS.length - 1; i++) {
    const [y1, v1] = NAT_TS[i], [y2, v2] = NAT_TS[i + 1];
    if (y >= y1 && y <= y2) return v1 + (v2 - v1) * (y - y1) / (y2 - y1);
  }
  return last[1];
}

function getBambooHa(p, y) {
  return (BAMBOO_2022[p] ?? 0) * getNatHa(y) / 175000;
}

function getMosoHa(p, y) {
  return getBambooHa(p, y) * (MOSO_RATIO[p] ?? 0) * (CLIMATE_F[p] ?? 1.0);
}

function getSpeed(p, y) {
  const curr = getMosoHa(p, y);
  const prev = getMosoHa(p, y - 5);
  const denom = (REAL_INV[p] ?? 1) - prev;
  if (denom <= 0) return 0;
  return (curr - prev) / 5 / denom * 100;
}

function getRemaining(p, y) {
  const inv = REAL_INV[p] ?? 1;
  return Math.max(0, (inv - getMosoHa(p, y)) / inv * 100);
}

function getAccel(p, y) {
  return getSpeed(p, y) - getSpeed(p, y - 5);
}

function getMetric(p, y, mode) {
  if (mode === 'moso_ha')   return getMosoHa(p, y);
  if (mode === 'speed')     return getSpeed(p, y);
  if (mode === 'remaining') return getRemaining(p, y);
  if (mode === 'accel')     return getAccel(p, y);
  return 0;
}

// ── 固定スケール参照値（2050年最大値） ───────────────────────────
const MAX_MOSO  = Math.max(...PREFS.map(p => getMosoHa(p, 2050)));
const MAX_SPEED = Math.max(...PREFS.map(p => getSpeed(p, 2050)), 0.0001);
const MAX_ACCEL = Math.max(...PREFS.map(p => Math.abs(getAccel(p, 2050))), 0.0001);

// norm: 0=安全, 1=危険（全モード統一）
function normMetric(p, y, mode) {
  if (mode === 'moso_ha')   return Math.min(1, getMosoHa(p, y) / MAX_MOSO);
  if (mode === 'speed')     return Math.min(1, Math.max(0, getSpeed(p, y) / MAX_SPEED));
  if (mode === 'remaining') return Math.min(1, Math.max(0, 1 - getRemaining(p, y) / 100));
  if (mode === 'accel')     return Math.min(1, Math.max(0, getAccel(p, y) / MAX_ACCEL / 2 + 0.5));
  return 0;
}

// ── カラー ────────────────────────────────────────────────────────
const STOPS_DANGER = [
  [0.00,[10,28,10]],[0.25,[15,85,35]],[0.50,[100,210,40]],
  [0.70,[255,200,0]],[0.85,[255,75,10]],[1.00,[215,0,55]],
];
const STOPS_ACCEL = [
  [0.00,[20,80,220]],[0.35,[40,155,255]],[0.50,[20,20,20]],
  [0.65,[255,155,0]],[1.00,[215,0,55]],
];

function lerpColor(stops, t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0,c0] = stops[i], [t1,c1] = stops[i+1];
    if (t >= t0 && t <= t1) {
      const u = (t-t0)/(t1-t0);
      return `rgb(${Math.round(c0[0]+u*(c1[0]-c0[0]))},${Math.round(c0[1]+u*(c1[1]-c0[1]))},${Math.round(c0[2]+u*(c1[2]-c0[2]))})`;
    }
  }
  const c = stops[stops.length-1][1];
  return `rgb(${c.join(',')})`;
}

function getFillColor(p, y, mode) {
  if (!PREF_NAMES[p]) return '#0a160a';
  const n = normMetric(p, y, mode);
  return lerpColor(mode === 'accel' ? STOPS_ACCEL : STOPS_DANGER, n);
}

function legendGradient(mode) {
  const stops = mode === 'accel' ? STOPS_ACCEL : STOPS_DANGER;
  return `linear-gradient(90deg, ${stops.map(([t,[r,g,b]])=>`rgb(${r},${g},${b}) ${t*100}%`).join(', ')})`;
}

// ── 竹種説明（キャラクタ吹き出し） ──────────────────────────────
const BAMBOO_MSGS = [
  {
    name:'孟宗竹', color:'#a3e635',
    size:'高さ最大22m · 直径20cm超',
    text:'このマップで追跡されているのがぼく。地下茎が毎年50〜100cm伸びて、気づいたら隣の畑まで侵食してる。建材・竹炭・タケノコと活用の幅は広いけど、放置すると手がつけられなくなる。',
    tag:'このマップの対象',
    invasiveness:5,
    stalkH:54, stalkW:10, segs:4,
  },
  {
    name:'真竹', color:'#4ade80',
    size:'高さ最大20m · 直径10cm程度',
    text:'竹林といえば私。京都の竹林もほとんど私。竹細工や楽器の材料として古くから使われ、日本の風景に溶け込んでいる竹の代表格。侵食性は孟宗竹より穏やか。',
    tag:'竹林の代表格',
    invasiveness:3,
    stalkH:48, stalkW:7, segs:3,
  },
  {
    name:'破竹', color:'#86efac',
    size:'高さ最大15m · 直径5cm程度',
    text:'「破竹の勢い」という言葉はぼくから。タケノコの旬は5月ごろで、アク抜き不要で食べられる。孟宗竹より成長は控えめで、食用として人気が高い。',
    tag:'食用タケノコで有名',
    invasiveness:2,
    stalkH:36, stalkW:5, segs:3,
  },
];

// ── リアルな竹アイコン ────────────────────────────────────────────
function BambooIcon({ size = 20 }) {
  return (
    <svg width={Math.round(size*0.65)} height={size} viewBox="0 0 13 24" fill="none" style={{display:'inline-block',verticalAlign:'middle',flexShrink:0}}>
      <rect x="4" y="0"   width="5" height="7.8" rx="2.5" fill="#4d7c0f"/>
      <rect x="4" y="8.2" width="5" height="7.6" rx="2.5" fill="#3f6212"/>
      <rect x="4" y="16.2" width="5" height="7.8" rx="2.5" fill="#365314"/>
      <rect x="2.5" y="7.2"  width="8" height="1.8" rx="0.9" fill="#a3e635"/>
      <rect x="2.5" y="15.2" width="8" height="1.8" rx="0.9" fill="#84cc16"/>
      <rect x="5.5" y="1"   width="1.5" height="5.5" rx="0.75" fill="#a3e635" opacity="0.35"/>
      <rect x="5.5" y="9.2" width="1.5" height="5.5" rx="0.75" fill="#a3e635" opacity="0.25"/>
      <ellipse cx="2"   cy="5.8" rx="3" ry="1.1" fill="#86efac" transform="rotate(-38 2 5.8)" opacity="0.9"/>
      <ellipse cx="11"  cy="13.8" rx="3" ry="1.1" fill="#86efac" transform="rotate(38 11 13.8)" opacity="0.9"/>
    </svg>
  );
}

// ── モード設定 ────────────────────────────────────────────────────
const MODE_CONFIG = {
  moso_ha: {label:'孟宗竹面積', unit:'ha',   low:'少', high:'多', color:'#a3e635',
             desc:'推計孟宗竹面積（孟宗竹のみ）= 竹林面積 × 孟宗竹比率 × 気候補正'},
  speed:   {label:'侵食度',    unit:'%/年', low:'低', high:'高', color:'#fb923c',
             desc:'直近5年間の非人工林への孟宗竹侵食の進行度 [%/年]'},
};

// ── TooltipContent ────────────────────────────────────────────────
function TooltipContent({ code, year, mode, rankings }) {
  const name     = PREF_NAMES[code] ?? code;
  const bambooHa = getBambooHa(code, year);
  const mosoHa   = getMosoHa(code, year);
  const speed    = getSpeed(code, year);
  const inv      = REAL_INV[code] ?? 0;
  const rank     = rankings[code] ?? '–';
  const curVal   = getMetric(code, year, mode);
  const fill     = getFillColor(code, year, mode);
  const norm     = normMetric(code, year, mode);
  const mc       = MODE_CONFIG[mode];
  const isPred   = year > 2022;

  const fmtVal = (v, m) => {
    if (m === 'moso_ha') return `${Math.round(v).toLocaleString()} ha`;
    if (m === 'speed')   return `${v.toFixed(4)} %/年`;
    return '–';
  };

  return (
    <>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-black text-base" style={{color:'#a3e635'}}>{name}</p>
          <p className="text-[10px] mt-0.5" style={{color:'rgba(163,230,53,0.4)'}}>
            {year}年 · {isPred ? '予測値' : NAT_YEARS.includes(year) ? '実測値' : '補間値'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          {isPred && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{background:'rgba(251,146,60,0.15)',color:'#fb923c',border:'1px solid rgba(251,146,60,0.3)'}}>予測</span>
          )}
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{background:'rgba(163,230,53,0.1)',color:'#a3e635',border:'1px solid rgba(163,230,53,0.25)'}}>
            {rank}位 / 47
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span style={{color:'rgba(163,230,53,0.5)'}}>{mc.label}</span>
          <span className="font-black" style={{color:fill}}>{fmtVal(curVal, mode)}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.07)'}}>
          <div className="h-full rounded-full transition-all"
            style={{width:`${norm*100}%`, background:fill, boxShadow:`0 0 6px ${fill}`}} />
        </div>
      </div>

      {/* 侵食レベルゲージ */}
      {(() => {
        const invNorm = normMetric(code, year, 'speed');
        const lvl = Math.min(5, Math.max(1, Math.ceil(invNorm * 5)));
        const lvlLabels = ['','軽微','注意','中程度','深刻','危機'];
        const lvlColors = ['','#4ade80','#a3e635','#fbbf24','#fb923c','#ef4444'];
        const lc = lvlColors[lvl];
        return (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs" style={{color:'rgba(163,230,53,0.5)'}}>侵食レベル</span>
              <span className="text-xs font-black" style={{color:lc}}>{lvlLabels[lvl]}</span>
            </div>
            <div style={{display:'flex',gap:3}}>
              {[1,2,3,4,5].map(i=>(
                <div key={i} style={{
                  flex:1, height:7, borderRadius:3,
                  background: i<=lvl ? lc : 'rgba(255,255,255,0.07)',
                  boxShadow: i<=lvl ? `0 0 5px ${lc}70` : 'none',
                }}/>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-2 gap-2 rounded-xl p-2.5 mb-3 text-xs"
        style={{background:'rgba(255,255,255,0.04)'}}>
        {[
          {label:'竹林面積（全種）', val:`${Math.round(bambooHa).toLocaleString()} ha`, c:'#a3e635'},
          {label:'孟宗竹面積のみ',   val:`${Math.round(mosoHa).toLocaleString()} ha`,   c:'#fbbf24'},
          {label:'侵食度',          val:`${speed.toFixed(4)} %/年`,                    c:'#fb923c'},
          {label:'参照面積',         val:`${inv.toLocaleString()} ha`,                  c:'rgba(163,230,53,0.5)'},
        ].map(({label,val,c}) => (
          <div key={label}>
            <p style={{color:'rgba(163,230,53,0.3)'}}>{label}</p>
            <p className="font-bold" style={{color:c}}>{val}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg px-2.5 py-1.5 text-[10px]" style={{background:'rgba(255,255,255,0.03)'}}>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mr-1.5"
          style={{background:'rgba(163,230,53,0.12)',color:'#a3e635',border:'1px solid rgba(163,230,53,0.25)'}}>林野庁実測</span>
        <span style={{color:'rgba(163,230,53,0.45)'}}>竹林面積データは孟宗竹のみを対象に集計</span>
      </div>
    </>
  );
}

// ── メインコンポーネント ──────────────────────────────────────────
export default function ChoroplethMap() {
  const [year,     setYear]    = useState(2022);
  const [mode,     setMode]    = useState('moso_ha');
  const [tooltip,  setTooltip] = useState(null);
  const [topo,     setTopo]    = useState(null);
  const [size,     setSize]    = useState({w:800,h:560});
  const [playing,  setPlaying] = useState(false);
  const [charaMsg, setCharaMsg] = useState(0);
  const containerRef = useRef(null);
  const playRef      = useRef(null);

  // TopoJSON 取得
  useEffect(() => {
    fetch('https://unpkg.com/jpn-atlas@1/japan/japan.json')
      .then(r => r.json())
      .then(setTopo)
      .catch(e => console.error('TopoJSON fetch failed:', e));
  }, []);

  // コンテナリサイズ監視
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 再生アニメーション
  useEffect(() => {
    clearInterval(playRef.current);
    if (!playing) return;
    playRef.current = setInterval(() => {
      setYear(y => {
        if (y >= 2050) { setPlaying(false); return 2050; }
        return y + 1;
      });
    }, 80);
    return () => clearInterval(playRef.current);
  }, [playing]);

  // TopoJSON → features + D3 パスジェネレーター
  const { features, pathFn, codeMap } = useMemo(() => {
    if (!topo || size.w === 0) return { features: [], pathFn: null, codeMap: {} };
    const geo = topojson.feature(topo, topo.objects.prefectures);
    const feats = geo.features;

    const codeMap = {};
    for (const f of feats) {
      const raw = f.id ?? '';
      const code = String(raw).padStart(2, '0');
      if (PREF_NAMES[code]) codeMap[f.id] = code;
    }

    const proj = d3.geoIdentity().fitExtent([[4,4],[size.w-4,size.h-4]], geo);
    return { features: feats, pathFn: d3.geoPath(proj), codeMap };
  }, [topo, size]);

  // 順位（現在の year × mode）
  const rankings = useMemo(() => {
    const vals = PREFS.map(p => [p, getMetric(p, year, mode)]);
    const sorted = [...vals].sort((a,b) => mode === 'remaining' ? a[1]-b[1] : b[1]-a[1]);
    const map = {};
    sorted.forEach(([p], i) => { map[p] = i + 1; });
    return map;
  }, [year, mode]);

  const isPred = year > 2022;
  const natHa  = Math.round(getNatHa(year));
  const totalMoso = Math.round(PREFS.reduce((s,p) => s + getMosoHa(p, year), 0));
  const sliderPct = y => ((y - 1970) / (2050 - 1970)) * 100;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{background:'#060e06',color:'#e8f5e0'}}>

      {/* ── ヘッダー ─────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-2.5 shrink-0 flex-wrap"
        style={{background:'#060e06',borderBottom:'1px solid rgba(120,255,60,0.12)'}}>
        <Link href="/" className="text-lime-400/50 hover:text-lime-300 text-sm font-bold shrink-0">←</Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="text-sm font-black truncate" style={{color:'#a3e635'}}>竹マップ</h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
            style={{background:'rgba(163,230,53,0.1)',color:'rgba(163,230,53,0.6)',border:'1px solid rgba(163,230,53,0.2)'}}>
            1970–2050
          </span>
        </div>
        <div className="flex gap-1 shrink-0 flex-wrap">
          {Object.entries(MODE_CONFIG).map(([k,v]) => (
            <button key={k} onClick={() => setMode(k)}
              className="text-xs px-3 py-1 rounded-full font-black transition-all"
              style={mode === k
                ? {background:v.color, color:'#060e06'}
                : {color:v.color+'80', border:`1px solid ${v.color}30`}}>
              {v.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── メインエリア ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{minHeight:0}}>

        {/* 左パネル */}
        <div className="w-52 shrink-0 flex flex-col"
          style={{background:'rgba(6,14,6,0.97)',borderRight:'1px solid rgba(163,230,53,0.12)'}}>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            <p className="text-[10px] font-bold mb-2" style={{color:'rgba(163,230,53,0.4)'}}>表示指標</p>
            {Object.entries(MODE_CONFIG).map(([k,v]) => (
              <button key={k} onClick={() => setMode(k)} className="w-full text-left rounded-xl p-2.5 transition-all"
                style={mode === k
                  ? {background:`${v.color}18`, border:`1px solid ${v.color}50`}
                  : {background:'transparent', border:'1px solid rgba(255,255,255,0.04)'}}>
                <p className="text-xs font-black" style={{color: mode===k ? v.color : 'rgba(200,230,150,0.4)'}}>{v.label}</p>
                <p className="text-[10px] mt-0.5 leading-snug" style={{color:'rgba(163,230,53,0.28)'}}>{v.desc}</p>
              </button>
            ))}
          </div>

          {/* 全国統計 */}
          <div className="p-3 space-y-1.5" style={{borderTop:'1px solid rgba(163,230,53,0.1)'}}>
            <p className="text-[10px] font-bold" style={{color:'rgba(163,230,53,0.4)'}}>全国 {year}年</p>
            <div className="rounded-lg p-2" style={{background:'rgba(163,230,53,0.06)'}}>
              <p className="text-[10px]" style={{color:'rgba(163,230,53,0.4)'}}>全国竹林面積</p>
              <p className="text-sm font-black" style={{color:'#a3e635'}}>{natHa.toLocaleString()} ha</p>
            </div>
            <div className="rounded-lg p-2" style={{background:'rgba(251,191,36,0.07)'}}>
              <p className="text-[10px]" style={{color:'rgba(251,191,36,0.5)'}}>推計孟宗竹面積</p>
              <p className="text-sm font-black" style={{color:'#fbbf24'}}>{totalMoso.toLocaleString()} ha</p>
              <p className="text-[9px] mt-0.5" style={{color:'rgba(251,191,36,0.35)'}}>※ 孟宗竹のみ対象</p>
            </div>
          </div>
        </div>

        {/* マップ */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden">

          {!topo ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-bounce"><BambooIcon size={40}/></div>
                <div className="w-7 h-7 border-2 rounded-full animate-spin"
                  style={{borderColor:'rgba(163,230,53,0.3)',borderTopColor:'#a3e635'}} />
                <p className="text-xs font-bold" style={{color:'rgba(163,230,53,0.6)'}}>地図を読み込み中…</p>
              </div>
            </div>
          ) : (
            <svg width={size.w} height={size.h} style={{display:'block'}}>
              {features.map(feat => {
                const code = codeMap[feat.id];
                if (!code || !PREF_NAMES[code]) return null;
                const d = pathFn ? pathFn(feat) : '';
                if (!d) return null;
                return (
                  <path key={feat.id} d={d}
                    fill={getFillColor(code, year, mode)}
                    stroke="rgba(163,230,53,0.2)" strokeWidth={0.7}
                    style={{cursor:'pointer',transition:'fill 0.25s'}}
                    onMouseEnter={e => setTooltip({x:e.clientX, y:e.clientY, code})}
                    onMouseMove={e  => setTooltip(t => t ? {...t, x:e.clientX, y:e.clientY} : null)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </svg>
          )}

          {/* 凡例（左下） */}
          <div className="absolute bottom-3 left-3 rounded-xl p-3"
            style={{background:'rgba(6,14,6,0.90)',border:'1px solid rgba(163,230,53,0.18)',backdropFilter:'blur(10px)'}}>
            <p className="text-[10px] font-black mb-1.5" style={{color:'#a3e635'}}>
              {MODE_CONFIG[mode].label}
              <span className="ml-1 font-normal opacity-50">（{MODE_CONFIG[mode].unit}）</span>
            </p>
            <div className="h-2.5 w-32 rounded-full overflow-hidden mb-1"
              style={{background: legendGradient(mode)}} />
            <div className="flex justify-between text-[10px] w-32" style={{color:'rgba(163,230,53,0.4)'}}>
              <span>{MODE_CONFIG[mode].low}</span>
              <span>{MODE_CONFIG[mode].high}</span>
            </div>
          </div>

          {/* キャラクター＋竹種ガイド */}
          <div className="absolute" style={{top:8,left:8,zIndex:10,display:'flex',alignItems:'flex-start',gap:8,maxWidth:'62%'}}>
            {/* キャラ */}
            <img src="/chara.webp" alt="" width={76} height={76}
              style={{filter:'drop-shadow(0 4px 14px rgba(0,0,0,0.75))',display:'block',flexShrink:0,marginTop:2}}/>

            {/* ガイドカード */}
            <div style={{
              background:'rgba(3,9,3,0.97)',backdropFilter:'blur(18px)',
              border:'1px solid rgba(163,230,53,0.15)',borderRadius:14,
              boxShadow:'0 10px 40px rgba(0,0,0,0.75)',overflow:'hidden',minWidth:0,
            }}>
              {/* 竹高さ比較セレクター */}
              <div style={{
                display:'flex',borderBottom:'1px solid rgba(163,230,53,0.1)',
                padding:'10px 14px 0',gap:6,background:'rgba(255,255,255,0.015)',
              }}>
                {BAMBOO_MSGS.map((bm,i)=>{
                  const active = i===charaMsg;
                  const {stalkH,stalkW,segs} = bm;
                  return (
                    <div key={i} onClick={()=>setCharaMsg(i)} style={{
                      flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                      gap:5,cursor:'pointer',paddingBottom:8,
                      opacity:active?1:0.38,transition:'opacity 0.2s ease',
                    }}>
                      {/* 竹幹SVG */}
                      <svg width={stalkW+12} height={stalkH} viewBox={`0 0 ${stalkW+12} ${stalkH}`} style={{overflow:'visible'}}>
                        {Array.from({length:segs}).map((_,si)=>{
                          const sh=Math.floor(stalkH/segs);
                          const y=si*sh;
                          return (
                            <g key={si}>
                              <rect x={6} y={y} width={stalkW} height={sh-2} rx={stalkW/2}
                                fill={active?bm.color:'#2d4a20'} opacity={1-si*0.08}/>
                              {si>0&&<rect x={4.5} y={y-1.5} width={stalkW+3} height={3} rx={1.5}
                                fill={active?bm.color:'#3a5a28'}/>}
                              <rect x={7.5} y={y+2} width={2} height={sh-6} rx={1}
                                fill="white" opacity={active?0.22:0.06}/>
                            </g>
                          );
                        })}
                        {/* 左葉 */}
                        <ellipse cx={3} cy={Math.floor(stalkH*0.38)} rx={5.5} ry={1.8}
                          fill={active?bm.color:'#3a5a28'} opacity={0.85}
                          transform={`rotate(-42 3 ${Math.floor(stalkH*0.38)})`}/>
                        {/* 右葉 */}
                        <ellipse cx={stalkW+9} cy={Math.floor(stalkH*0.7)} rx={5.5} ry={1.8}
                          fill={active?bm.color:'#3a5a28'} opacity={0.85}
                          transform={`rotate(42 ${stalkW+9} ${Math.floor(stalkH*0.7)})`}/>
                      </svg>
                      {/* 種名 */}
                      <span style={{
                        fontSize:10,fontWeight:active?900:600,letterSpacing:'0.04em',
                        color:active?bm.color:'rgba(163,230,53,0.4)',whiteSpace:'nowrap',
                      }}>{bm.name}</span>
                      {/* 星（小さく） */}
                      <div style={{display:'flex',gap:1,marginTop:-1}}>
                        {[1,2,3,4,5].map(i=>(
                          <span key={i} style={{
                            fontSize:6,lineHeight:1,
                            color: i<=bm.invasiveness ? (active?bm.color:'rgba(163,230,53,0.35)') : 'rgba(255,255,255,0.08)',
                          }}>★</span>
                        ))}
                      </div>
                      {/* アクティブライン */}
                      <div style={{
                        height:2,borderRadius:1,width:active?'70%':'0%',
                        background:bm.color,transition:'width 0.3s cubic-bezier(0.4,0,0.2,1)',
                        marginTop:-3,
                      }}/>
                    </div>
                  );
                })}
              </div>

              {/* コンテンツ */}
              {(()=>{
                const m=BAMBOO_MSGS[charaMsg];
                return (
                  <div style={{padding:'11px 14px 14px'}}>
                    {/* 上段：タグ＋サイズ＋星 */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:9,gap:8}}>
                      <div>
                        <span style={{
                          display:'inline-block',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:5,
                          background:`${m.color}18`,color:m.color,border:`1px solid ${m.color}30`,
                          whiteSpace:'nowrap',letterSpacing:'0.02em',marginBottom:5,
                        }}>{m.tag}</span>
                        <p style={{fontSize:10,color:'rgba(163,230,53,0.38)',margin:0,lineHeight:1.4}}>{m.size}</p>
                      </div>
                      {/* 侵食力 星レーティング */}
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <p style={{fontSize:8,color:'rgba(163,230,53,0.38)',margin:'0 0 3px',letterSpacing:'0.05em'}}>侵食力</p>
                        <div style={{display:'flex',gap:1.5,justifyContent:'flex-end'}}>
                          {[1,2,3,4,5].map(i=>(
                            <span key={i} style={{
                              fontSize:13,lineHeight:1,
                              color: i<=m.invasiveness ? m.color : 'rgba(255,255,255,0.1)',
                              filter: i<=m.invasiveness ? `drop-shadow(0 0 4px ${m.color}90)` : 'none',
                              transition:'color 0.2s',
                            }}>★</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* 区切り線 */}
                    <div style={{height:1,background:`linear-gradient(90deg,${m.color}30,transparent)`,marginBottom:9}}/>
                    {/* 説明文 */}
                    <p style={{fontSize:12,lineHeight:1.75,color:'rgba(228,242,218,0.82)',margin:0}}>
                      {m.text}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 予測バッジ */}
          {isPred && (
            <div className="absolute top-3 right-3 flex items-center gap-2 rounded-xl px-3 py-1.5"
              style={{background:'rgba(251,146,60,0.15)',border:'1px solid rgba(251,146,60,0.3)'}}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#fb923c'}} />
              <span className="text-xs font-bold" style={{color:'#fb923c'}}>予測値</span>
            </div>
          )}
        </div>
      </div>

      {/* ── ツールチップ ─────────────────────────────────────── */}
      {tooltip && (
        <div className="fixed z-50 pointer-events-none rounded-2xl p-4 w-64 text-sm shadow-2xl"
          style={{
            left: tooltip.x + 14,
            top:  tooltip.y - 10,
            background:'rgba(8,16,8,0.97)',
            border:'1px solid rgba(163,230,53,0.2)',
            backdropFilter:'blur(16px)',
          }}>
          <TooltipContent code={tooltip.code} year={year} mode={mode} rankings={rankings} />
        </div>
      )}

      {/* ── タイムスライダー ──────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 select-none"
        style={{background:'#060e06',borderTop:'1px solid rgba(163,230,53,0.12)'}}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tabular-nums leading-none"
                style={{color: isPred ? '#fb923c' : NAT_YEARS.includes(year) ? '#a3e635' : '#67e8f9'}}>
                {year}
              </span>
              <span className="text-xs font-bold" style={{color:'rgba(163,230,53,0.35)'}}>
                年 · {isPred ? '予測値' : NAT_YEARS.includes(year) ? '実測値' : '補間値'}
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {[1970, 1990, 2010, 2022].map(y => (
                <button key={y} onClick={() => { setYear(y); setPlaying(false); }}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all hover:scale-105"
                  style={year === y
                    ? {background:'rgba(163,230,53,0.2)',color:'#a3e635',border:'1px solid rgba(163,230,53,0.4)'}
                    : {background:'rgba(255,255,255,0.04)',color:'rgba(163,230,53,0.45)',border:'1px solid rgba(163,230,53,0.1)'}}>
                  {y}
                </button>
              ))}
              <button onClick={() => { setYear(2050); setPlaying(false); }}
                className="text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all hover:scale-105"
                style={year === 2050
                  ? {background:'rgba(251,146,60,0.2)',color:'#fb923c',border:'1px solid rgba(251,146,60,0.4)'}
                  : {background:'rgba(251,146,60,0.06)',color:'rgba(251,146,60,0.4)',border:'1px solid rgba(251,146,60,0.12)'}}>
                2050予測
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setPlaying(p => !p)}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-base transition-all hover:scale-110"
              style={{
                background: playing ? 'rgba(163,230,53,0.15)' : '#a3e635',
                color: playing ? '#a3e635' : '#060e06',
                border: '1px solid rgba(163,230,53,0.4)',
                boxShadow: playing ? 'none' : '0 0 16px rgba(163,230,53,0.25)',
              }}>
              {playing ? '⏸' : '▶'}
            </button>

            <div className="flex-1 relative">
              {/* 実測点マーカー */}
              <div className="absolute inset-x-0 top-0 h-4 pointer-events-none" style={{zIndex:1}}>
                {NAT_YEARS.filter(y => y >= 1970).map(y => (
                  <div key={y} className="absolute top-0 bottom-0 w-px"
                    style={{left:`${sliderPct(y)}%`, background:'rgba(163,230,53,0.5)'}} />
                ))}
              </div>
              <input type="range" min={1970} max={2050} value={year}
                onChange={e => { setYear(Number(e.target.value)); setPlaying(false); }}
                className="w-full relative" style={{accentColor:'#a3e635',zIndex:2}} />
              <div className="flex justify-between text-[10px] mt-0.5" style={{color:'rgba(163,230,53,0.22)'}}>
                <span>1970</span>
                <span>← 実測値 ｜ 補間値 ｜ 予測値 →</span>
                <span>2050</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── フッター（出典） ──────────────────────────────────── */}
      <div className="shrink-0 px-4 py-2 text-[10px] leading-relaxed"
        style={{background:'#060e06',borderTop:'1px solid rgba(163,230,53,0.07)',color:'rgba(163,230,53,0.28)'}}>
        分母：林野庁 森林資源現況調査 令和4年（実測）　／
        竹林面積：林野庁確報 1915〜2022年（実測）　／
        孟宗竹比率：研究論文ベース推計　／
        2023年以降：独自推計 ※林野庁公式予測ではありません
      </div>

    </div>
  );
}
