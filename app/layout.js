import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "竹ー今日も日本のどこかで",
  icons: {
    icon: '/okigasa-icon.png',
    apple: '/okigasa-icon.png',
  },
  openGraph: {
    images: [{ url: '/okigasa-icon-circle.png' }],
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
