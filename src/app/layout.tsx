import type { Metadata } from "next";
import { Noto_Sans_Thai, Noto_Serif_Thai, Prompt } from "next/font/google";
import "./globals.css";

const body = Noto_Sans_Thai({ subsets: ["thai", "latin"], variable: "--font-body", weight: ["400", "500", "600"] });
const modern = Prompt({ subsets: ["thai", "latin"], variable: "--font-modern", weight: ["500", "600", "700"] });
const classic = Noto_Serif_Thai({ subsets: ["thai", "latin"], variable: "--font-classic", weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: "Virtual Storefront", template: "%s · Virtual Storefront" },
  description: "ร้านค้าออนไลน์ที่เหมือนเดินเข้าร้านจริง",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${body.variable} ${modern.variable} ${classic.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
