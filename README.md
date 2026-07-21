# ClearDeal

ClearDeal is a clearing and assurance network for autonomous commerce. Participants commit machine-readable USDC obligations, providers post performance bonds, independent verifiers clear signed evidence, and `ClearDealClearingHouse` settles only the final net positions on Arc Testnet.

ClearDeal is an independent product built on Arc. Arc is the settlement infrastructure and does not imply endorsement by Circle.

## Release truth

- Real wallet signatures and Arc Testnet contract reads/writes; no browser-only financial state.
- Role-indexed cycles for economic participants, verifiers, and arbitrators.
- Shareable Clearing Room and role-bound invite links that load public cycle state before wallet connection.
- Provider USDC performance bonds with pass return and failure slashing.
- Wallet-signed public metadata and evidence stored in durable KV and anchored by `bytes32` hashes.
- Configurable verifier quorum plus independent arbitrator deadlock resolution.
- Multilateral net positions calculated from passed obligations only.
- Exact net-debtor funding followed by one batch settlement transaction.
- Fail-closed deadlines and onchain debtor default history.
- Risk passports derived from settled/defaulted contract state.
- Browser reads use a rate-limited, read-only RPC proxy plus bounded retry/queue behavior; wallet providers still own transaction signing.
- Arc Testnet only. Faucet USDC has no real-world value.
- Custom contracts are tested and source-verified, but not professionally audited.

## Clearing lifecycle

```text
Creator signs public cycle terms
  -> creates participant, verifier, and obligation graph onchain
  -> providers post USDC performance bonds
  -> providers sign and submit evidence references
  -> independent verifiers reach pass/fail quorum
  -> arbitrator can resolve a verifier deadlock
  -> contract removes failed obligations and computes net positions
  -> net debtors fund only the calculated difference
  -> one transaction pays net creditors and distributes bonds
  -> risk passports record passes, failures, funding, slashing, and defaults
```

Example: A owes B 100 USDC, B owes C 90, and C owes A 80. Cleared gross is 270 USDC; the final net debit is 20 USDC, saving 250 USDC of settlement liquidity.

A public six-wallet Arc Testnet run completed the same topology at smaller test amounts: [Cycle #0](https://cleardeal-app.vercel.app/dashboard?cycle=0) cleared `0.27 USDC` gross into `0.02 USDC` net settlement and saved `0.25 USDC` of liquidity.

## Arc configuration

- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Canonical USDC: `0x3600000000000000000000000000000000000000`
- ClearingHouse: `0x0B917A65F186cbf1Cb59694695f4930B16bcAAf4`
- Deployment block: `52623933`
- Verified source: [ArcScan](https://testnet.arcscan.app/address/0x0B917A65F186cbf1Cb59694695f4930B16bcAAf4#code)

Use the canonical 6-decimal ERC-20 view for balances, approvals, bonds, and settlement. Arc gas uses the 18-decimal native view of the same underlying USDC balance; never add the two views.

## Required configuration

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.example
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_CLEARING_HOUSE_ADDRESS=0x0B917A65F186cbf1Cb59694695f4930B16bcAAf4
NEXT_PUBLIC_CLEARING_DEPLOYMENT_BLOCK=52623933
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
```

Deployment values remain server-only:

```bash
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
DEPLOYER_PRIVATE_KEY=0x...
USDC_ADDRESS=0x3600000000000000000000000000000000000000
```

Never commit `.env`, wallet keys, or provider tokens.

## Development and verification

```bash
npm install
npm run dev
npm run lint
npm run build
npm run test:contracts
npm run qa:cleardeal
npm run e2e:clearing:testnet
```

The E2E command is dry-run by default. `CLEARDEAL_E2E_EXECUTE=true` enables one public Arc Testnet run with a hard funding cap; `CLEARDEAL_E2E_CYCLE_ID=<id>` safely resumes a matching interrupted run. It must never be used on mainnet.

Deploy a new Testnet instance only after reviewing the gas preview and funding a dedicated deployer with faucet USDC:

```bash
npm run deploy:clearing:testnet
```

`GET /api/health` verifies RPC reachability, canonical USDC, deployed ClearingHouse bytecode and USDC binding, app URL, and durable signed-record storage. It returns `503` until every production dependency is ready.

## Security boundary

- Wallets retain all signing authority; the server never receives private keys.
- Metadata/evidence signatures publish public records but cannot move USDC.
- `/api/arc-rpc` permits only read and estimation methods, rejects raw transaction submission, and applies durable per-IP rate limits.
- Bonds and net-position deposits are held by the contract, not the web server.
- Every token approval and contract write requires explicit wallet confirmation and a successful receipt.
- Arc Privacy is roadmap only and is never represented as a live confidentiality feature.
- A professional Solidity audit, legal review, incident plan, and mainnet-specific deployment are required before valuable assets.
