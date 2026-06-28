# ArcStream

**ArcStream is an autonomous agent orchestration and budget-governance layer on Arc.** AI agents can discover paid tools, compose multi-step research workflows, and consume financial data streams using USDC payments.

Circle provides the wallet and x402 rails. ArcStream adds the agent brain and spend guardrails: tool selection, multi-tool execution, Arc-native settlement proofs, and budget enforcement before each paid call.

The public demo presents two payment models:

1. A real streaming subscription on Arc Testnet, where USDC accrues by the second.
2. An x402-style pay-per-call flow, where an API returns HTTP 402 before verifying an Arc Testnet USDC transfer receipt.

## Problem

AI agents need fresh data, but most data subscriptions are fixed-price, opaque, and designed for humans. ArcStream makes the cost and settlement lifecycle visible: consumers pay for the time or call they use, providers earn for delivered data, and payment outcomes can be verified.

## Key Features

- Marketplace comparison by data type, cost, freshness, and trust score
- Real Pulse Price Feed streaming subscription on Arc Testnet
- User-controlled USDC Approve, Start, and Stop transactions
- Live fee accrual, settlement preview, provider payout, and user refund
- Consumer Agent analysis and Provider Agent earnings views
- Persistent settlement summary with ArcScan proof
- x402 pay-per-call flow with HTTP 402 and Arc Testnet USDC receipt verification
- Server-side research agent with per-run `maxBudgetUsdc` policy enforcement
- Circle CLI workflow for agent wallet setup, service discovery, and x402 payments

## Architecture

```text
Consumer / Agent
  |-- discovers streams --------> Next.js marketplace
  |-- reads unlocked data ------> Pulse Price Feed API
  |-- approves / starts / stops -> StreamPayment.sol on Arc Testnet
  |-- reviews settlement -------> ArcScan

x402 client
  |-- GET without proof --------> HTTP 402 Payment Required
  |-- USDC transfer on Arc -----> x-arcstream-payment-tx header
  |-- GET with tx hash ---------> unlocked response + on-chain receipt

Research agent
  |-- loads budget policy ------> maxBudgetUsdc
  |-- discovers paid tools -----> /api/catalog
  |-- checks projected spend ---> blocks calls over budget
  |-- calls paid tools ---------> x402 demo header today, Circle wallet next
  |-- writes report trace ------> steps + spend + remaining budget
```

## Payment Flows

### Real streaming subscription

User or agent deposits USDC → data unlocks → fee accrues per second → user manually stops stream → provider gets paid → unused USDC is refunded → ArcScan proof is shown.

### x402 pay-per-call

Agent requests API → receives HTTP 402 with price and provider wallet → user authorizes a real USDC transfer on Arc Testnet → server verifies the on-chain transaction receipt (recipient + amount + USDC contract) → data unlocks → report is generated.

The x402 flow verifies Arc Testnet USDC transaction receipts on-chain before unlocking data, with single-use replay protection.

## Real vs Demo

### Real on Arc Testnet

- Pulse Price Feed streaming subscription
- Approve / Start / Stop wallet transactions
- Provider payout and user refund
- ArcScan transaction proof
- Research agent budget policy before paid tool calls

### Preview streams

- Market Sentiment Stream
- Stablecoin Yield Stream
- Wallet Risk Stream
- x402 endpoints requiring Arc Testnet USDC transfer receipts before data unlocks

## Network and Contracts

- Network: Arc Testnet
- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- USDC: `0x3600000000000000000000000000000000000000`
- AgentRegistry: `0xd3624284C138E537465ED99bB1C79eaB9a6Ce140`
- StreamPayment: `0x685D00B7821416F99B21aF31c80D3d3856e072d9`
- [StreamPayment verified source on ArcScan](https://testnet.arcscan.app/address/0x685D00B7821416F99B21aF31c80D3d3856e072d9#code)
- [AgentRegistry verified source on ArcScan](https://testnet.arcscan.app/address/0xd3624284C138E537465ED99bB1C79eaB9a6Ce140#code)
- [Deployment transaction on ArcScan](https://testnet.arcscan.app/tx/0x8a0833cd1796dc7afd4130ddf99b54d0a5a1af72a6eacda8d3be41420013600c)

Full deployment metadata is stored in [`deployments/arcTestnet.json`](deployments/arcTestnet.json).

## Tech Stack

- Next.js 16 (App Router), React 18, TypeScript, Tailwind CSS v4
- wagmi v3, viem (injected/MetaMask wallet connection)
- Framer Motion, Recharts for UI/animation
- Google Gemini (`@google/generative-ai`) for AI tool outputs
- Circle CLI (`@circle-fin/cli`) for agent wallet and x402 service workflows
- Solidity, Hardhat, OpenZeppelin Contracts
- Arc Testnet USDC

## Local Setup

Requirements: Node.js 20+ and a wallet configured for Arc Testnet.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://127.0.0.1:3000`.

For Windows PowerShell, create `.env.local` manually from `.env.example` rather than using `cp`.

## Environment Variables

Public frontend configuration:

```text
NEXT_PUBLIC_CHAIN_ID=5042002
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0xd3624284C138E537465ED99bB1C79eaB9a6Ce140
NEXT_PUBLIC_STREAM_PAYMENT_ADDRESS=0x685D00B7821416F99B21aF31c80D3d3856e072d9
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_APP_URL=https://your-production-testnet-url.example
KV_REST_API_URL=
KV_REST_API_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
X402_MIN_CONFIRMATIONS=1
```

Server/deployment-only variables are documented as empty placeholders in `.env.example`.

**Never commit private keys, `.env`, or `.env.local`. Never place a private key in a `NEXT_PUBLIC_*` variable.**

## Useful Commands

```bash
npm run lint
npm run build
npm run dev
npm run compile:contracts
npm run circle -- --help
npm run circle -- wallet create --help
npm run circle -- services pay --help
```

The x402 endpoint is `GET /api/x402/pulse-price`.

Circle agent wallet notes are in [`docs/CIRCLE_AGENT_WALLETS.md`](docs/CIRCLE_AGENT_WALLETS.md).
Arc AI skills and MCP setup notes are in [`docs/ARC_AI_SETUP.md`](docs/ARC_AI_SETUP.md).

## Vercel Deployment Notes

1. Import this project into Vercel with the project root set to `arcstream`.
2. Add only the documented `NEXT_PUBLIC_*` values required by the frontend.
3. Do not add `DEPLOYER_PRIVATE_KEY`; deployment does not need it.
4. Run `npm run lint` and `npm run build`.
5. Configure Vercel KV or Upstash Redis REST variables for public API rate limiting and x402 replay protection.
6. Verify MetaMask/injected wallet connection, Arc Testnet switching, and all routes after deployment.
7. Verify the serverless x402 endpoint returns HTTP 402 without a payment transaction hash.

Frontend deployment is intentionally not performed by this repository workflow.

## Roadmap

- Add durable database/KV replay protection for x402 transaction hashes
- Replace research-agent demo headers with Circle agent wallet x402 payments
- Add contract-level on-chain spending cap for agent wallets
- Add verifiable reputation and delivery metrics
- Add production-grade price providers and monitoring
