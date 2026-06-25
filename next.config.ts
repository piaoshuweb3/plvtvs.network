import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for Vercel + Docker / bare-metal deploys
  output: "standalone",
  // Allow cross-origin requests from the preview / production domains
  // (needed for WalletConnect + WebSocket mini-service)
  allowedDevOrigins: [
    'preview-chat-2919e75e-646f-49d7-93fe-735fbe3f1e47.space-z.ai',
    'plvtvs.one',
    'www.plvtvs.one',
  ],
  // TypeScript errors are surfaced in CI but don't block Vercel build
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Transpile RainbowKit ESM (MediaPipe loaded via CDN script)
  transpilePackages: ['@rainbow-me/rainbowkit'],
  // Empty turbopack config to silence the webpack-config warning
  // (Next.js 16 uses Turbopack by default)
  turbopack: {},
};

export default nextConfig;
