import { NextResponse } from "next/server";
import { createWalletClient, http, parseUnits, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "@/config/chain";
import {
  agentBudgetGuardAbi,
  agentBudgetGuardAddress,
  publicClient,
} from "@/lib/contracts";
import { requireServerToken } from "@/lib/server-token";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = requireServerToken(request, "ARCSTREAM_ADMIN_TOKEN", "admin");
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as { agentAddress?: string };
    const agentAddress = body.agentAddress as Address | undefined;

    if (!agentAddress || !/^0x[a-fA-F0-9]{40}$/.test(agentAddress)) {
      return NextResponse.json({ error: "invalid_agent_address" }, { status: 400 });
    }

    if (!agentBudgetGuardAddress) {
      return NextResponse.json({ error: "budget_guard_not_configured" }, { status: 500 });
    }

    const deployerPk = process.env.DEPLOYER_PRIVATE_KEY as Hash | undefined;
    if (!deployerPk) {
      return NextResponse.json({ error: "deployer_key_not_configured" }, { status: 500 });
    }

    const account = privateKeyToAccount(deployerPk);
    const walletClient = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(),
    });

    const dailyLimit = parseUnits("5.0", 6); // 5 USDC limit

    const hash = await walletClient.writeContract({
      address: agentBudgetGuardAddress,
      abi: agentBudgetGuardAbi,
      functionName: "setPolicy",
      args: [agentAddress, dailyLimit, true],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash });
  } catch (error) {
    console.error("Failed to register agent wallet policy:", error);
    return NextResponse.json(
      {
        error: "registration_failed",
        message: "Agent wallet policy registration failed",
      },
      { status: 500 },
    );
  }
}
