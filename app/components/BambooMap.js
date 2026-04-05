"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import * as d3 from "d3";
import * as topojson from "topojson-client";

// ── WGS84 重心（IDW投影用） ────────────────────────────────────
const WGS84_CEN = {
  '01':[141.35,43.46],'02':[140.74,40.82],'03':[141.15,39.70],'04':[140.87,38.27],
  '05':[140.10,39.72],'06':[140.36,38.24],'07':[140.47,37.44],'08':[140.34,36.34],
  '09':[139.88,36.57],'10':[139.06,36.39],'11':[139.65,35.86],'12':[140.11,35.60],
  '13':[139.69,35.69],'14':[139.64,35.45],'15':[138.95,37.46],'16':[137.22,36.70],
  '17':[136.63,36.59],'18':[136.22,35.85],'19':[138.57,35.67],'20':[138.18,36.15],
  '21':[136.72,35.39],'22':[138.38,35.10],'23':[137.01,35.18],'24':[136.51,34.73],
  '25':[136.22,35.00],'26':[135.77,35.02],'27':[135.50,34.69],'28':[134.90,34.69],
  '29':[135.83,34.37],'30':[135.77,33.94],'31':[133.63,35.47],'32':[132.90,35.13],
  '33':[133.93,34.66],'34':[132.46,34.40],'35':[131.47,34.19],'36':[134.07,33.93],
  '37':[133.98,34.34],'38':[132.55,33.84],'39':[133.53,33.56],'40':[130.42,33.61],
  '41':[130.24,33.25],'42':[129.87,32.74],'43':[130.74,32.79],'44':[131.61,33.16],
  '45':[131.42,32.65],'46':[130.56,31.56],'47':[127.68,26.21],
};

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

const SP_NAMES = ["孟宗竹", "真竹", "淡竹"];
// 既知データ年度（林野庁実測）
const DATA_YEARS = [1966, 1976, 1986, 1995, 2002, 2007, 2012, 2017, 2022];

// ── 全国竹林面積推計（JAXA年度スケール用） ─────────────────────
const NAT_HA_SERIES = {1966:100000,1976:110000,1986:130000,1995:152000,2002:161000,2007:164000,2012:165000,2017:167000,2022:175000};
const NAT_HA_KEYS = Object.keys(NAT_HA_SERIES).map(Number).sort((a,b)=>a-b);
function interpNatHA(year) {
  if (year <= NAT_HA_KEYS[0]) return NAT_HA_SERIES[NAT_HA_KEYS[0]];
  const last = NAT_HA_KEYS[NAT_HA_KEYS.length-1];
  if (year >= last) {
    const prev = NAT_HA_KEYS[NAT_HA_KEYS.length-2];
    const slope = (NAT_HA_SERIES[last]-NAT_HA_SERIES[prev])/(last-prev);
    return Math.max(0, NAT_HA_SERIES[last]+slope*(year-last));
  }
  for (let i=0;i<NAT_HA_KEYS.length-1;i++) {
    const y1=NAT_HA_KEYS[i],y2=NAT_HA_KEYS[i+1];
    if (year>=y1&&year<=y2) return NAT_HA_SERIES[y1]+(NAT_HA_SERIES[y2]-NAT_HA_SERIES[y1])*(year-y1)/(y2-y1);
  }
  return NAT_HA_SERIES[last];
}
// JAXA 2024年時点の全国推計（2017-2022トレンドから外挿: +1600/年）
const JAXA_2024_NAT_HA = interpNatHA(2024); // ≈ 178200 ha

// ── 年度補間ヘルパー ───────────────────────────────────────────
function interpMetric(metrics, code, year, field) {
  const m = metrics?.[code];
  if (!m?.by_year) return 0;
  const ys = DATA_YEARS;
  if (year <= ys[0]) return m.by_year[ys[0]]?.[field] ?? 0;
  if (year >= ys[ys.length - 1]) {
    // 最後2点から外挿
    const y1 = ys[ys.length - 2], y2 = ys[ys.length - 1];
    const v1 = m.by_year[y1]?.[field] ?? 0, v2 = m.by_year[y2]?.[field] ?? 0;
    const slope = (v2 - v1) / (y2 - y1);
    return Math.max(0, v2 + slope * (year - y2));
  }
  for (let i = 0; i < ys.length - 1; i++) {
    if (year >= ys[i] && year <= ys[i + 1]) {
      const t  = (year - ys[i]) / (ys[i + 1] - ys[i]);
      const v1 = m.by_year[ys[i]]?.[field] ?? 0;
      const v2 = m.by_year[ys[i + 1]]?.[field] ?? 0;
      return v1 + t * (v2 - v1);
    }
  }
  return 0;
}

// ── 4指標カラースケール ───────────────────────────────────────
function gradientColor(t, stops) {
  const t2 = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
    if (t2 <= t1) {
      const u = (t2 - t0) / (t1 - t0);
      return `rgb(${Math.round(c0[0]+u*(c1[0]-c0[0]))},${Math.round(c0[1]+u*(c1[1]-c0[1]))},${Math.round(c0[2]+u*(c1[2]-c0[2]))})`;
    }
  }
  return `rgb(${stops[stops.length-1][1].join(',')})`;
}

// ダーク背景映えビビッドカラースケール
const STOPS_MOSO = [
  [0.00,[12,22,12]],   // 漆黒 = ゼロ
  [0.18,[15,70,30]],   // 暗緑 = わずか
  [0.42,[100,210,40]], // ライム = 注意
  [0.68,[255,190,0]],  // 黄金 = 警戒
  [0.85,[255,70,10]],  // 橙炎 = 深刻
  [1.00,[220,0,70]],   // 紅 = 危機
];
const STOPS_ACCEL = [
  [0.00,[20,80,200]],  // 青 = 鈍化(良い)
  [0.40,[40,160,255]], // 明青
  [0.50,[20,20,20]],   // 中立ダーク
  [0.62,[255,160,0]],  // アンバー = 加速
  [1.00,[220,0,80]],   // 紅 = 急加速
];

function metricToFill(norm, mode) {
  // remaining mode は廃止
  if (mode === 'accel')     return gradientColor(norm, STOPS_ACCEL);
  return gradientColor(norm, STOPS_MOSO);
}

function obsDotColor(sp) {
  if (sp === 0) return "rgba(225,29,72,1)";
  if (sp === 1) return "rgba(37,99,235,1)";
  return "rgba(124,58,237,1)";
}

function satDotColor(sp, density = 0.8) {
  const a = 0.5 + density * 0.5;
  if (sp === 0) return `rgba(180,70,0,${a})`;
  if (sp === 1) return `rgba(3,105,161,${a})`;
  if (sp === 2) return `rgba(109,40,217,${a})`;
  const t = Math.max(0, Math.min(1, density));
  if (t < 0.5) return `rgba(${Math.round(234+t*30)},${Math.round(179-t*128)},8,0.85)`;
  return `rgba(${Math.round(249-(t-0.5)*58)},${Math.round(51-(t-0.5)*26)},8,0.85)`;
}

// ── BambooMap コンポーネント ──────────────────────────────────
export default function BambooMap() {
  const canvasRef    = useRef(null);
  const lookupRef    = useRef(null);
  const containerRef = useRef(null);
  const topoRef      = useRef(null);
  const masterRef    = useRef(null);  // bamboo_master.json
  const projRef      = useRef(null);
  const baseRef      = useRef({tx:0,ty:0}); // size変化時に更新されるbase translation
  const panRef       = useRef({x:0,y:0});
  const zoomRef      = useRef(1.1); // zoom の最新値をref経由で同期読み取り
  const dragRef      = useRef(null);
  const hsposRef     = useRef([]);
  const touchRef     = useRef(null);

  const [year,       setYear]       = useState(2022);
  const [playing,    setPlaying]    = useState(false);
  const [zoom,       setZoom]       = useState(1.1);
  const [pan,        setPan]        = useState({x:0,y:0});
  const [size,       setSize]       = useState({w:800,h:560});
  const [loaded,     setLoaded]     = useState(false);
  const [masterOK,   setMasterOK]   = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltip,    setTooltip]    = useState(null);
  const [mode,       setMode]       = useState("rate");
  const [showInfo,   setShowInfo]   = useState(false);

  const isPrediction = year > 2022;
  const isInterp     = year > 1966 && !DATA_YEARS.includes(year) && year <= 2022;

  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // ── データ読み込み ────────────────────────────────────────────
  useEffect(() => {
    fetch("https://unpkg.com/jpn-atlas@1.0.2/japan/japan.json")
      .then(r => r.json())
      .then(t => { topoRef.current = t; setLoaded(true); });
  }, []);

  useEffect(() => {
    fetch("/data/bamboo_master.json")
      .then(r => r.json())
      .then(d => { masterRef.current = d; setMasterOK(true); })
      .catch(() => setMasterOK(true));
  }, []);

  // ── リサイズ ──────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(es => {
      const {width,height} = es[0].contentRect;
      if (width > 10 && height > 10) setSize({w:Math.floor(width),h:Math.floor(height)});
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── ベース投影を size/loaded 変化時に更新（ズーム計算用） ────────
  useEffect(() => {
    if (!topoRef.current || !loaded) return;
    const features = topojson.feature(topoRef.current, topoRef.current.objects.prefectures).features;
    const proj = d3.geoIdentity().fitExtent([[228,4],[size.w-4,size.h-4]], {type:"FeatureCollection",features});
    const [tx, ty] = proj.translate();
    baseRef.current = {tx, ty};
  }, [size, loaded]);

  // ── 再生 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setYear(y => { if (y >= 2040) { setPlaying(false); return 2040; } return y + 1; });
    }, 90);
    return () => clearInterval(id);
  }, [playing]);

  // ── 描画 ──────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const lookup = lookupRef.current;
    const topo   = topoRef.current;
    if (!canvas || !lookup || !topo) return;

    const {w, h} = size;
    const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    lookup.width  = w;
    lookup.height = h;

    const ctx  = canvas.getContext("2d");
    const lctx = lookup.getContext("2d", {willReadFrequently: true});
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#060e06';
    ctx.fillRect(0, 0, w, h);
    lctx.clearRect(0, 0, w, h);

    const features      = topojson.feature(topo, topo.objects.prefectures).features;
    const geoCollection = {type:"FeatureCollection", features};
    const proj   = d3.geoIdentity().fitExtent([[228,4],[w-4,h-4]], geoCollection);
    const baseSc = proj.scale();
    const [baseTx, baseTy] = proj.translate();
    projRef.current = {baseSc, baseTx, baseTy};
    baseRef.current = {tx: baseTx, ty: baseTy}; // draw()のたびに同期
    proj.scale(baseSc * zoom).translate([baseTx + pan.x, baseTy + pan.y]);
    const pathGen = d3.geoPath().projection(proj);

    const metrics = masterRef.current?.metrics ?? {};

    // 全都道府県の値を先に計算してmin/maxを求める（正規化用）
    const values = {};
    features.forEach(feat => {
      const rawId = feat.id ?? feat.properties?.id ?? feat.properties?.code ?? "";
      const code  = String(rawId).padStart(2, "0");
      if (!PREF_NAMES[code]) return;
      const m = metrics[code];
      if (!m) return;
      let v;
      if (mode === 'jaxa_ha')   v = (m.jaxa_2024_ha ?? 0) * interpNatHA(year) / JAXA_2024_NAT_HA;
      else if (mode === 'moso_ha') v = interpMetric(metrics, code, year, 'moso_ha');
      else if (mode === 'rate')    v = interpMetric(metrics, code, year, 'rate');
      else                         v = interpMetric(metrics, code, year, 'accel');
      values[code] = v;
    });

    const vals = Object.values(values).filter(v => isFinite(v));
    let minV = Math.min(...vals), maxV = Math.max(...vals);
    if (mode === 'accel') {
      // 0を中心に対称にする
      const absMax = Math.max(Math.abs(minV), Math.abs(maxV), 1e-9);
      minV = -absMax; maxV = absMax;
    } else {
      // 全年度の値域で正規化 → 年度スライダーで色が変化するようにする
      const allVals = [];
      [1966, 2040].forEach(refY => {
        features.forEach(feat => {
          const c2 = String(feat.id ?? feat.properties?.id ?? feat.properties?.code ?? "").padStart(2,"0");
          if (!PREF_NAMES[c2] || !metrics[c2]) return;
          let v2;
          if (mode === 'jaxa_ha') {
            v2 = (metrics[c2].jaxa_2024_ha ?? 0) * interpNatHA(refY) / JAXA_2024_NAT_HA;
          } else {
            const field = mode === 'moso_ha' ? 'moso_ha' : mode === 'rate' ? 'rate' : 'accel';
            v2 = interpMetric(metrics, c2, refY, field);
          }
          if (isFinite(v2)) allVals.push(v2);
        });
      });
      if (allVals.length) { minV = Math.min(...allVals); maxV = Math.max(...allVals); }
    }
    if (minV === maxV) maxV = minV + 0.001;

    // ── ルックアップキャンバス（ヒット検出） ────────────────────
    features.forEach(feat => {
      const rawId   = feat.id ?? feat.properties?.id ?? feat.properties?.code ?? "";
      const code    = String(rawId).padStart(2, "0");
      const codeNum = parseInt(code, 10);
      if (!codeNum || !PREF_NAMES[code]) return;
      const lp = d3.geoPath().projection(proj).context(lctx);
      lctx.beginPath(); lp(feat);
      lctx.fillStyle = `rgb(${codeNum},128,42)`;
      lctx.fill();
    });

    const imgData = lctx.getImageData(0, 0, w, h).data;

    // ── コロプレス ───────────────────────────────────────────────
    features.forEach(feat => {
      const rawId = feat.id ?? feat.properties?.id ?? feat.properties?.code ?? "";
      const code  = String(rawId).padStart(2, "0");
      if (!PREF_NAMES[code]) return;

      const v    = values[code] ?? 0;
      const norm = (v - minV) / (maxV - minV);

      ctx.save();
      const clip = d3.geoPath().projection(proj).context(ctx);
      ctx.beginPath(); clip(feat); ctx.clip();
      const bounds = pathGen.bounds(feat);
      ctx.fillStyle = metricToFill(norm, mode);
      ctx.fillRect(bounds[0][0]-1, bounds[0][1]-1,
        bounds[1][0]-bounds[0][0]+2, bounds[1][1]-bounds[0][1]+2);
      ctx.restore();

      // 境界線（ネオングロー）
      ctx.save();
      const bd = d3.geoPath().projection(proj).context(ctx);
      ctx.beginPath(); bd(feat);
      ctx.strokeStyle = `rgba(140,255,80,${Math.min(0.5, 0.18 + norm * 0.3)})`;
      ctx.lineWidth   = Math.max(0.4, 1.0 / zoom);
      ctx.stroke();
      ctx.restore();

      // 都道府県名ラベル（ズーム2.5以上）
      if (zoom > 2.5) {
        const c = pathGen.centroid(feat);
        if (c && !isNaN(c[0])) {
          const alpha = Math.min(1, (zoom - 2.5));
          const fs    = Math.min(13, 5 + zoom);
          ctx.save();
          ctx.globalAlpha  = alpha;
          ctx.font         = `600 ${fs}px -apple-system, 'Hiragino Kaku Gothic ProN', sans-serif`;
          ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
          ctx.strokeStyle  = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3;
          ctx.strokeText(PREF_NAMES[code].replace(/[都道府県]$/, ''), c[0], c[1]);
          ctx.fillStyle    = 'rgba(200,255,120,0.95)';
          ctx.fillText(PREF_NAMES[code].replace(/[都道府県]$/, ''), c[0], c[1]);
          ctx.restore();
        }
      }
    });

    // ── 予測オーバーレイ ─────────────────────────────────────────
    if (isPrediction) {
      ctx.save();
      ctx.fillStyle = `rgba(180,50,0,${Math.min(0.12, 0.015*(year-2022))})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    hsposRef.current = [];
  }, [year, zoom, pan, size, isPrediction, mode]);

  useEffect(() => { if (loaded && masterOK) draw(); }, [draw, loaded, masterOK]);

  // ── ホイールズーム ──────────────────────────────────────────────
  // updater 内で setPan を呼ぶ React アンチパターンを排除し
  // ref から直接読んで両 state を同時確定することでズームバグを根絶
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const {tx: baseTx, ty: baseTy} = baseRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaMode === 2 ? e.deltaY * 300 : e.deltaY;
    const factor = Math.exp(-delta * (e.ctrlKey ? 0.008 : 0.001));
    const z = zoomRef.current;
    const p = panRef.current;
    const newZ = Math.max(1, Math.min(14, z * factor));
    const newP = {
      x: mx - (mx - baseTx - p.x) * newZ / z - baseTx,
      y: my - (my - baseTy - p.y) * newZ / z - baseTy,
    };
    zoomRef.current = newZ;
    panRef.current  = newP;
    setZoom(newZ);
    setPan(newP);
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const fn = e => handleWheel(e);
    el.addEventListener('wheel', fn, {passive: false});
    return () => el.removeEventListener('wheel', fn);
  }, [handleWheel]);

  // ── ドラッグ ─────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true); setTooltip(null);
    dragRef.current = {startX:e.clientX,startY:e.clientY,startPan:{...panRef.current}};
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && dragRef.current) {
      setPan({
        x: dragRef.current.startPan.x + e.clientX - dragRef.current.startX,
        y: dragRef.current.startPan.y + e.clientY - dragRef.current.startY,
      });
      return;
    }
    const canvas = canvasRef.current, lookup = lookupRef.current;
    if (!canvas || !lookup) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;

    {
      let nearest = null, nearestD = 256;
      for (const p of hsposRef.current) {
        const d2 = (p.hx-px)**2 + (p.hy-py)**2;
        if (d2 < nearestD) { nearestD = d2; nearest = p; }
      }
      if (nearest) { setTooltip({x:e.clientX,y:e.clientY,hotspot:nearest.hs}); return; }
    }
    const lctx = lookup.getContext("2d", {willReadFrequently: true});
    const pd   = lctx.getImageData(Math.round(px),Math.round(py),1,1).data;
    // Canvas returns premultiplied values — un-premultiply to recover actual fill color
    const a = pd[3];
    if (a > 10) {
      const r = Math.round(pd[0] * 255 / a);
      const g = Math.round(pd[1] * 255 / a);
      const b = Math.round(pd[2] * 255 / a);
      // Check signature channels (g≈128, b≈42) with tolerance for anti-aliasing
      if (g > 100 && g < 156 && b > 28 && b < 58 && r > 0) {
        const code = String(r).padStart(2, "0");
        if (PREF_NAMES[code]) { setTooltip({x:e.clientX,y:e.clientY,code}); return; }
      }
    }
    setTooltip(null);
  }, [isDragging]);

  const handleMouseUp    = useCallback(() => { setIsDragging(false); dragRef.current = null; }, []);
  const handleMouseLeave = useCallback(() => { setIsDragging(false); dragRef.current = null; setTooltip(null); }, []);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return;
    touchRef.current = {startX:e.touches[0].clientX,startY:e.touches[0].clientY,startPan:{...panRef.current}};
  }, []);
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length !== 1 || !touchRef.current) return;
    e.preventDefault();
    setPan({
      x: touchRef.current.startPan.x + e.touches[0].clientX - touchRef.current.startX,
      y: touchRef.current.startPan.y + e.touches[0].clientY - touchRef.current.startY,
    });
  }, []);
  const handleTouchEnd = useCallback(() => { touchRef.current = null; }, []);

  // ── ズームボタン ─────────────────────────────────────────────────
  const zoomReset = () => {
    zoomRef.current = 1; panRef.current = {x:0,y:0};
    setZoom(1); setPan({x:0,y:0});
  };
  const zoomStep = (f) => {
    const {tx: baseTx, ty: baseTy} = baseRef.current;
    const {w,h} = size; const cx=w/2, cy=h/2;
    const z = zoomRef.current;
    const p = panRef.current;
    const newZ = Math.max(1, Math.min(14, z*f));
    const newP = {
      x: cx-(cx-baseTx-p.x)*newZ/z-baseTx,
      y: cy-(cy-baseTy-p.y)*newZ/z-baseTy,
    };
    zoomRef.current = newZ; panRef.current = newP;
    setZoom(newZ); setPan(newP);
  };

  // ── 指標ラベル ────────────────────────────────────────────────────
  const MODE_CONFIG = {
    jaxa_ha: {label:"竹の実面積",   unit:"ha",   low:"少",   high:"多",  desc:"JAXA衛星が確認した竹林の実面積（2024年データを全国トレンドで年別スケール）"},
    moso_ha: {label:"孟宗竹の勢力", unit:"ha",   low:"弱",   high:"強",  desc:"最も侵略的な孟宗竹の推計占有面積。地下茎で天然林を内側から食い荒らす"},
    rate:    {label:"侵食危機度",   unit:"%",    low:"安全", high:"危機",desc:"侵入可能な天然林のうち竹に奪われた割合。高いほど深刻で回復困難"},
    accel:   {label:"拡大の加速",   unit:"%/年", low:"鈍化", high:"加速",desc:"竹の拡大ペースが加速中か収束中か。赤いほど今まさに拡大している"},
  };

  // ── ツールチップ：都道府県 ────────────────────────────────────────
  function PrefTooltip({code}) {
    const metrics = masterRef.current?.metrics;
    const m = metrics?.[code];
    if (!m) return null;
    const name     = PREF_NAMES[code];
    const mosoHa = interpMetric(metrics, code, year, 'moso_ha');
    const rate   = interpMetric(metrics, code, year, 'rate');
    const accel  = interpMetric(metrics, code, year, 'accel');
    const jaxaHa = (m.jaxa_2024_ha ?? 0) * interpNatHA(year) / JAXA_2024_NAT_HA;

    const modeVal = {jaxa_ha:jaxaHa, moso_ha:mosoHa, rate, accel}[mode] ?? 0;
    const allVals = Object.values(metrics).map(x => {
      const by = x.by_year;
      if (!by) return 0;
      const ys = DATA_YEARS;
      const yk = ys.reduce((a,b) => Math.abs(b-year)<Math.abs(a-year)?b:a);
      if (mode === 'jaxa_ha') return (x.jaxa_2024_ha ?? 0);
      return by[yk]?.[mode] ?? 0;
    });
    const maxAll = Math.max(...allVals.map(Math.abs), 0.001);
    const norm   = mode === 'accel'
      ? (modeVal / maxAll + 1) / 2
      : Math.max(0, Math.min(1, modeVal / maxAll));

    const fillC = metricToFill(norm, mode);
    return (
      <div className="rounded-2xl p-4 shadow-2xl w-64 text-sm"
        style={{background:'rgba(8,16,8,0.96)',border:'1px solid rgba(163,230,53,0.2)',backdropFilter:'blur(16px)'}}>
        {/* 府県名ヘッダー */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-black text-base" style={{color:'#a3e635'}}>{name}</p>
            <p className="text-[10px] mt-0.5" style={{color:'rgba(163,230,53,0.4)'}}>
              {year}年 · {isPrediction?"予測値":isInterp?"補間値":"実績値"}
            </p>
          </div>
          {isPrediction && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{background:'rgba(251,146,60,0.15)',color:'#fb923c',border:'1px solid rgba(251,146,60,0.3)'}}>予測</span>
          )}
        </div>

        {/* 現在の指標バー */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{color:'rgba(163,230,53,0.5)'}}>{MODE_CONFIG[mode].label}</span>
            <span className="font-black" style={{color: fillC}}>
              {mode === 'jaxa_ha' ? `${Math.round(jaxaHa).toLocaleString()} ha`
               : mode === 'moso_ha' ? `${Math.round(mosoHa).toLocaleString()} ha`
               : mode === 'rate' ? `${rate.toFixed(2)} %`
               : `${accel>=0?'+':''}${accel.toFixed(6)}`}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.07)'}}>
            <div className="h-full rounded-full transition-all" style={{width:`${norm*100}%`,background:fillC,boxShadow:`0 0 8px ${fillC}`}} />
          </div>
        </div>

        {/* 指標グリッド */}
        <div className="grid grid-cols-2 gap-2 rounded-xl p-2.5 mb-3 text-xs"
          style={{background:'rgba(255,255,255,0.04)'}}>
          {[
            {label:"竹林（衛星）", val:`${Math.round(jaxaHa).toLocaleString()} ha`},
            {label:"孟宗竹", val:`${Math.round(mosoHa).toLocaleString()} ha`},
            {label:"侵食危機度", val:`${rate.toFixed(2)} %`},
            {label:"拡大の加速", val:`${accel>=0?'+':''}${accel.toFixed(5)}`, accent:accel>0?'#fb923c':accel<0?'#38bdf8':undefined},
          ].map(({label,val,accent})=>(
            <div key={label}>
              <p style={{color:'rgba(163,230,53,0.35)'}}>{label}</p>
              <p className="font-bold" style={{color:accent||'rgba(200,240,160,0.85)'}}>{val}</p>
            </div>
          ))}
        </div>

        {/* 年別推移ミニチャート */}
        {mode !== 'jaxa_ha' && (() => {
          const field = mode === 'moso_ha' ? 'moso_ha' : mode === 'rate' ? 'rate' : 'accel';
          const chartYears = [1966, 1986, 2007, 2017, 2022];
          const chartVals = chartYears.map(y => interpMetric(metrics, code, y, field));
          const absMax = Math.max(...chartVals.map(Math.abs), 0.001);
          const fmt = (v) => field === 'moso_ha' ? `${Math.round(v).toLocaleString()}ha`
            : field === 'rate' ? `${v.toFixed(2)}%`
            : `${v>=0?'+':''}${v.toFixed(4)}`;
          return (
            <div className="mb-2">
              <p className="text-[10px] mb-1.5 font-bold" style={{color:'rgba(163,230,53,0.4)'}}>年別推移</p>
              <div className="space-y-1">
                {chartYears.map((y, i) => {
                  const v = chartVals[i];
                  const n2 = mode === 'accel' ? (v / absMax + 1) / 2 : Math.abs(v) / absMax;
                  const isCurYear = DATA_YEARS.includes(year) ? y === year : y === 2022 && year > 2022;
                  const barC = metricToFill(n2, mode);
                  return (
                    <div key={y} className="flex items-center gap-1.5" style={{opacity:isCurYear?1:0.45}}>
                      <span className="text-[10px] tabular-nums w-7 shrink-0" style={{color:'rgba(163,230,53,0.4)'}}>{y}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.07)'}}>
                        <div className="h-full rounded-full" style={{width:`${n2*100}%`,background:barC}} />
                      </div>
                      <span className="text-[10px] tabular-nums w-16 text-right shrink-0"
                        style={{color:isCurYear?'rgba(200,240,160,0.9)':'rgba(163,230,53,0.35)',fontWeight:isCurYear?700:400}}>{fmt(v)}</span>
                    </div>
                  );
                })}
                {year > 2022 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] tabular-nums w-7 shrink-0" style={{color:'#fb923c'}}>{year}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.07)'}}>
                      <div className="h-full rounded-full" style={{width:`${Math.min(1,Math.abs(interpMetric(metrics,code,year,field))/absMax)*100}%`,background:'#fb923c',opacity:0.8}} />
                    </div>
                    <span className="text-[10px] tabular-nums w-16 text-right shrink-0 font-bold" style={{color:'#fb923c'}}>{fmt(interpMetric(metrics,code,year,field))}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <p className="text-[10px]" style={{color:'rgba(163,230,53,0.2)'}}>侵食可能森林: {(m.invasible_ha||0).toLocaleString()} ha</p>
      </div>
    );
  }

  // ── ツールチップ：iNaturalist obs ─────────────────────────────
  function ObsTooltip({hs}) {
    const spName = SP_NAMES[hs.sp] ?? "不明";
    const spColors = ["rose","blue","violet"];
    const sc = spColors[hs.sp] ?? "rose";
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xl w-52 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
            iNaturalist実測
          </span>
        </div>
        <p className="font-bold text-stone-800 mb-0.5">{PREF_NAMES[hs.code] ?? hs.code}</p>
        <p className="text-xs text-stone-400 mb-3">
          {hs.year ? `${hs.year}年観察` : "観察年不明"} · 市民科学
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-3 h-3 rounded-full shrink-0`} style={{background:obsDotColor(hs.sp)}} />
          <span className="text-stone-700 font-semibold">{spName}</span>
        </div>
        {hs.grade === "research" && (
          <div className="mt-2 pt-2 border-t border-stone-100">
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">研究グレード ✓</span>
          </div>
        )}
        <p className="text-xs text-stone-300 mt-2">出典: iNaturalist / JAXA ALOS-2</p>
      </div>
    );
  }

  // ── ツールチップ：JAXA sat ────────────────────────────────────
  function SatTooltip({hs}) {
    const spName = hs.sp != null ? SP_NAMES[hs.sp] : "不明（衛星推計）";
    const density = hs.area_ha ? Math.min(1, hs.area_ha / 40) : 0.5;
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xl w-52 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">
            JAXA衛星実測
          </span>
        </div>
        <p className="font-bold text-stone-800 mb-0.5">{PREF_NAMES[hs.code] ?? hs.code}</p>
        <p className="text-xs text-stone-400 mb-3">2024年 · 50m解像度</p>
        {hs.area_ha && (
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-2xl font-black text-stone-800">{hs.area_ha.toFixed(1)}</span>
            <span className="text-xs text-stone-400">ha / 500mセル</span>
          </div>
        )}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-stone-500">竹林密度（面積比）</span>
            <span className="font-semibold">{(density*100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
            <div className="h-full rounded-full" style={{width:`${density*100}%`,background:gradientColor(density,STOPS_MOSO)}} />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
          <span className="w-2 h-2 rounded-full" style={{background:satDotColor(hs.sp,0.9)}} />
          <span className="text-xs text-stone-500">推定優占種: <strong>{spName}</strong></span>
        </div>
        <p className="text-xs text-stone-300 mt-2">出典: JAXA ALOS-2 / 林野庁</p>
      </div>
    );
  }


  // 年区分
  const yearType = year <= 2022
    ? (DATA_YEARS.includes(year) ? "実績値" : "補間値")
    : "予測値";
  const yearColor = year > 2022 ? "text-orange-500" : DATA_YEARS.includes(year) ? "text-emerald-600" : "text-stone-600";

  // モード別カラー
  const MODE_COLORS = {
    jaxa_ha: mode==='jaxa_ha' ? 'bg-lime-400 text-black'   : 'text-lime-400/50 hover:text-lime-300',
    moso_ha: mode==='moso_ha' ? 'bg-amber-400 text-black'  : 'text-amber-400/50 hover:text-amber-300',
    rate:    mode==='rate'    ? 'bg-orange-500 text-white' : 'text-orange-400/50 hover:text-orange-300',
    accel:   mode==='accel'   ? 'bg-violet-500 text-white' : 'text-violet-400/50 hover:text-violet-300',
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{background:'#060e06',color:'#e8f5e0'}}>

      {/* ── ヘッダー ─────────────────────────────────────────── */}
      <header className="flex items-center gap-2 px-4 py-2.5 shrink-0 select-none flex-wrap"
        style={{background:'#060e06',borderBottom:'1px solid rgba(120,255,60,0.12)'}}>
        <Link href="/" className="text-lime-400/50 hover:text-lime-300 text-sm shrink-0 flex items-center gap-1 font-bold">
          ←
        </Link>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-lg leading-none">🎋</span>
          <h1 className="text-sm font-black truncate" style={{color:'#a3e635'}}>竹林侵食マップ</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'rgba(163,230,53,0.12)',color:'rgba(163,230,53,0.7)',border:'1px solid rgba(163,230,53,0.2)'}}>1966–2040</span>
        </div>

        {/* 指標切り替え */}
        <div className="flex gap-1 shrink-0">
          {Object.entries(MODE_CONFIG).map(([k,v]) => (
            <button key={k} onClick={() => setMode(k)}
              className={`text-xs px-3 py-1 rounded-full font-black transition-all ${MODE_COLORS[k]}`}>{v.label}</button>
          ))}
        </div>

        {/* ? インフォボタン */}
        <button onClick={() => setShowInfo(v=>!v)}
          className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center transition-all shrink-0 ${
            showInfo ? 'bg-lime-400 text-black' : 'text-lime-400/50 hover:text-lime-300'
          }`} style={{border:'1px solid rgba(163,230,53,0.25)'}}>?</button>

      </header>

      {/* ── マップ ───────────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{minHeight:0,background:'#060e06'}}>

        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center z-20" style={{background:'#060e06'}}>
            <div className="flex flex-col items-center gap-4">
              <div className="text-5xl animate-bounce">🎋</div>
              <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{borderColor:'rgba(163,230,53,0.3)',borderTopColor:'#a3e635'}} />
              <p className="text-sm font-bold" style={{color:'rgba(163,230,53,0.7)'}}>地図を読み込み中…</p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{cursor:isDragging?"grabbing":"grab",touchAction:"none"}}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}    onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        />
        <canvas ref={lookupRef} className="hidden" />


        {/* インフォパネル */}
        {showInfo && (
          <div className="absolute top-3 right-12 z-20 w-72 rounded-2xl shadow-2xl p-4 text-sm"
            style={{background:'rgba(10,20,8,0.96)',border:'1px solid rgba(163,230,53,0.2)',backdropFilter:'blur(12px)'}}>
            <div className="flex justify-between items-start mb-3">
              <p className="font-black text-lime-300">このマップについて</p>
              <button onClick={() => setShowInfo(false)} className="text-lime-400/50 hover:text-lime-300 text-base leading-none ml-2">✕</button>
            </div>
            <div className="space-y-3 text-xs leading-relaxed" style={{color:'rgba(200,240,160,0.7)'}}>
              <div>
                <p className="font-bold mb-1" style={{color:'#a3e635'}}>都道府県の色は何？</p>
                <p>上のボタンで切り替えた指標。赤いほど問題が深刻。年代スライダーで竹の侵食がどう変化するか確認できます。</p>
              </div>
              <div>
                <p className="font-bold mb-1" style={{color:'#a3e635'}}>データ出典</p>
                <p>林野庁「森林資源現況調査」 + JAXA ALOS-2衛星高解像度土地被覆図2024年版をもとに独自推計。</p>
              </div>
              <div>
                <p className="font-bold mb-1" style={{color:'#fbbf24'}}>2022年以降は予測値</p>
                <p>過去トレンドからの外挿。実際の未来を保証するものではありません。</p>
              </div>
            </div>
          </div>
        )}

        {/* ズームボタン */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          {[{l:"+",fn:()=>zoomStep(1.6)},{l:"−",fn:()=>zoomStep(1/1.6)},{l:"⊡",fn:zoomReset}].map(({l,fn})=>(
            <button key={l} onClick={fn}
              className="w-8 h-8 rounded-xl text-sm font-black flex items-center justify-center transition-all hover:scale-110"
              style={{background:'rgba(15,30,10,0.85)',border:'1px solid rgba(163,230,53,0.25)',color:'#a3e635',backdropFilter:'blur(8px)'}}
            >{l}</button>
          ))}
        </div>

        {/* 左：種類パネル（トレーディングカード風） */}
        <div className="absolute top-0 left-0 bottom-0 z-20 w-56 flex flex-col overflow-hidden"
          style={{background:'rgba(6,14,6,0.94)',borderRight:'1px solid rgba(163,230,53,0.15)',backdropFilter:'blur(10px)'}}>
          <div className="px-4 py-3" style={{borderBottom:'1px solid rgba(163,230,53,0.12)'}}>
            <p className="font-black text-sm" style={{color:'#a3e635'}}>🌿 侵略する3種</p>
            <p className="text-[10px] mt-0.5" style={{color:'rgba(163,230,53,0.4)'}}>竹林侵食の主犯たち</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
            {[
              {name:"孟宗竹", emoji:"👑", pct:"60%",
               tag:"ラスボス",
               shock:"1日で1.2m伸びる",
               detail:"寝てる間に伸びてる。カメラ設置したら泣ける。",
               stats:["最高22m（5階建て相当）","地下茎は年10m侵略","「竹林に駐車」は罠"],
               danger:3, color:'#fbbf24',
               glow:'rgba(251,191,36,0.15)', border:'rgba(251,191,36,0.3)',
               bar:'linear-gradient(90deg,#fbbf24,#ef4444)'},
              {name:"真竹", emoji:"💀", pct:"30%",
               tag:"謎の超大物",
               shock:"120年間ずっと無言で待つ",
               detail:"突然全国一斉に花を咲かせて枯れる。意味がわからない。",
               stats:["全国同時開花（理由不明）","枯れた後また生えてくる","お箸もこいつ由来"],
               danger:2, color:'#38bdf8',
               glow:'rgba(56,189,248,0.12)', border:'rgba(56,189,248,0.3)',
               bar:'linear-gradient(90deg,#38bdf8,#2563eb)'},
              {name:"淡竹", emoji:"🧊", pct:"10%",
               tag:"静かな北進者",
               shock:"温暖化とともに北上し続ける",
               detail:"目立たないが確実に版図を広げる。地味に怖い。",
               stats:["北限が毎年更新中","急傾斜地でもへっちゃら","京都の名竹林もこいつ"],
               danger:2, color:'#a78bfa',
               glow:'rgba(167,139,250,0.12)', border:'rgba(167,139,250,0.3)',
               bar:'linear-gradient(90deg,#a78bfa,#7c3aed)'},
            ].map(s=>(
              <div key={s.name} className="rounded-2xl p-3 flex flex-col gap-2.5"
                style={{background:s.glow,border:`1px solid ${s.border}`}}>
                {/* 名前 + シェア */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{s.emoji}</span>
                    <div>
                      <p className="text-base font-black leading-tight" style={{color:s.color}}>{s.name}</p>
                      <p className="text-[10px] font-bold" style={{color:s.color,opacity:0.5}}>{s.tag}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{background:'rgba(255,255,255,0.06)',color:s.color,border:`1px solid ${s.border}`}}>{s.pct}</span>
                </div>
                {/* ショックスタット */}
                <div className="rounded-xl px-3 py-2 space-y-1" style={{background:'rgba(0,0,0,0.3)'}}>
                  <p className="text-xs font-black leading-tight" style={{color:s.color}}>{s.shock}</p>
                  <p className="text-[10px] leading-snug" style={{color:'rgba(200,230,150,0.5)'}}>{s.detail}</p>
                </div>
                {/* 危険度バー */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1" style={{color:'rgba(200,230,150,0.4)'}}>
                    <span>侵食力</span>
                    <span style={{color:s.color}}>{"◆".repeat(s.danger)}<span style={{opacity:0.2}}>{"◆".repeat(3-s.danger)}</span></span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                    <div className="h-full rounded-full" style={{width:`${(s.danger/3)*100}%`,background:s.bar}} />
                  </div>
                </div>
                {/* ファクト */}
                <div className="space-y-1">
                  {s.stats.map(f=>(
                    <div key={f} className="flex items-start gap-1.5">
                      <span className="text-[10px] mt-0.5" style={{color:s.color}}>›</span>
                      <span className="text-[11px] leading-snug" style={{color:'rgba(200,230,150,0.7)'}}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 左上バッジ群 */}
        <div className="absolute top-3 left-[232px] z-10 flex flex-col gap-1">
          {isPrediction && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-1.5"
              style={{background:'rgba(251,146,60,0.15)',border:'1px solid rgba(251,146,60,0.3)'}}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#fb923c'}} />
              <span className="text-xs font-bold" style={{color:'#fb923c'}}>将来予測モード</span>
            </div>
          )}
        </div>

        {/* 凡例 */}
        <div className="absolute bottom-3 left-[232px] z-10 rounded-2xl p-3 min-w-[160px]"
          style={{background:'rgba(6,14,6,0.88)',border:'1px solid rgba(163,230,53,0.18)',backdropFilter:'blur(10px)'}}>
          <p className="text-xs font-black mb-1.5" style={{color:'#a3e635'}}>
            {MODE_CONFIG[mode].label}<span className="ml-1 font-normal opacity-50">（{MODE_CONFIG[mode].unit}）</span>
          </p>
          <div className="h-2.5 w-28 rounded-full overflow-hidden flex mb-1.5">
            {(mode==='accel' ? STOPS_ACCEL : STOPS_MOSO)
              .slice(0,-1).map(([t],i,a) => (
              <div key={i} className="flex-1"
                style={{background:metricToFill((t + (a[i+1]?.[0]??1))/2, mode)}} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] w-28 mb-2" style={{color:'rgba(163,230,53,0.4)'}}>
            <span>{MODE_CONFIG[mode].low}</span><span>{MODE_CONFIG[mode].high}</span>
          </div>
          <p className="text-[10px] leading-snug" style={{color:'rgba(163,230,53,0.45)'}}>{MODE_CONFIG[mode].desc}</p>
        </div>

        {/* 操作ヒント */}
        {loaded && (
          <div className="absolute bottom-3 right-3 z-10 text-[10px] text-right leading-relaxed pointer-events-none"
            style={{color:'rgba(163,230,53,0.25)'}}>
            <p>ドラッグ: 移動</p>
            <p>スクロール: ズーム</p>
          </div>
        )}

        {/* ツールチップ */}
        {tooltip && typeof window !== "undefined" && (
          <div className="fixed z-50 pointer-events-none"
            style={{
              left: Math.min(tooltip.x+16, window.innerWidth-290),
              top:  Math.min(tooltip.y-10,  window.innerHeight-380),
            }}>
            {!tooltip.hotspot && <PrefTooltip code={tooltip.code} />}
          </div>
        )}
      </div>

      {/* ── タイムスライダー ─────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 select-none"
        style={{background:'#060e06',borderTop:'1px solid rgba(163,230,53,0.12)'}}>
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tabular-nums leading-none"
                style={{color: year > 2022 ? '#fb923c' : DATA_YEARS.includes(year) ? '#a3e635' : '#67e8f9'}}>
                {year}
              </span>
              <span className="text-xs font-bold" style={{color:'rgba(163,230,53,0.4)'}}>年 · {yearType}</span>
            </div>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {[1966, 1995, 2022].map(y=>(
                <button key={y} onClick={()=>{setYear(y);setPlaying(false);}}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all hover:scale-105"
                  style={y===year
                    ? {background:'rgba(163,230,53,0.2)',color:'#a3e635',border:'1px solid rgba(163,230,53,0.4)'}
                    : {background:'rgba(255,255,255,0.05)',color:'rgba(163,230,53,0.5)',border:'1px solid rgba(163,230,53,0.12)'}
                  }>{y}</button>
              ))}
              <button onClick={()=>{setYear(2040);setPlaying(false);}}
                className="text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all hover:scale-105"
                style={year===2040
                  ? {background:'rgba(251,146,60,0.2)',color:'#fb923c',border:'1px solid rgba(251,146,60,0.4)'}
                  : {background:'rgba(251,146,60,0.08)',color:'rgba(251,146,60,0.5)',border:'1px solid rgba(251,146,60,0.2)'}
                }>2040予測</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>setPlaying(p=>!p)}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-base transition-all hover:scale-110"
              style={{background:playing?'rgba(163,230,53,0.2)':'#a3e635',color:playing?'#a3e635':'#060e06',
                border:'1px solid rgba(163,230,53,0.4)',boxShadow:playing?'none':'0 0 20px rgba(163,230,53,0.3)'}}>
              {playing?"⏸":"▶"}
            </button>
            <div className="flex-1">
              <input type="range" min={1966} max={2040} value={year}
                onChange={e=>{setYear(Number(e.target.value));setPlaying(false);}}
                className="w-full" style={{accentColor:'#a3e635'}} />
              <div className="flex justify-between text-[10px] mt-0.5" style={{color:'rgba(163,230,53,0.25)'}}>
                <span>1966</span>
                <span>← 実績値 ｜ 補間値 ｜ 予測値 →</span>
                <span>2040</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
