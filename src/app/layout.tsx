import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import PlvtvsProviders from "@/lib/plvtvs/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PLVTVS.NETWORK — Your Ghost in the Wireless Shell",
  description:
    "The sovereign avatar engineered to intercept, adapt, and monetize network value streams autonomously. Beyond Agents. The God of Digital Wealth Creation.",
  keywords: [
    "PLVTVS",
    "digital avatar",
    "Web3",
    "Base network",
    "AI agent",
    "autonomous wealth",
    "cyberpunk",
    "decentralized identity",
  ],
  authors: [{ name: "PLVTVS Core" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "PLVTVS.NETWORK",
    description:
      "Your Ghost in the Wireless Shell. The sovereign avatar engineered to monetize network value streams autonomously.",
    url: "https://plvtvs.network",
    siteName: "PLVTVS.NETWORK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PLVTVS.NETWORK",
    description:
      "Beyond Agents. The God of Digital Wealth Creation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('error', function(e) { console.error('[PLVTVS Global Error]', e.error || e.message, e.filename, e.lineno); }); window.addEventListener('unhandledrejection', function(e) { console.error('[PLVTVS Promise Rejection]', e.reason); });`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
        style={{ background: "#000000" }}
      >
        <PlvtvsProviders>{children}</PlvtvsProviders>
        <Toaster />
      </body>
    </html>
  );
}
