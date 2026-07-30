# ClearDeal

ClearDeal helps an international client pay a Vietnamese team safely, one
reviewed delivery at a time.

The client creates a project, divides the budget into clear delivery steps,
and deposits the full USDC amount once. The team submits each completed
delivery with a signed note and optional sample files. The client can approve,
request a limited revision, or open a milestone dispute. If the review window
ends without either objection, that step becomes permissionlessly releasable.
Unreleased USDC stays in the verified ClearDeal contract on Arc Testnet.

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
- Payment moves directly to the team after approval or an objection-free review
  window.
- Revision requests are limited and reset the review clock after resubmission.
- If there is a serious disagreement, an independent wallet decides only the
  disputed milestone instead of freezing the complete project.

ClearDeal is an independent product built on Arc. Arc is the settlement
infrastructure and does not imply endorsement by Circle.

## Why Arc

- USDC is both the project money and Arc's network-fee currency, so users do
  not need a second volatile token just to approve or receive payment.
- Each delivery approval becomes a fast, public payment receipt.
- The same stable unit is used for the budget, held balance, and final payout.
- Wallets retain project authority. A server automation wallet may call only the
  permissionless expiry function; the contract itself prevents early release
  and fixes the recipient and amount.
- Circle App Kit can bridge testnet USDC from Base Sepolia or Ethereum Sepolia
  into the client's Arc Testnet wallet before project funding.

## Project flow

```text
Client creates project and delivery steps
  -> client uses Arc USDC or bridges testnet USDC into Arc
  -> client deposits the complete USDC budget
  -> Vietnamese team submits one completed delivery
  -> delivery note, review preview, and locked clean file are tied to a wallet signature
  -> a 72-hour client review window begins
  -> client approves, requests a bounded revision, or opens a milestone dispute
  -> without an objection, the reconciliation bot or any wallet can finalize
     and the contract pays that exact step
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
- ClearDealEscrowV2: `0x9F95E8Cf6D495F6B1898526D8Bb301b3523560fe`
- Escrow deployment block: `54445308`
- [Verified ClearDealEscrowV2 on ArcScan](https://testnet.arcscan.app/address/0x9F95E8Cf6D495F6B1898526D8Bb301b3523560fe#code)
- [Completed end-to-end Arc Testnet proof](docs/TESTNET-PROOF.md)

The contract supports project creation, complete-budget funding, delivery
submission, bounded revisions, timed release, safe expired refunds, and
independent dispute resolution for each milestone.

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
NEXT_PUBLIC_CLEARDEAL_ESCROW_ADDRESS=0x9F95E8Cf6D495F6B1898526D8Bb301b3523560fe
NEXT_PUBLIC_CLEARDEAL_DEPLOYMENT_BLOCK=54445308
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_CIRCLE_MODULAR_CLIENT_KEY=...
NEXT_PUBLIC_CIRCLE_MODULAR_CLIENT_URL=...
NEXT_PUBLIC_CIRCLE_APP_ID=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
CLEARDEAL_FILE_SECRET=at-least-32-random-characters
```

The Circle values enable the optional passkey sign-in path. If they are not
configured, browser-wallet and WalletConnect paths remain available. The KV
store holds wallet-signed project descriptions and encrypted delivery files;
only their hashes are tied to the contract. Review images receive a viewer
watermark, while clean files require participant authorization and a paid
milestone before download.

The Google values enable Circle User-Controlled Wallet onboarding. A new Google
account creates an SCA on Arc Testnet; signing in again opens the same Circle
wallet. The Circle API key remains server-side, and the short-lived wallet
session is stored in an encrypted, httpOnly cookie. The same Google wallet can
sign project notes and contract actions after returning to the dashboard.

Server-only deployment values:

```bash
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
CIRCLE_API_KEY=...
ENTITY_SECRET=...
CIRCLE_WALLET_ID=...
CLEARDEAL_AUTOMATION_TRIGGER_SECRET=...
RESEND_API_KEY=...
CLEARDEAL_EMAIL_FROM=ClearDeal <notifications@example.com>
DEPLOYER_PRIVATE_KEY=0x... # local deploy/e2e only
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
- Delivery files are encrypted offchain and access-controlled, but this MVP is
  not a DRM system or audited confidential data room. Do not upload personal,
  salary, regulated, or irreplaceable production secrets.
- The product is not audited for mainnet use.
- Arc Privacy is roadmap only and is not represented as a live feature.
- Real VND bank withdrawal is not included; any VND or VietQR screen remains a
  clearly labeled mock until a licensed partner is integrated.
