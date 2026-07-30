import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

import { clearDealEscrowAddress } from "@/lib/cleardeal-contract";

export const isClearDealAutomationWalletConfigured = Boolean(
  process.env.CIRCLE_API_KEY?.trim() &&
    process.env.ENTITY_SECRET?.trim() &&
    process.env.CIRCLE_WALLET_ID?.trim(),
);

export async function finalizeMilestoneWithCircle(input: {
  dealId: bigint;
  milestoneId: bigint;
  idempotencyKey: string;
}) {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  const entitySecret = process.env.ENTITY_SECRET?.trim();
  const walletId = process.env.CIRCLE_WALLET_ID?.trim();
  if (!apiKey || !entitySecret || !walletId) {
    throw new Error("automation_wallet_not_configured");
  }
  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });
  const created = await client.createContractExecutionTransaction({
    walletId,
    contractAddress: clearDealEscrowAddress,
    abiFunctionSignature: "finalizeMilestone(uint256,uint256)",
    abiParameters: [input.dealId.toString(), input.milestoneId.toString()],
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
    idempotencyKey: input.idempotencyKey,
    refId: `cleardeal-finalize-${input.dealId}-${input.milestoneId}`,
  });
  const transactionId = created.data?.id;
  if (!transactionId) throw new Error("circle_transaction_not_created");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);
  try {
    const transaction = await client.getTransaction({
      id: transactionId,
      waitForTxHash: true,
      pollingInterval: 1_500,
      signal: controller.signal,
    });
    return {
      transactionId,
      txHash: transaction.data.transaction.txHash,
    };
  } catch {
    return { transactionId, txHash: undefined };
  } finally {
    clearTimeout(timeout);
  }
}
