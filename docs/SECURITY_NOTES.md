# Security Notes

Last reviewed: 2026-07-11

ArcStream is hardened for a production-grade Arc Testnet public launch. It is not mainnet-ready and must not be treated as audited real-funds production software.

## Dependency Audit

Command run:

```bash
npm audit --omit=dev
```

Current production result:

- `npm audit --omit=dev` returns 0 vulnerabilities.
- `npm audit fix` updated the dependency tree to resolve the remaining production `form-data` advisory.

Full `npm audit` still reports dev/tooling findings through Hardhat, Solidity coverage, Mocha, and related contract-development packages. Those findings are not present in the production dependency audit and should be handled in a dedicated contract-tooling upgrade pass.

## Remaining Development Tooling Findings

Full dependency audit still reports findings in dev dependencies such as:

- `hardhat`
- `solidity-coverage`
- `mocha`
- `lodash`
- `serialize-javascript`
- `tmp`
- `undici`
- `cookie`
- `bn.js`
- `elliptic`

Do not run `npm audit fix --force` casually. The suggested fixes require a breaking Hardhat/tooling migration and should be tested separately from the frontend production launch.

## Paid Agent Route Guards

Paid or deployer-backed agent routes are gated by server-side tokens:

- `POST /api/agent/x402-pay` requires `ARCSTREAM_AGENT_RUN_TOKEN`.
- `POST /api/agent/research` requires `ARCSTREAM_AGENT_RUN_TOKEN` when `paymentMode` is `paid` or an agent private key is supplied.
- `POST /api/agent/orchestrate` requires `ARCSTREAM_AGENT_RUN_TOKEN` when `executePaid` is enabled.
- `POST /api/agent/wallet/register` requires `ARCSTREAM_ADMIN_TOKEN` before it can use `DEPLOYER_PRIVATE_KEY`.

Public research runs use `paymentMode: "demo"`; public Marketplace runs are planning-only. Neither path spends Circle wallet funds. Telegram credentials are accepted only from server environment variables.

Internal callbacks use the configured `NEXT_PUBLIC_APP_URL`, never a caller-controlled `Origin` header. Production refuses callbacks when that URL is missing or is non-HTTPS.

## Security Headers

Baseline headers are configured in `next.config.mjs`.

Enforced:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security` in production only

CSP is enforced as `Content-Security-Policy` in production and remains report-only in local development. Production excludes `unsafe-eval`; inline scripts and styles remain allowed for Next.js and wallet connector compatibility and should be tightened further with a nonce-based policy in a future pass.

## Contract Tests

`npm run test:contracts` covers the testnet product's core financial invariants:

- daily budget enforcement and reset
- replayed payment ID rejection
- inactive and paused policy rejection
- streaming escrow settlement and refunds
- settlement capped at the subscriber deposit
- USDC escrow rescue prevention
- permissionless provider registration and owner-only moderation

## WalletConnect

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` no longer falls back to a fake demo value. If the variable is missing, WalletConnect QR/mobile connectors are disabled and injected wallets such as MetaMask remain available.

Set a real `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in Vercel before wider public sharing.

## x402 On-chain Verification

The x402 endpoints verify Arc Testnet USDC transfer receipts on-chain before unlocking data.

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
