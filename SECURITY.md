# Security Policy

## Supported Status

ArcStream is currently an Arc Testnet on-chain public launch candidate. It is not a mainnet application and has not been professionally audited.

Do not use real funds, production wallets, seed phrases, private keys, or any credential you cannot rotate. The deployed contracts and app are intended to demonstrate the Arc Testnet streaming payment flow only.

## Reporting Security Issues

If you find a security issue, report it privately to the project maintainer before sharing details publicly.

Include:

- A clear description of the issue
- Steps to reproduce
- Affected route, contract, or component
- Potential impact
- Suggested fix, if available

## Demo Scope

- ArcStream runs against Arc Testnet.
- The x402 flow verifies Arc Testnet USDC transfer receipts before unlocking data.
- Production serverless deployments must use durable replay protection for x402 transaction hashes.
- The smart contracts have not received a professional security audit.
- The app makes no mainnet, custody, audited, or real-funds safety claims.

## Private Key Safety

- Never commit `.env`, `.env.local`, private keys, deployer keys, seed phrases, API keys, or WalletConnect secrets.
- Never place private keys or server secrets in `NEXT_PUBLIC_*` variables.
- Do not add `DEPLOYER_PRIVATE_KEY` to Vercel for the demo frontend.
- Rotate any secret immediately if it is exposed in logs, screenshots, commits, or deployment settings.

## Production Readiness

ArcStream should not be positioned as mainnet-ready or real-funds safe until dependency audit findings are resolved, the smart contracts are professionally reviewed, deployed wallet flows are manually tested, durable x402 replay protection is configured, and production monitoring/incident processes are in place.
