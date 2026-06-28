import type { Metadata } from "next";
import "./globals.css";
import { Outfit, Inter, Fustat } from "next/font/google";

import { Providers } from "@/app/providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fustat = Fustat({
  subsets: ["latin"],
  variable: "--font-fustat",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "ArcStream | Agent Wallet x402 Workflows on Arc",
  description:
    "AI agents discover paid tools, spend from a Circle agent wallet, and verify x402 USDC receipts on Arc.",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "ArcStream | Agent Wallet x402 Workflows on Arc",
    description: "AI agents discover paid tools, spend from a Circle agent wallet, and verify x402 USDC receipts on Arc.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "ArcStream Logo" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ArcStream",
    description: "Agent wallet payments and x402 receipts on Arc Testnet.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} ${fustat.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
