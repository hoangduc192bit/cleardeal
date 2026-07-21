# ClearDeal Audit Readiness

## Status

This package is an audit-ready **Arc Testnet candidate**, not a professionally
audited release. It is intended for faucet USDC and disposable Testnet wallets.

## Deployed Testnet reference

- Network: Arc Testnet (`5042002`)
- Clearing contract:
  `0x0B917A65F186cbf1Cb59694695f4930B16bcAAf4`
- Deployment block: `52623933`
- Canonical USDC:
  `0x3600000000000000000000000000000000000000`
- Primary source: `contracts/ClearDealClearingHouse.sol`
- Supporting source: OpenZeppelin `SafeERC20` and `ReentrancyGuard`

Before an external engagement, freeze a clean Git commit and confirm that its
compiler settings and runtime bytecode match the address being audited. The
current working tree must not be used as an audit identifier.

## Audit scope

### In scope

- Cycle creation and role separation.
- Provider bond custody and slashing.
- Evidence hash submission.
- Verifier quorum and arbitrator resolution.
- Net-position calculation.
- Exact debtor funding.
- Settlement and default distributions.
- Risk-passport accounting.
- Public metadata/evidence authorization, replay protection, and integrity.

### Separate application review

- `app/api/arc-rpc`
- `app/api/clearing/metadata`
- `app/api/clearing/evidence`
- `lib/kv-rest.ts`
- `lib/rate-limit.ts`
- Wallet transaction preparation and confirmation in the dashboard.

### Out of scope

- Arc protocol and canonical USDC internals.
- Wallet providers and browser extensions.
- Vercel and KV provider infrastructure.
- Factual correctness of evidence.
- Mainnet readiness, privacy compliance, and legal enforceability.

## Reproducible checks

```bash
npm ci
npm audit --omit=dev
npm run compile:contracts
npm run test:contracts
npm run test:contracts:coverage
npm run lint
npm run build
```

Slither is run from an isolated environment so it does not add vulnerable or
stale analysis packages to the production dependency graph:

```bash
python -m venv .tmp/slither
.tmp/slither/Scripts/python -m pip install slither-analyzer
.tmp/slither/Scripts/slither . --compile-force-framework hardhat \
  --exclude-dependencies --fail-high
```

## Static-analysis triage

Slither `0.11.5` analyzed 15 contracts with 101 detectors.

- No `High` or `Critical` detector finding was reported.
- Five `Medium` `uninitialized-local` findings are false positives under
  Solidity semantics: local value types initialize to `false` or zero before
  accumulation.
- Timestamp findings are expected because evidence, funding, and refund
  deadlines are explicit protocol rules. Timestamp precision is not used for
  randomness or pricing.
- The mixed pragma finding is dependency noise from OpenZeppelin interfaces.
- `createCycle` complexity is acknowledged and covered through boundary,
  authorization, and invariant tests.
- The Solidity `0.8.20` warning is retained for the deployed-bytecode scope.
  The listed compiler bugs require language patterns that these contracts do
  not use. Any compiler upgrade creates a new bytecode candidate and must be
  redeployed and re-reviewed rather than silently changing the audit target.

## Security regression coverage

The invariant suite exercises multiple deterministic obligation graphs and
checks:

- net positions sum to zero;
- total debit never exceeds cleared gross;
- contract custody equals bonds plus funded debits before settlement;
- no residual contract USDC remains after settlement/default;
- total participant USDC is conserved;
- partial funding is fully refunded on default;
- unfunded debtors receive default history;
- unresolved work cannot close before the evidence deadline;
- timed-out provider bonds are slashed deterministically;
- terminal cycles cannot settle or fund twice.

The latest local `solidity-coverage` run reports:

- all contracts: `99.53%` statements, `74.81%` branches, `97.22%` functions,
  `99.62%` lines;
- `ClearDealClearingHouse`: `100%` statements, `92.59%` branches, `100%`
  functions, `100%` lines;
- `ClearDealEscrow`: `100%` statements, `100%` functions, `100%` lines.

The legacy `ClearDealEscrow` branch coverage is `48.15%`; it is not used by the
current clearing workspace and should be scoped separately if retained.
Coverage alone is not treated as proof of protocol correctness.

## External auditor handoff checklist

1. Freeze a clean source commit and tag.
2. Record compiler, optimizer, `viaIR`, dependency lockfile, chain ID, token, and
   constructor arguments.
3. Reproduce tests, coverage, dependency audit, and Slither output.
4. Review every accepted-risk item in `SECURITY_THREAT_MODEL.md`.
5. Decide whether arbitrator power and absolute funding deadlines are acceptable
   or require a new contract version.
6. Publish findings with severity, remediation commit, and retest status.
7. Verify the final source and bytecode on ArcScan.

## Release gates before valuable assets

- Independent Solidity audit and remediation.
- Application/API security assessment.
- Public source/bytecode verification for the exact audited build.
- Incident response, monitoring, migration, and pause strategy.
- Privacy and legal review for evidence, arbitration, bonding, and slashing.
- Mainnet-specific Arc and Circle addresses confirmed from official sources.
