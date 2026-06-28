# ArcStream Launch Copy

## Tagline

Budget-aware agent payments on Arc.

## Short X Post

Introducing ArcStream: a tester-ready agent payment workflow on Arc Testnet.
Agents discover priced tools, stay inside a USDC budget, pay with a Circle Agent
Wallet, and unlock x402 responses with ArcScan-verifiable receipts.

## Longer X Post / Thread Draft

**1/** AI agents should be able to buy tools the same way software calls APIs:
per task, per call, with a clear budget and a receipt.

**2/** ArcStream gives the agent a paid tool catalog with prices, schemas, and
capabilities. The user sets the maximum USDC budget before the run starts.

**3/** The agent checks each tool against its budget policy before spending.
If the call is allowed, a Circle Agent Wallet sends Arc Testnet USDC to the
provider.

**4/** The provider API verifies the x402 payment and returns structured JSON.
The UI shows spend, budget remaining, provider receipts, and ArcScan links.

**5/** The tester playground is live for early feedback: run a research task,
watch the agent pay for tools, and inspect the payment trail.

**6/** Scope is explicit: this is Arc Testnet USDC, not mainnet funds. The
current build proves the agent-wallet and x402 receipt flow; production launch
still needs mainnet policy, provider onboarding, monitoring, and security review.

## 60-Second Demo Script

**0-10 seconds:** Open the landing page. Explain that ArcStream lets autonomous
agents pay for tools with a budget-aware Circle Agent Wallet on Arc.

**10-20 seconds:** Open the tester playground. Show the wallet, budget guard,
tool catalog, and receipt-ready workflow before running the task.

**20-35 seconds:** Start a research task. The agent selects paid tools from the
catalog, checks the per-run budget, and pays for each allowed call.

**35-50 seconds:** Show the live run output: paid tool names, USDC spend,
remaining budget, and x402 payment transaction links.

**50-60 seconds:** Open one ArcScan receipt and close with the product scope:
Arc Testnet proof today, mainnet controls and provider onboarding next.

## Simple Explanation for Non-Technical Viewers

ArcStream is a marketplace where software agents can buy useful API tools
without a subscription. A user gives the agent a task and a spending limit. The
agent pays only for the calls it needs, using test USDC on Arc Testnet, and the
app shows receipts so testers can verify what happened.
