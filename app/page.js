import Link from "next/link";
import CountUp from "./components/CountUp";

// ── Hero ──────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="px-4 pt-12 pb-6 flex justify-center w-full">
      <div
        className="w-full max-w-4xl rounded-3xl px-8 py-12 md:px-16 md:py-16 flex flex-col items-center text-center gap-8 relative overflow-hidden"
        style={{ backgroundColor: "#111b0e" }}
      >
        {/* 背景グラデーション */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-lime-500/8 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-emerald-400/8 blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 bg-lime-300/4 blur-3xl" />
        </div>

        {/* バッジ */}
        <span className="relative text-xs font-bold tracking-widest uppercase bg-lime-400/15 text-lime-400 border border-lime-400/25 px-4 py-1.5 rounded-full">
          放任竹林問題 · 2024年版
        </span>

        {/* 見出し */}
        <div className="relative space-y-3">
          <h1 className="text-3xl md:text-5xl font-black leading-tight text-white">
            日本の森が、<span className="text-lime-400">竹</span>に<br />飲み込まれている
          </h1>
          <p className="text-stone-400 text-sm md:text-base max-w-md mx-auto leading-relaxed">
            管理放棄された竹林が毎年 2,000ha の森林に侵食。
            このままでは 2050年に倍増すると予測されています。
          </p>
        </div>

        {/* 大きな数字 */}
        <div className="relative w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl px-8 py-6 flex flex-col items-center gap-1">
          <p className="text-xs text-lime-300/70 font-semibold tracking-widest uppercase">全国竹林面積（2022年）</p>
          <p className="text-6xl md:text-7xl font-black text-lime-400 tabular-nums leading-none">
            <CountUp target={175000} duration={2000} />
          </p>
          <p className="text-xl font-bold text-lime-300/80">ヘクタール</p>
        </div>

        {/* サブ数値 */}
        <div className="relative flex gap-3 flex-wrap justify-center">
          {[
            { value:"+25%",    label:"1990年比",     color:"text-amber-300",  bg:"bg-amber-400/15  border-amber-400/20" },
            { value:"×2超",    label:"2050年予測",   color:"text-orange-300", bg:"bg-orange-400/15 border-orange-400/20" },
            { value:"2,000ha", label:"年間森林侵食",  color:"text-red-300",    bg:"bg-red-400/15    border-red-400/20" },
          ].map(s => (
            <div key={s.label} className={`border rounded-2xl px-5 py-3 flex flex-col items-center ${s.bg}`}>
              <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
              <span className={`text-xs mt-0.5 opacity-70 ${s.color}`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="relative flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link
            href="/map"
            className="px-7 py-3.5 rounded-2xl bg-lime-400 hover:bg-lime-300 text-stone-900 font-black transition-all text-sm shadow-lg hover:shadow-lime-400/25 hover:-translate-y-0.5 text-center"
          >
            全国マップを開く →
          </Link>
          <a
            href="#about"
            className="px-7 py-3.5 rounded-2xl border border-white/15 hover:border-white/30 hover:bg-white/8 text-white/80 font-medium transition-all text-sm text-center"
          >
            問題を知る ↓
          </a>
        </div>
      </div>
    </section>
  );
}

// ── KPI カード ────────────────────────────────────────────────
const KPI_DATA = [
  { label:"2050年 予測面積", value:"30万ha超", note:"現状放置の場合",   icon:"📈", accent:"border-orange-200 bg-orange-50", val:"text-orange-600", nb:"text-orange-400" },
  { label:"年間侵食ペース",   value:"2,000ha",  note:"毎年失われる森林", icon:"🌿", accent:"border-yellow-200 bg-yellow-50", val:"text-yellow-700", nb:"text-yellow-500" },
  { label:"東京ドーム換算",   value:"37,000個", note:"現在の竹林総面積", icon:"🏟", accent:"border-emerald-200 bg-emerald-50",val:"text-emerald-700",nb:"text-emerald-500"},
  { label:"主要侵食種",       value:"3種",       note:"孟宗竹・真竹・淡竹",icon:"🎋",accent:"border-lime-200 bg-lime-50",  val:"text-lime-700",  nb:"text-lime-500" },
];

function KpiSection() {
  return (
    <section id="about" className="px-4 py-8 max-w-5xl mx-auto w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPI_DATA.map(k => (
          <div key={k.label} className={`rounded-2xl border-2 ${k.accent} p-5 flex flex-col gap-2`}>
            <span className="text-2xl">{k.icon}</span>
            <p className="text-xs font-semibold text-stone-500">{k.label}</p>
            <p className={`text-xl md:text-2xl font-black ${k.val} leading-tight`}>{k.value}</p>
            <p className={`text-xs ${k.nb}`}>{k.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── マップ CTA ────────────────────────────────────────────────
function MapCtaSection() {
  return (
    <section className="px-4 py-4 max-w-5xl mx-auto w-full">
      <div className="rounded-3xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row items-stretch">
          {/* 地図プレビュー風カラムブロック */}
          <div
            className="md:w-48 h-24 md:h-auto flex items-center justify-center shrink-0 select-none"
            style={{ background: "linear-gradient(135deg, #166534 0%, #14532d 40%, #b45309 100%)" }}
          >
            <span className="text-4xl">🗾</span>
          </div>

          <div className="flex-1 px-7 py-6 md:py-7 flex flex-col md:flex-row items-center gap-5">
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-1.5">
                <h2 className="text-lg md:text-xl font-black text-stone-800">全国 竹林侵食マップ</h2>
                <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">JAXA衛星データあり</span>
              </div>
              <p className="text-sm text-stone-500 leading-relaxed">
                47都道府県の推計データに加え、JAXAの高解像度土地被覆図による
                実測竹林分布を重ねて表示。タイムスライダーで1990〜2050年を体感。
              </p>
            </div>
            <Link
              href="/map"
              className="shrink-0 px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm transition-all shadow-sm hover:-translate-y-0.5 whitespace-nowrap"
            >
              マップを開く →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 竹種カード ────────────────────────────────────────────────
const SPECIES = [
  {
    name:"孟宗竹", latin:"Phyllostachys edulis", share:"約60%",
    desc:"日本最大の竹。地下茎で爆速繁殖し、在来植物を駆逐する。タケノコで有名だが、放置すれば森を丸ごと飲み込む。",
    traits:["最大径 15cm","高さ 20m超","侵食力 ★★★"],
    dot:"bg-amber-500", border:"border-amber-200", bg:"bg-amber-50", accent:"text-amber-700", badge:"bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    name:"真竹",   latin:"Phyllostachys bambusoides", share:"約30%",
    desc:"竹細工の定番素材。里山に広く自生。管理をやめた途端、じわじわと隣接森林へ侵出していく。",
    traits:["最大径 10cm","高さ 15m超","侵食力 ★★☆"],
    dot:"bg-sky-500", border:"border-sky-200", bg:"bg-sky-50", accent:"text-sky-700", badge:"bg-sky-100 text-sky-700 border-sky-200",
  },
  {
    name:"淡竹",   latin:"Phyllostachys nigra var. henonis", share:"約10%",
    desc:"細くて密集するタイプ。急傾斜地にも侵入し、土砂災害リスクを高める。小さいが侮れない。",
    traits:["最大径 5cm","高さ 10m超","侵食力 ★☆☆"],
    dot:"bg-violet-500", border:"border-violet-200", bg:"bg-violet-50", accent:"text-violet-700", badge:"bg-violet-100 text-violet-700 border-violet-200",
  },
];

function SpeciesSection() {
  return (
    <section className="px-4 py-10 max-w-5xl mx-auto w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-stone-800">主要 3 侵食種</h2>
        <p className="text-sm text-stone-400 mt-1.5">どの竹がどのくらい広がっているのか？</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SPECIES.map(s => (
          <div key={s.name} className={`rounded-3xl border ${s.border} ${s.bg} p-6 flex flex-col gap-4 hover:shadow-lg hover:-translate-y-1 transition-all`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className={`text-2xl font-black ${s.accent}`}>{s.name}</h3>
                <p className="text-xs text-stone-400 italic mt-0.5">{s.latin}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.badge}`}>全国 {s.share}</span>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">{s.desc}</p>
            <div className="flex flex-col gap-1.5 mt-auto pt-3 border-t border-black/5">
              {s.traits.map(t => (
                <div key={t} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                  <span className="text-xs text-stone-600">{t}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── データ出典 ────────────────────────────────────────────────
function DataSection() {
  return (
    <section className="px-4 py-8 max-w-5xl mx-auto w-full">
      <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🛰</span>
          <h2 className="text-lg font-black text-stone-800">データについて</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-stone-600 leading-relaxed">
          <div>
            <p className="font-bold text-stone-700 mb-1">統計推計データ</p>
            <p>都道府県別の竹林面積・侵食率は林野庁「森林資源現況調査」（2022年）および関連調査資料をもとに独自推計。2025年以降は傾向延長による予測値であり、林野庁の公式見解ではありません。</p>
          </div>
          <div>
            <p className="font-bold text-stone-700 mb-1">JAXA衛星実測データ</p>
            <p>竹林分布ドットはJAXA「高解像度土地利用土地被覆図」2024年版（v25.04, 50m解像度）の竹林クラス（#11）ピクセルを500mグリッドで集計したものです。衛星リモートセンシングによる客観的な実測値です。</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── アクション ────────────────────────────────────────────────
const ACTIONS = [
  { icon:"🍚", grad:"from-orange-400 to-amber-400", no:"01",
    title:"タケノコを食べ倒す",
    desc:"竹林問題の解決策の9割は「収穫してごはんにする」に集約されます。スーパーで国産タケノコを見かけたら、迷わずカゴへ。これはもはや使命です。" },
  { icon:"📣", grad:"from-lime-400 to-emerald-400", no:"02",
    title:"「竹ってやばい」と誰かに言う",
    desc:"環境問題が広まる最大の経路は「飲み会での雑談」です（当社調べ）。知人1人に話すだけで竹林を気にする人が倍になります。友達が減るリスクは自己責任でお願いします。" },
  { icon:"💸", grad:"from-sky-400 to-teal-400",     no:"03",
    title:"税金で竹を倒す",
    desc:"ふるさと納税で竹林整備を支援できます。返礼品にタケノコが届く自治体もあり、①との相乗効果が狙える完璧な仕組みです。お金が森を守ります（本当に）。" },
];

function ActionSection() {
  return (
    <section className="px-4 py-10 max-w-5xl mx-auto w-full">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-stone-800">あなたにできること</h2>
        <p className="text-sm text-stone-400 mt-1.5">今日からできる、小さくて大きなアクション</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ACTIONS.map(a => (
          <div key={a.title} className="rounded-3xl bg-white border border-stone-200 p-6 flex flex-col gap-4 hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${a.grad} flex items-center justify-center text-xl shadow-md`}>
              {a.icon}
            </div>
            <div>
              <span className="text-xs font-bold text-stone-300 font-mono">ACTION {a.no}</span>
              <h3 className="text-base font-black text-stone-800 mt-1 leading-snug">{a.title}</h3>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed">{a.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── フッター ──────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="mt-4 px-4 py-8 border-t border-stone-200 max-w-5xl mx-auto w-full">
      <p className="text-xs text-stone-400 text-center leading-loose">
        竹林面積データ：林野庁「森林資源現況調査」（2022年）をもとに独自加工 ·
        竹林分布データ：JAXA 高解像度土地利用土地被覆図 2024 v25.04
        <br />
        本サイトは農林水産省・林野庁・JAXAとは無関係の民間啓発サイトです。
      </p>
    </footer>
  );
}

// ── ページ ────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="flex flex-col items-center w-full">
      <HeroSection />
      <KpiSection />
      <MapCtaSection />
      <DataSection />
      <ActionSection />
      <Footer />
    </main>
  );
}
