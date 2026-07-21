# ClearDeal Security Policy

## Supported status

ClearDeal targets Arc Testnet. `ClearDealClearingHouse` is source-verified and covered by automated tests, but has not received a professional audit. Use faucet USDC and disposable test wallets only.

## Security model

Detailed review artifacts:

- [Threat model](docs/SECURITY_THREAT_MODEL.md)
- [Audit-readiness scope and reproducible checks](docs/SECURITY_AUDIT_READINESS.md)

- Participant, verifier, and arbitrator wallets retain their own keys.
- Verifiers and the arbitrator must be independent from economic participants.
- Providers post exact USDC performance bonds before evidence submission.
- Signed public metadata/evidence is canonicalized and hash-matched before storage.
- Passed obligations enter netting; failed obligations cannot create payment liability.
- Net debtors approve and fund only their exact calculated position.
- Missing funding reaches a recoverable `Defaulted` state after the deadline.
- Contract writes require explicit wallet confirmation and a successful Arc receipt.
- Durable KV is mandatory for public human-readable records; writes fail closed without it.
- Browser RPC traffic passes through a read-only method allowlist with request-size limits, per-IP rate limits, upstream retry, and no raw transaction method.

## Reporting a vulnerability

Report issues privately to the maintainer before public disclosure. Include impact, reproduction steps, affected route/contract, relevant transaction hash or block, and a suggested fix when possible. Do not test wallets or data you do not own.

## Secret handling

- Never commit `.env*`, private keys, seed phrases, API keys, or KV tokens.
- Never expose secrets through `NEXT_PUBLIC_*` variables.
- Use a dedicated, minimally funded Testnet deployer.
- The frontend deployment does not need `DEPLOYER_PRIVATE_KEY`.

## Requirements before valuable assets

- professional Solidity and application security audits
- remediation and public source/bytecode verification
- repeatable multi-wallet clearing and default-path E2E testing for every release
- transaction/RPC monitoring and incident response
- contract migration and pause strategy
- legal review of bonding, slashing, arbitration, privacy, and jurisdiction
- confirmed Arc mainnet availability and production addresses

Arc Testnet USDC has no real-world value. Mainnet availability is not implied.
