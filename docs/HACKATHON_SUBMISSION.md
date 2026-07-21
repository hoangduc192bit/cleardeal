# Build on Arc — ClearDeal Submission

## Project

**ClearDeal** is a clearing and assurance network for autonomous commerce. It turns connected USDC payment obligations into verified commercial state, calculates final net positions, and settles only the difference on Arc Testnet.

Primary track: **DeFi**

Live product: https://cleardeal-app.vercel.app/

Public proof: https://cleardeal-app.vercel.app/dashboard?cycle=0

Verified contract: https://testnet.arcscan.app/address/0x0B917A65F186cbf1Cb59694695f4930B16bcAAf4#code

## Checkpoint 2 progress summary

ClearDeal now has a functional Arc Testnet MVP with real wallet signatures, canonical USDC transfers, provider performance bonds, signed evidence, independent verifier quorum, multilateral netting, exact net-debtor funding, batch settlement, and onchain risk history.

We completed a public six-wallet test cycle with three connected obligations. The protocol cleared 0.27 USDC of gross obligations into 0.02 USDC of final settlement, avoiding 0.25 USDC of unnecessary liquidity movement. The full room remains publicly readable as an onchain receipt.

The deployed application includes:

- A shared Clearing Room that loads public contract state before wallet connection.
- Role-bound invitation links for participants, providers, verifiers, and arbitrators.
- USDC performance bonds and failure slashing.
- Wallet-signed metadata and evidence anchored to onchain hashes.
- Independent verifier quorum and arbitrator deadlock resolution.
- Multilateral net-position calculation and one-transaction settlement.
- Fail-closed deadlines, debtor default records, and risk passports.
- A rate-limited read-only Arc RPC proxy and durable signed-record storage.

Current verification status:

- Production Next.js build passes.
- ESLint passes.
- 40 smart-contract and protocol tests pass.
- Production dependency audit reports zero vulnerabilities.
- Deployed desktop, mobile, wallet menu, creation wizard, and Cycle #0 deep link QA pass.
- `/api/health` reports the public deployment ready and verifies Arc RPC, canonical USDC, deployed bytecode, contract USDC binding, application URL, and durable storage.

## Meaningful Arc and USDC use

Arc is the execution and settlement layer rather than a branding-only integration. ClearDeal uses Arc Testnet for contract state, wallet-authorized actions, provider bonds, verification outcomes, net-position funding, batch settlement, and public receipts. Canonical USDC is the obligation, assurance, and settlement asset, while Arc gas is also USDC-denominated.

The key programmable-money flow is:

1. Participants commit a graph of USDC obligations.
2. Providers post USDC performance bonds.
3. Providers sign and submit delivery evidence.
4. Independent verifiers approve or reject each obligation.
5. Failed work is removed and its bond can be slashed.
6. The contract computes each participant's final net position.
7. Net debtors fund only the exact difference.
8. One transaction pays net creditors, returns successful bonds, and updates risk records.

## Release boundaries

- Arc Testnet only; faucet USDC has no real-world value.
- Custom contracts are source-verified and tested but not professionally audited.
- Wallets retain signing authority; the server never receives user private keys.
- Human-readable metadata and evidence are public and accepted only when their signed payload matches the onchain hash.
- Arc Privacy, mainnet settlement, and fully autonomous wallet execution are roadmap capabilities and are not represented as live.

## Final-submission work

- Record the three-minute pitch and end-to-end demo.
- Produce a ClearDeal-specific deck using the verified public cycle as the central proof.
- Rehearse the live flow with dedicated Arc Testnet role wallets.
- Complete a final responsive, security, and public-repository review before the deadline.
