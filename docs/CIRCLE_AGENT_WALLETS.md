# Circle Agent Wallet Integration

ArcStream should not compete with Circle Agent Marketplace as "another x402 catalog".
The sharper position is:

> Circle provides the wallet and x402 rails. ArcStream provides the agent brain and the budget guardrails on Arc.

## What is wired now

- `@circle-fin/cli` is installed as a project dev dependency.
- `npm run circle -- --help` exposes Circle wallet, services, gateway, and x402 helpers.
- The research agent accepts `maxBudgetUsdc` and enforces it server-side before each paid tool call.
- The public demo still uses x402 demo headers for tool calls, so it can run without Circle secrets.

## Local Circle CLI setup

The CLI requires Terms acceptance before live commands:

```bash
npm run circle -- terms show
npm run circle -- terms accept
```

For CI or non-interactive shells, Circle supports:

```powershell
$env:CIRCLE_ACCEPT_TERMS="1"
```

Useful commands:

```bash
npm run circle -- blockchain list
npm run circle -- wallet status
npm run circle -- wallet create --help
npm run circle -- wallet fund --help
npm run circle -- services search --help
npm run circle -- services pay --help
```

## Environment placeholders

Keep real values only in `.env.local`:

```text
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_AGENT_WALLET_ID=
CIRCLE_AGENT_WALLET_ADDRESS=
DEFAULT_AGENT_MAX_BUDGET_USDC=0.50
```

Never commit entity secrets, recovery files, mnemonics, private keys, or wallet export files.

## Next implementation step

Replace demo-header tool calls in `agents/research-agent.ts` with Circle-powered x402 payments:

1. Agent chooses a tool from `/api/catalog`.
2. Budget policy checks the projected spend.
3. Circle agent wallet pays the x402 endpoint.
4. ArcStream verifies the Arc USDC receipt.
5. The tool response is written into the report trace.

The contract-level spending cap remains the next on-chain governance upgrade.
