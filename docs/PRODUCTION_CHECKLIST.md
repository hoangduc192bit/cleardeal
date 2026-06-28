# Production Launch Checklist

ArcStream can be prepared for a production-grade Arc Testnet launch, but it must not make mainnet, audited, custody, or real-funds safety claims until the contract and dependency blockers below are resolved.

## Security

- [ ] Resolve `npm audit --omit=dev` high vulnerabilities.
- [ ] Resolve or formally accept all remaining production dependency audit findings.
- [ ] Configure `NEXT_PUBLIC_APP_URL` on Vercel so production metadata does not fall back to localhost.
- [ ] Configure Vercel KV or Upstash Redis REST env vars for rate limiting and x402 replay protection.
- [ ] Validate security headers on the deployed Vercel URL.
- [ ] Move CSP from `Content-Security-Policy-Report-Only` to enforced `Content-Security-Policy` after wallet testing.
- [ ] Confirm no `.env`, `.env.local`, deployer keys, private keys, seed phrases, or secrets are committed.
- [ ] Confirm no private keys or deployer keys are configured on Vercel for the demo frontend.
- [ ] Add monitoring and incident response contacts.

## Wallets And Environment

- [ ] Manually test MetaMask injected wallet connection on the deployed Vercel URL.
- [ ] Verify Arc Testnet chain switching.

## Payment Flow

- [ ] Run a deployed Start Stream test with testnet USDC.
- [ ] Run a deployed Stop Stream settlement test.
- [ ] Verify provider payout and user refund values.
- [ ] Verify ArcScan transaction proof links.
- [ ] Verify `/api/x402/pulse-price` returns HTTP 402 without a payment transaction hash.
- [ ] Verify x402 returns HTTP 200 only after a valid Arc Testnet USDC transfer tx hash.
- [x] Add durable x402 replay storage support through Vercel KV / Upstash Redis REST.
- [ ] Confirm the deployed Vercel project has `KV_REST_API_URL` + `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.

## Product QA

- [ ] Test `/`, `/marketplace`, `/dashboard`, `/subscribe/0`, `/api-demo`, and `/how-it-works` on the deployed Vercel URL.
- [ ] Run mobile layout checks for landing, marketplace, dashboard, subscribe, and API demo pages.
- [ ] Re-read README and launch copy to confirm real/demo status is accurate.
- [ ] Keep all public wording as Arc Testnet/on-chain testnet until audit and production review are complete.

## Smart Contracts

- [ ] Complete professional smart contract audit before production/mainnet claims.
- [x] Verify deployed contract source on ArcScan.
- [ ] Add a documented contract upgrade/deployment policy.
- [ ] Rehearse contract incident response for stuck funds, wrong token address, and provider payout errors.
