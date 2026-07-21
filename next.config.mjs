const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: isProduction ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
    value: contentSecurityPolicy,
  },
];

if (isProduction) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      "@react-native-async-storage/async-storage": { browser: "./lib/empty-module.js" },
      "pino-pretty": { browser: "./lib/empty-module.js" },
      "@base-org/account": { browser: "./lib/empty-module.js" },
      "@coinbase/wallet-sdk": { browser: "./lib/empty-module.js" },
      "@metamask/connect-evm": { browser: "./lib/empty-module.js" },
      "porto": { browser: "./lib/empty-module.js" },
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      "@base-org/account": false,
      "@coinbase/wallet-sdk": false,
      "@metamask/connect-evm": false,
      "accounts": "viem/accounts",
      "porto": false,
      "porto/internal": false,
    };
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      ws: false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/api-demo", destination: "/docs", permanent: true },
      { source: "/become-provider", destination: "/docs", permanent: true },
      { source: "/marketplace", destination: "/dashboard", permanent: true },
      { source: "/playground", destination: "/dashboard", permanent: true },
      { source: "/subscribe/:path*", destination: "/dashboard", permanent: true },
    ];
  },
};

export default nextConfig;
