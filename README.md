# ClearDeal

ClearDeal helps an international client pay a Vietnamese team safely, one
approved delivery at a time.

The client creates a project, divides the budget into clear delivery steps,
and deposits the full USDC amount once. The team submits each completed
delivery with a signed note and optional sample files. The client reviews the
result and releases only that step's payment. Unreleased USDC stays in the
verified ClearDeal contract on Arc Testnet.

Example:

```text
Vietnam website launch — 1,000 USDC

Brand design     200 USDC  -> approved and paid
Website build    500 USDC  -> delivered, waiting for the client
Source handoff   300 USDC  -> upcoming
```

This gives both sides a simple promise:

- The client does not pay the whole project before seeing the work.
- The team can see that the complete budget has already been prepared.
- Payment moves directly to the team after the client approves a delivery.
- If there is a serious disagreement, an independent wallet can divide the
  unpaid balance between the two sides.

ClearDeal is an independent product built on Arc. Arc is the settlement
infrastructure and does not imply endorsement by Circle.

## Why Arc

- USDC is both the project money and Arc's network-fee currency, so users do
  not need a second volatile token just to approve or receive payment.
- Each delivery approval becomes a fast, public payment receipt.
- The same stable unit is used for the budget, held balance, and final payout.
- Wallets retain signing authority; the ClearDeal server cannot move funds.
- Circle App Kit can bridge testnet USDC from Base Sepolia or Ethereum Sepolia
  into the client's Arc Testnet wallet before project funding.

## Project flow

```text
Client creates project and delivery steps
  -> client uses Arc USDC or bridges testnet USDC into Arc
  -> client deposits the complete USDC budget
  -> Vietnamese team submits one completed delivery
  -> delivery note and sample files are tied to a wallet signature
  -> client reviews the delivery
  -> client approves and the contract pays that step
  -> remaining USDC stays held for later steps
  -> project completes, refunds the remainder, or enters dispute resolution
```

The primary product is available at `/dashboard`. `/how-it-works` explains the
flow in plain language, and `/docs` describes the public Testnet boundary.

The earlier company-spend and multilateral-clearing proofs remain in the
repository and at their direct routes for historical demonstration, but they
are no longer the main ClearDeal story.

## Arc Testnet configuration

- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Canonical USDC: `0x3600000000000000000000000000000000000000`
- ClearDealEscrow: `0x3488b4612a5ea84d56a5b41ac53ab7616213444a`
- Escrow deployment block: `52593658`
- [Verified ClearDealEscrow on ArcScan](https://testnet.arcscan.app/address/0x3488b4612a5ea84d56a5b41ac53ab7616213444a#code)
- [Completed end-to-end Arc Testnet proof](docs/TESTNET-PROOF.md)

The contract supports project creation, complete-budget funding, delivery
submission, step-by-step release, refunds after a deadline, and independent
dispute resolution.

## Crosschain testnet funding

The project funding screen uses Circle App Kit to bridge **USDC only** from
Base Sepolia or Ethereum Sepolia to the same wallet on Arc Testnet. A browser
wallet or WalletConnect account signs the source-chain transactions. Circle
passkey accounts remain Arc-only in this build.

App Kit currently does not support token swaps on Base Sepolia or Ethereum
Sepolia. ClearDeal displays that limitation instead of presenting a fake
testnet swap. Test ETH and other source-testnet tokens must not be represented
as convertible through this flow.

## Passkey backup and recovery

Circle passkey accounts can register an optional 12-word recovery key on Arc
Testnet. The passkey itself is not exported. The recovery phrase derives a
separate recovery signer that can authorize a new passkey if the original
device credential is lost.

- `Back up wallet` is available only after signing in with a Circle passkey.
- `Lost your passkey?` creates a new passkey from a previously registered
  recovery phrase.
- The phrase is generated and processed in the browser. It is never sent to
  the ClearDeal API, written to local storage, logged, or committed.
- Importing the phrase into a browser wallet shows the recovery signer, not the
  ClearDeal smart-wallet address. Its intended purpose is account recovery.

## Required configuration

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.example
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_CLEARDEAL_ESCROW_ADDRESS=0x3488b4612a5ea84d56a5b41ac53ab7616213444a
NEXT_PUBLIC_CLEARDEAL_DEPLOYMENT_BLOCK=52593658
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_CIRCLE_MODULAR_CLIENT_KEY=...
NEXT_PUBLIC_CIRCLE_MODULAR_CLIENT_URL=...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
```

The Circle values enable the optional passkey sign-in path. If they are not
configured, browser-wallet and WalletConnect paths remain available. The KV
store holds wallet-signed project descriptions and sample delivery files; only
their hashes are tied to the contract.

Server-only deployment values:

```bash
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
DEPLOYER_PRIVATE_KEY=0x...
USDC_ADDRESS=0x3600000000000000000000000000000000000000
```

Never commit `.env`, private keys, or provider tokens.

## Development and verification

```bash
npm install
npm run dev
npm run lint
npm run build
npm run test:contracts
npm run e2e:cleardeal:testnet
```

The Testnet E2E command is a dry run by default: it checks the Arc chain,
deployed escrow bytecode, canonical USDC binding, and the configured public app
without spending funds.

Run the production UI smoke test against a local production build:

```powershell
# Terminal 1
npm run build
npm run start -- -p 3001

# Terminal 2
$env:CLEARDEAL_QA_BASE_URL="http://127.0.0.1:3001"
npm run qa:cleardeal
```

To create a public, end-to-end Arc Testnet proof after deployment:

```powershell
$env:CLEARDEAL_E2E_APP_URL="https://cleardeal-app.vercel.app"
$env:CLEARDEAL_E2E_EXECUTE="true"
npm run e2e:cleardeal:testnet
```

The proof run creates and completes one 0.02 Testnet USDC milestone, plus Arc
network fees. Its transactions are permanent and public on Arc Testnet. Never
commit or print the deployer private key.

Deploy a new Testnet escrow only after reviewing the gas preview and funding a
dedicated deployer with faucet USDC:

```bash
npm run deploy:cleardeal:testnet
```

## Public Testnet boundary

- Arc Testnet USDC has no real-world value.
- Project amounts, wallet addresses, hashes, and payment results are public.
- Upload only sample files without personal, salary, or confidential client
  information.
- The product is not audited for mainnet use.
- Arc Privacy is roadmap only and is not represented as a live feature.
- Real VND bank withdrawal is not included; any VND or VietQR screen remains a
  clearly labeled mock until a licensed partner is integrated.
