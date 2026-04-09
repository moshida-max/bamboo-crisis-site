import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "竹林危機 — 今日も日本のどこかで、竹が1m伸びている",
  description: "竹は1日で最大1m伸びる。放置された竹林は毎年2〜3m拡大し、気づいたら森も畑も飲み込まれていく。日本の里山で静かに進む、緑の侵食をリアルタイムで可視化する。",
  icons: {
    icon: '/okigasa-icon.png',
    apple: '/okigasa-icon.png',
  },
  openGraph: {
    images: [{ url: '/okigasa-icon.png' }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-lime-50 text-stone-800">
        {children}
      </body>
    </html>
  );
}
