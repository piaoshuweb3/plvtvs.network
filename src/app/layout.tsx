import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import PlvtvsProviders from "@/lib/plvtvs/providers";

export const metadata: Metadata = {
  title: "PLVTVS.ONE — Your soul in the Wireless Shell",
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
    title: "PLVTVS.ONE",
    description:
      "Your soul in the Wireless Shell. The sovereign avatar engineered to monetize network value streams autonomously.",
    url: "https://plvtvs.one",
    siteName: "PLVTVS.ONE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PLVTVS.ONE",
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
        className="antialiased bg-black text-white"
        style={{ background: "#000000", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace" }}
      >
        <PlvtvsProviders>{children}</PlvtvsProviders>
        <Toaster />
      </body>
    </html>
  );
}
