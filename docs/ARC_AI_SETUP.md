# Arc AI Setup

Arc publishes two AI-facing resources that fit ArcStream directly:

- Circle Skills for Arc and Circle workflows
- Arc Docs MCP for live documentation search and page retrieval

## Skills

Arc's AI skills page points to Circle's open-source skills for Arc, USDC, agent wallets, x402 payments, Gateway, CCTP, and smart contracts.

Installed locally for this machine:

- `use-arc`
- `use-circle-cli`
- `use-agent-wallet`
- `fund-agent-wallet`
- `pay-via-agent-wallet`
- `agent-wallet-policy`

These match ArcStream's current direction: Circle agent wallet payments, x402 tool calls, and budget governance.

## MCP

Arc Docs MCP is hosted at:

```text
https://docs.arc.io/mcp
```

It exposes:

- Search documentation snippets
- Get full documentation pages

Project-level VS Code/Copilot config is in `.vscode/mcp.json`.

For other MCP clients, add an HTTP MCP server named `arc-docs` with this URL:

```text
https://docs.arc.io/mcp
```

## Why this matters for ArcStream

ArcStream now has the right official rails:

- Arc Testnet chain config: `5042002`
- Circle agent wallet on Arc Testnet
- x402 USDC payment verification
- Arc/Circle skills available locally
- Arc docs MCP config available for IDEs that support project MCP files

Next technical step: replace remaining research-agent demo headers with Circle agent wallet payments, using the budget policy before each paid call.
