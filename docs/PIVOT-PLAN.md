# ArcStream — Repivot Plan (Circle/Arc agent + governance)

> Single source of truth. Read THIS file first, not the whole repo, to save tokens.

## New positioning (decided)
ArcStream is NOT a competing x402 marketplace (Circle already has `agents.circle.com/services`).
ArcStream = **autonomous agent BRAIN + on-chain budget GOVERNANCE, running on Circle rails (DCW wallets + x402) on Arc.**
> "Circle gives the agent a wallet and a way to pay. ArcStream gives it a brain (plans + composes tools) and reins (on-chain spending cap)."

## Approach: surgical repivot, NOT nuke
Keep the working foundation; delete only the diluting parts; add the Circle layer.

### KEEP (working assets — do not touch)
- Next.js app + glass design system (AppNav/site Nav, all the polished UI)
- x402 on-chain verification (`lib/x402/verify.ts`) — real, working
- Deployed contracts on Arc: StreamPayment `0x685D00B7821416F99B21aF31c80D3d3856e072d9`, AgentRegistry `0xd3624284C138E537465ED99bB1C79eaB9a6Ce140`, USDC `0x3600...0000`
- Tool catalog (`lib/tool-catalog.ts`, 5 Gemini tools) + `/api/tools/*` + `/api/catalog`
- Research Agent (`agents/research-agent.ts`, `components/ResearchAgentDemo.tsx`, `/playground`)
- 3-tab Dashboard, 3-link nav (Home · Marketplace · Try Agent)

### DELETE / DEMOTE (diluting — confirm before deleting)
- Per-second streaming as a *product* — already demoted to Dashboard "Data Streams (advanced)" tab. Decide: keep hidden, or remove `/subscribe`, MiniStreamCard, MeteringWidget, stream-catalog, x402 stream endpoints. (Streaming contract stays deployed; just stop featuring it.)
- "Market Risk Agent" persona (ConsumerAgentPanel) — fold into the generic agent story.

### ADD (the new differentiators)
1. **Circle Developer-Controlled Wallet (DCW)** — agent gets its OWN backend wallet, signs + pays USDC autonomously (no human MetaMask click). This fixes the biggest weakness (autonomy). Pkg: `@circle-fin/developer-controlled-wallets` + CLI `@circle-fin/cli`.
2. **On-chain spending cap** — Solidity contract `AgentBudget` (deposit budget; every tool call check-and-deduct; revert if over). Governance layer Circle marketplace lacks.
3. **x402-batching** (`@circle-fin/x402-batching`) — align settlement with Circle's batching if integrating their marketplace.

## Circle integration — DONE (via Circle CLI agent wallet, not DCW API yet)
User completed the integration using the **Circle CLI** (`@circle-fin/cli`) agent wallet, NOT the DCW API-key route. That is enough for the "agent pays its own way" demo.
- [x] Circle CLI installed (local+global), terms accepted, logged in (mainnet+testnet)
- [x] Provisioned + funded Circle agent wallet on ARC-TESTNET (Circle faucet)
- [x] `.vscode/mcp.json` → https://docs.arc.io/mcp ; `docs/ARC_AI_SETUP.md` added
- [x] Adapter `lib/circle-agent-wallet.ts` — shells out to `circle wallet transfer` (reads `CIRCLE_AGENT_WALLET_ADDRESS`, `CIRCLE_AGENT_WALLET_CHAIN=ARC-TESTNET` from env)
- [x] Real endpoint `POST /api/agent/x402-pay`; Research agent switched from demo header → real Circle wallet payment
- [x] Catalog-fetch bug fixed (`/api/catalog?maxPrice=0.10` returns all tools, not just analyze)
- [x] **End-to-end VERIFIED**: 3-tool run (analyze+web-intel+report-writer) = real on-chain txHashes, 0.12 USDC under budget. Proof tx: `0xb0c522817994aff549ee6fe5f838dbe2034c8fc824e3a47ea67ebf9b39ca1b3a`
- [x] Playground hero copy → "Agents that pay their own way / Circle agent wallet pays x402 tools under budget policy"

### Remaining (next, in order)
1. [x] **DONE — txHash race fixed** in `lib/circle-agent-wallet.ts`: added `--idempotency-key` (Circle dedupes → safe retry, no double-spend) + retry loop (4 attempts) on incomplete/timeout. Cold-start 3-tool run verified all-pass (txHashes 0x63d1…, 0xde91…, 0x4e14…). UI: per-step txHash → ArcScan links + budget progress bar added to `ResearchAgentDemo`.
2. **Spending cap on-chain** (`AgentBudget.sol` on Arc) — budget currently enforced in-process (`lib/agent-budget.ts`) + shown in UI; making it an on-chain hard cap is the governance upgrade. NOTE: Circle CLI has native `circle wallet limit set/budget` but **mainnet-only** (not usable on ARC-TESTNET) — so a custom Solidity cap is the testnet path.
3. **DCW API-key route** + consider `circle services pay` (native x402 client) — optional later phases; current CLI `wallet transfer` already powers the demo end-to-end.

### Decisions locked
- Streaming: KEEP HIDDEN, do not delete (user chose 'a'). Winning point = Circle agent wallet + x402 + budget.

## Token-saving protocol for future sessions
- Read this file + `MEMORY.md` first. Do NOT re-read the whole repo.
- Make surgical edits, not full-file rewrites.
- One `npm run build` at the very end to verify, not repeatedly.
- Known constraint: dashboard won't render in headless preview (wallet suspense) — verify via build + /playground snapshot.
- Known blocker for prod runtime: Upstash KV unset → `next start` 503s; demo with `npm run dev`.
