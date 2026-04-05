import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "竹林危機 — 日本の森が、竹に飲み込まれている",
  description: "放任竹林の拡大が日本の森林生態系を脅かしています。現状と対策を知り、あなたにできることを見つけてください。",
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
