import ChoroplethMap from "../components/ChoroplethMap";

export const metadata = {
  title: "孟宗竹侵食マップ（1915–2050） — 竹林危機",
  description: "47都道府県の孟宗竹侵食状況を林野庁実測データでインタラクティブに可視化。",
};

export default function MapPage() {
  return <ChoroplethMap />;
}
