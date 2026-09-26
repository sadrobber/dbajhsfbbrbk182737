import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Points next-intl at src/i18n/request.ts (loads the FR/EN/IT message files).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The JSON "database" in /data is read at request time: ship it with the server code.
  outputFileTracingIncludes: {
    "/**": ["./data/**/*"],
  },
  images: {
    // Only product photos uploaded in the admin are optimized.
    localPatterns: [{ pathname: "/api/media/**", search: "" }],
    qualities: [75],
  },
  experimental: {
    serverActions: {
      // Admin photo uploads (5 MB per photo, a few at a time).
      bodySizeLimit: "16mb",
    },
  },
};

export default withNextIntl(nextConfig);
