# ArcStream Product Spec

## Source Audit

The real ArcStream repository is:

`D:\CODING\arcstream`

The previous folder at `D:\CODING\panda-print-os\arcstream` was not the real product source. It only contained a temporary static `ArcStream Pay` prototype and should not drive product decisions.

## Current Product Reality

ArcStream is already a Next.js product with:

- Landing page at `app/page.tsx`
- Dashboard at `app/dashboard/page.tsx`
- Interactive dashboard client at `app/dashboard/dashboard-client.tsx`
- Marketplace at `app/marketplace/page.tsx`
- Playground at `app/playground/page.tsx`
- Agent APIs under `app/api/agent`
- Paid tool APIs under `app/api/tools`
- x402 endpoints under `app/api/x402`
- Arc Testnet contracts under `contracts`
- Agent wallet and budget logic under `lib`

The README defines the product as:

ArcStream is an autonomous agent orchestration and budget-governance layer on Arc. AI agents can discover paid tools, compose multi-step research workflows, and consume financial data streams using USDC payments.

## Product Direction

ArcStream should be positioned as:

**An agent workflow and paid-tool orchestration layer on Arc.**

The product is not a generic payment dashboard.

Payments, USDC, x402, Circle wallets, and Arc settlement proofs are infrastructure rails that make the agent workflows possible. They should support the product story, not become the whole product story.

## Core Product Promise

Users give an AI agent a task and a budget. ArcStream lets the agent discover tools, choose the right paid services, enforce spend limits, call those tools through x402 or Arc-native rails, verify receipts, and return a structured report.

## Primary User

Target user:

- Builder or operator who wants autonomous agents to perform paid research, data access, monitoring, or reporting tasks without manually managing API keys and billing accounts.

Secondary user:

- Tool/data provider who wants agents to pay per call or per stream.

## Product Pillars

### 1. Agent Tool Console

The primary experience should show how agents choose tools, spend within budget, and produce useful outputs.

Must show:

- User objective
- Selected agent
- Tool plan
- Budget policy
- Tool calls
- Spend used
- Remaining budget
- Output report
- Receipt/proof status

### 2. Workflow Builder

Workflow creation should be a first-class product surface.

Must support:

- Workflow name
- Trigger
- Objective
- Agent role
- Allowed tools
- Max budget
- Review policy
- Delivery channel
- Status

Recommended statuses:

- Draft
- Ready
- Running
- Needs review
- Completed
- Failed

Avoid `Active` unless there is a real background worker.

### 3. Agent Wallet And Budget Governance

Agent wallets are not the product headline, but they are important infrastructure.

Must show:

- Agent wallet status
- Budget guard status
- Spend cap
- Remaining spend
- Tool permissions
- Funding readiness

Copy should make it clear when something is:

- Real on Arc Testnet
- Demo-only
- Preview
- Not connected

### 4. x402 Paid Tools

x402 is one of the strongest product surfaces.

Must show:

- HTTP 402 flow
- Tool price
- Provider wallet
- Payment proof or demo proof
- Unlock result
- Replay-protection state if applicable

The app should not imply Circle Marketplace or Circle agent wallets are fully live unless the code path actually performs that flow end to end.

### 5. Data Streams

Data streams are an advanced mode, not the entire product.

Must show:

- Stream marketplace
- Price per second
- Deposit
- Live accrual
- Stop and settle
- Provider payout
- Refund
- ArcScan proof

This should be presented as one capability inside ArcStream, not as the only product.

### 6. Provider Tools

Providers should understand how their tools become agent-callable.

Must show:

- Service/tool listing
- Category
- Price
- Trust score
- Latency
- Endpoint style
- Connection status
- Earnings or usage preview

## Navigation Recommendation

Recommended top-level routes:

- Home
- Dashboard
- Marketplace
- Playground
- Docs

Recommended dashboard tabs:

- AI Tools
- Workflows
- Agent Wallets
- Data Streams
- Provider
- Proofs

## Current UI Risk

The existing repo has the correct product foundation, but some copy can over-center payment language.

Risky framing:

- "payment layer for AI agents"
- "agents can pay for their own tools" as the only headline
- dashboards that lead with deposits, streams, settlements, or USDC balances

Better framing:

- "Agents can run paid workflows with enforced budgets"
- "Give an agent a task, a tool budget, and a verifiable run trail"
- "ArcStream turns paid APIs into agent-callable tools"

## What To Build Next

The next product pass should improve the actual `D:\CODING\arcstream` app, not the temporary static prototype.

Priority:

1. Add or improve a workflow-focused dashboard surface.
2. Make `AI Tools` the default product story.
3. Keep data streams as an advanced tab.
4. Make provider mode clearly separate.
5. Add stronger workflow cards showing objective, trigger, agent, tools, budget, delivery, and status.
6. Make all preview/live/demo states explicit.
7. Keep Arc Testnet and x402 claims honest.

## Definition Of Done

The next implementation is acceptable when:

- The product reads as agent workflow orchestration, not a payment dashboard.
- The dashboard has a clear workflow or agent-run overview.
- A user can understand what the agent did, which tools it used, how budget was enforced, and what output was produced.
- Payment language supports the agent workflow story instead of replacing it.
- Data streams remain available but are not the only mental model.
- Preview integrations are labeled as preview.
- `npm run lint` passes.
- `npm run build` passes or any failure is documented precisely.
