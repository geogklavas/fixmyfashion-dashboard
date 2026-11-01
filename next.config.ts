import type { NextConfig } from "next";

// next/font self-hosts Geist/Geist Mono at build time, so no runtime font
// requests leave the app. The only third-party origin loaded in the browser
// is Microsoft Clarity (components/analytics/Clarity.tsx), env-gated and off
// unless NEXT_PUBLIC_CLARITY_ID is set. GTM/GA4 run on the Shopify storefront,
// not this dashboard. Inline <script>/style attributes are required by
// Next.js's own hydration payload and by components using style={{...}}
// throughout — hence 'unsafe-inline' below rather than a nonce scheme.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.clarity.ms https://*.clarity.ms${
    process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"
  }`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.clarity.ms",
  "font-src 'self' data:",
  "connect-src 'self' https://www.clarity.ms https://*.clarity.ms",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
