import { fetchYieldFeed } from "@/agents/yield-agent";
import { verifyTransactionOnChain } from "@/lib/x402/verify";
import { hashX402Data } from "@/lib/x402/hash";
import type { X402PaymentRequired, X402UnlockedResponse } from "@/lib/x402/types";
import { demoAgents } from "@/lib/demo-agents";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const X402_PAYMENT_HEADER = "x-arcstream-payment-tx";
const X402_PRICE_USDC = "0.00015";
const PROVIDER_WALLET = demoAgents[2].wallet as `0x${string}`;

export async function GET(request: Request) {
  const limited = await rateLimit(request, {
    key: "x402:stablecoin-yield",
    limit: 30,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const txHash = request.headers.get(X402_PAYMENT_HEADER);
  let isPaymentValid = false;

  if (txHash) {
    isPaymentValid = await verifyTransactionOnChain(txHash, X402_PRICE_USDC, PROVIDER_WALLET);
  }

  if (!isPaymentValid) {
    const response: X402PaymentRequired = {
      error: "payment_required",
      price: X402_PRICE_USDC,
      currency: "USDC",
      network: "Arc Testnet",
      service: "Stablecoin Yield API",
      instructions: `Please transfer ${X402_PRICE_USDC} USDC to ${PROVIDER_WALLET} on Arc Testnet, then retry with the ${X402_PAYMENT_HEADER} header containing your transaction hash.`,
      demoMode: false,
      verification: "onchain_transfer_receipt",
      paymentHeader: X402_PAYMENT_HEADER,
    };
    return Response.json(response, { status: 402 });
  }

  try {
    const feed = await fetchYieldFeed();
    const payload = {
      ...feed,
      provider: "Yield Radar Agent" as const,
    };
    const response: X402UnlockedResponse = {
      service: "Stablecoin Yield API",
      provider: payload.provider,
      timestamp: payload.timestamp,
      dataHash: hashX402Data(payload),
      receipt: `x402-receipt-onchain-${txHash}`,
      txHash: txHash as `0x${string}`,
      verification: "onchain_verified",
      settlement: "settled_onchain",
      payload,
    };
    return Response.json(response);
  } catch (err) {
    return Response.json({ error: "yield_feed_unavailable" }, { status: 502 });
  }
}
