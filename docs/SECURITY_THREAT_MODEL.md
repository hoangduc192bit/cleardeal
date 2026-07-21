# ClearDeal Security Threat Model

## Product boundary

ClearDeal coordinates verification-gated USDC obligations on Arc Testnet. The
`ClearDealClearingHouse` contract escrows provider bonds, calculates net
positions for passed obligations, collects exact net debits, and distributes
USDC after settlement or default.

Human-readable metadata and evidence attachments are stored offchain. Their
canonical hashes are wallet-signed and anchored to the onchain cycle or
obligation. The contract proves integrity and settlement state; it does not
prove that an offchain statement is factually true.

## Assets to protect

- USDC performance bonds held by the clearing contract.
- USDC net funding held between funding and settlement/default.
- Cycle, obligation, evidence, vote, and settlement integrity.
- Wallet-signed metadata and evidence authorization records.
- Availability and privacy expectations for public Testnet evidence.

## Roles and trust

| Role                | Allowed actions                                                                                 | Trust assumption                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Creator/participant | Create a cycle, post a provider bond, or fund a negative net position when assigned             | Wallet keys remain with the user; participation in a cycle does not itself approve or transfer USDC |
| Provider            | Post the exact bond and submit one non-zero evidence hash                                       | The provider controls its wallet and understands that rejected or timed-out work can slash the bond |
| Verifier            | Cast one immutable vote per obligation                                                          | Verifiers are independent from participants and the arbitrator                                      |
| Arbitrator          | Resolve any submitted obligation while the cycle is active                                      | This is a deliberately trusted role and can override an unfinished verifier process                 |
| Public caller       | Close a finalizable cycle, settle a fully funded cycle, or default an expired underfunded cycle | These transitions are permissionless because their outcomes are deterministic                       |
| Metadata store      | Preserve signed public records and attachments                                                  | Store compromise can affect availability, but hash/signature checks must expose tampering           |

## Security invariants

1. The sum of all participant net positions in a closed cycle is zero.
2. Total net debit is never greater than cleared gross.
3. A passed obligation contributes exactly one payer debit and one provider
   credit of the same amount.
4. A provider bond can be distributed only once: returned after a passed
   obligation or transferred to the payer after a failed obligation.
5. Settlement is impossible until funded net equals total net debit.
6. Default returns every funded debit before recording unfunded debtors.
7. A settled or defaulted cycle cannot fund, settle, close, vote, or distribute
   balances again.
8. With canonical USDC behavior, the contract balance is zero after successful
   settlement or default.
9. A verifier can cast at most one vote per obligation.
10. No server, creator, or contract administrator can move a wallet's USDC
    without that wallet's ERC-20 approval and transaction signature.

## Primary attack paths

### Unauthorized fund movement

All incoming USDC uses `safeTransferFrom` after an allowance from the economic
wallet. Outgoing USDC follows finalized accounting and is protected by
checks-effects-interactions plus `ReentrancyGuard` on every externally reachable
money-moving state transition.

### Double voting or double settlement

Votes are stored per verifier, cycle, and obligation. Obligation and cycle
statuses are monotonic, so a finalized obligation and a settled/defaulted cycle
cannot re-enter an earlier state.

### Malicious or unavailable evidence

Evidence truth is decided by verifiers/arbitrator, not by the hash itself.
Attachment bytes are public Testnet data stored offchain. The application
recomputes SHA-256 and rejects bytes that do not match the wallet-signed
descriptor. Availability still depends on the configured durable store.

### RPC or metadata API abuse

The browser RPC proxy permits read-only JSON-RPC methods, limits body size,
rate-limits by client IP, and cannot submit raw transactions. Metadata/evidence
writes require fresh wallet signatures, one-time request IDs, state/role checks,
and durable rate-limit storage in production.

## Known trust and liveness risks

- The arbitrator is intentionally powerful: it may resolve any submitted
  obligation while the cycle remains active, even before verifier quorum. Users
  must choose an independent arbitrator.
- `fundingDeadline` is an absolute timestamp selected at cycle creation. If
  closing is delayed until near or after that timestamp, debtors may receive
  little or no funding window before default becomes callable.
- A creator can include a wallet address as a participant without an onchain
  acceptance signature. This cannot transfer that wallet's funds, but it can
  create unwanted cycle-index entries.
- The contract is immutable and has no owner, pause, upgrade, or arbitrary token
  rescue function. A defect requires a new deployment and application migration.
- Accounting assumes canonical Arc Testnet USDC with exact ERC-20 transfers. A
  fee-on-transfer or rebasing token is outside the supported threat model.
- Block timestamps may vary slightly within validator constraints. Deadlines
  must use operational safety margins and must not depend on second-level
  precision.

## Out of scope for the Testnet release

- Mainnet funds or production legal enforceability.
- Verification of real-world claims without trusted reviewers.
- Confidential evidence storage.
- Compromised user wallets, malicious browser extensions, or phishing.
- Arc consensus, canonical USDC, Vercel, Upstash/KV, and wallet-provider
  vulnerabilities.
- Professional third-party audit or formal verification.
