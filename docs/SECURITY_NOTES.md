# Security Notes

Last reviewed: 2026-06-07

ArcStream is hardened for an Arc Testnet on-chain public launch. It is not mainnet-ready and must not be treated as audited real-funds production software.

## Dependency Audit

Command run:

```bash
npm audit --omit=dev
```

Current result after attempting non-breaking fixes:

- 37 production audit findings remain
- 27 high severity findings
- 10 moderate severity findings

`npm audit fix --omit=dev --legacy-peer-deps` was attempted. It did not resolve the remaining issues without breaking upgrades.

## Remaining Findings

### Next.js

- Package: `next@14.2.35`
- Severity: high
- Status: unresolved
- Reason: npm reports the fix path as `npm audit fix --force`, which would install `next@16.2.7`. That is a major framework upgrade from Next 14 to Next 16 and needs a dedicated migration/test pass.

The current app does not configure `next/image` remote patterns, rewrites, middleware, or i18n, which reduces exposure to several listed advisories, but the package-level audit finding still remains.

### Lodash

- Package: `lodash@4.17.21`
- Severity: high
- Status: unresolved in audit output
- Reason: ArcStream source does not import lodash directly. The dependency appears through development tooling, primarily Hardhat-related packages, but npm audit still reports it in the installed tree.

Do not add direct runtime lodash usage. Re-check this after future Hardhat/tooling updates.

### Additional Transitive Production Findings

- Packages: `form-data`, `hono`
- Severity: high
- Status: unresolved in audit output
- Reason: these are pulled through the current dependency tree, primarily wallet/appkit-related packages. `npm audit fix` did not resolve them without leaving the same wallet-stack blockers.

### Wallet Dependency Chain

- Packages: `wagmi`, `@wagmi/connectors`, `@walletconnect/*`, `@reown/*`, `@metamask/*`, transitive `uuid`, `ws`, and nested `viem`
- Severity: moderate
- Status: unresolved
- Reason: npm reports the fix path as `npm audit fix --force`, with breaking changes to the wallet stack. Depending on npm resolution, the suggested path can downgrade or major-upgrade `wagmi`/`viem`, which can break wallet connectors.

Current checked latest compatible versions:

- `@rainbow-me/rainbowkit@2.2.11`
- `wagmi@2.19.5`
- `viem@2.52.2`

These are already at the latest versions available in their current compatible line at the time of review.

## Security Headers

Baseline headers are configured in `next.config.mjs`.

Enforced:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security` in production only

CSP is currently `Content-Security-Policy-Report-Only` to avoid breaking wallet connectors, WalletConnect, Arc RPC, Vercel scripts, and inline styles during demo launch. After deployed wallet testing, tighten and enforce CSP.

## WalletConnect

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` no longer falls back to a fake demo value. If the variable is missing, WalletConnect QR/mobile connectors are disabled and injected wallets such as MetaMask remain available.

Set a real `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in Vercel before wider public sharing.

## x402 On-chain Verification

The x402 endpoints now verify Arc Testnet USDC transfer receipts on-chain before unlocking data.

Current safeguards:

- transaction hash format validation
- Arc Testnet receipt lookup
- successful receipt status check
- minimum confirmation check via `X402_MIN_CONFIRMATIONS` (default: 1)
- exact USDC token address, receiver, and amount matching
- replay prevention through durable Vercel KV / Upstash Redis REST when configured
- local filesystem replay fallback only outside production
- API rate limiting through the same durable KV/Redis store in production

Production behavior: if no durable KV/Redis REST environment is configured, x402 verification and public API rate limiting fail closed instead of silently accepting replay risk.

## Launch Positioning

Use only these claims:

- Arc Testnet on-chain public launch
- Testnet USDC only
- x402-style on-chain receipt verification on Arc Testnet
- Smart contracts unaudited

Do not use these claims yet:

- mainnet-ready
- audited
- real-funds safe
- production mainnet settlement
