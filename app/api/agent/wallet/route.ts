import { NextResponse } from "next/server";
import { formatUnits, type Address } from "viem";

import {
  agentBudgetGuardAbi,
  agentBudgetGuardAddress,
  erc20Abi,
  publicClient,
  usdcAddress,
} from "@/lib/contracts";

export const dynamic = "force-dynamic";

export async function GET() {
  const address = process.env.CIRCLE_AGENT_WALLET_ADDRESS as Address | undefined;
  const chain = process.env.CIRCLE_AGENT_WALLET_CHAIN ?? "ARC-TESTNET";

  if (!address) {
    return NextResponse.json(
      { error: "CIRCLE_AGENT_WALLET_ADDRESS is not configured" },
      { status: 500 },
    );
  }

  const [balanceRaw, guardState] = await Promise.all([
    publicClient.readContract({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    }),
    readGuardState(address),
  ]);

  return NextResponse.json({
    address,
    chain,
    usdc: {
      address: usdcAddress,
      balanceRaw: balanceRaw.toString(),
      balance: formatUnits(balanceRaw, 6),
    },
    budgetGuard: guardState,
  });
}

async function readGuardState(agent: Address) {
  if (!agentBudgetGuardAddress) {
    return {
      configured: false,
      address: null,
      active: false,
      reason: "NEXT_PUBLIC_AGENT_BUDGET_GUARD_ADDRESS is not configured",
    };
  }

  const [policy, remainingRaw] = await Promise.all([
    publicClient.readContract({
      address: agentBudgetGuardAddress,
      abi: agentBudgetGuardAbi,
      functionName: "policies",
      args: [agent],
    }),
    publicClient.readContract({
      address: agentBudgetGuardAddress,
      abi: agentBudgetGuardAbi,
      functionName: "remainingToday",
      args: [agent],
    }),
  ]);

  const [dailyLimitRaw, spentTodayRaw, dayStartedAt, active] = policy;

  return {
    configured: true,
    address: agentBudgetGuardAddress,
    active,
    dailyLimitRaw: dailyLimitRaw.toString(),
    dailyLimit: formatUnits(dailyLimitRaw, 6),
    spentTodayRaw: spentTodayRaw.toString(),
    spentToday: formatUnits(spentTodayRaw, 6),
    remainingTodayRaw: remainingRaw.toString(),
    remainingToday: formatUnits(remainingRaw, 6),
    dayStartedAt: Number(dayStartedAt),
  };
}
