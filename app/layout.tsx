import type { Metadata } from "next";
import "./globals.css";
import { Albert_Sans, DM_Serif_Display } from "next/font/google";

import { Providers } from "@/app/providers";
import clearDealLogo from "../logo.png";

const albertSans = Albert_Sans({
  subsets: ["latin"],
  variable: "--font-albert-sans",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-dm-serif",
  weight: "400",
  display: "swap",
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "ClearDeal | Company Spend Controls on Arc",
  description:
    "Request, approve, verify, and pay company expenses in USDC with an auditable transaction memo on Arc Testnet.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=cleardeal-4", sizes: "any", type: "image/x-icon" },
      { url: "/favicon.svg?v=cleardeal-4", type: "image/svg+xml" },
      { url: "/favicon.png?v=cleardeal-4", sizes: "32x32", type: "image/png" },
      { url: "/logo-192.png?v=cleardeal-4", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=cleardeal-4", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico?v=cleardeal-4",
  },
  openGraph: {
    title: "ClearDeal | Company Spend Controls on Arc",
    description:
      "Turn company spending requests into approved, evidence-backed USDC payments on Arc Testnet.",
    images: [{ url: clearDealLogo.src, width: 577, height: 433, alt: "ClearDeal" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ClearDeal",
    description: "Request, approve, verify, and pay company expenses in USDC on Arc Testnet.",
    images: [clearDealLogo.src],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${albertSans.variable} ${dmSerif.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
