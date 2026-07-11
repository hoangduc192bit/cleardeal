const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"} https:`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
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
      "@walletconnect/ethereum-provider": { browser: "./lib/empty-module.js" },
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      "accounts": "viem/accounts",
      "@walletconnect/ethereum-provider": false,
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
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/@circle-fin/**/*",
      "./node_modules/@noble/**/*",
      "./node_modules/@scure/**/*",
      "./node_modules/@solana/**/*",
      "./node_modules/@x402/**/*",
      "./node_modules/@coral-xyz/**/*",
      "./node_modules/@ethersproject/**/*",
      "./node_modules/cli-table3/**/*",
      "./node_modules/qrcode/**/*",
      "./node_modules/node-forge/**/*",
      "./node_modules/pino/**/*",
      "./node_modules/semver/**/*",
      "./node_modules/rpc-websockets/**/*",
      "./node_modules/zod/**/*",
      "./node_modules/viem/**/*",
      "./node_modules/abitype/**/*",
      "./node_modules/bn.js/**/*",
      "./node_modules/bs58/**/*",
      "./node_modules/json-schema-faker/**/*",
      "./node_modules/isows/**/*",
      "./node_modules/ws/**/*",
      "./node_modules/ox/**/*",
      "./node_modules/string-width/**/*",
      "./node_modules/strip-ansi/**/*",
      "./node_modules/ansi-regex/**/*",
      "./node_modules/is-fullwidth-code-point/**/*",
      "./node_modules/eastasianwidth/**/*",
    ],
  },
};

export default nextConfig;
