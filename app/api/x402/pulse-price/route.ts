import { fetchPriceFeed } from "@/agents/price-agent";
import { verifyTransactionOnChain } from "@/lib/x402/verify";
import { hashX402Data } from "@/lib/x402/hash";
import type {
  X402PaymentRequired,
  X402UnlockedResponse,
} from "@/lib/x402/types";
import { demoAgents } from "@/lib/demo-agents";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const X402_PAYMENT_HEADER = "x-arcstream-payment-tx";
const X402_PRICE_USDC = "0.0001"; // 0.0001 USDC
const PROVIDER_WALLET = demoAgents[0].wallet as `0x${string}`; // Pulse Price Feed wallet

export async function GET(request: Request) {
  const limited = await rateLimit(request, {
    key: "x402:pulse-price",
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
      service: "Pulse Price Feed API",
      instructions: `Please transfer ${X402_PRICE_USDC} USDC to ${PROVIDER_WALLET} on Arc Testnet, then retry with the ${X402_PAYMENT_HEADER} header containing your transaction hash.`,
      demoMode: false,
      verification: "onchain_transfer_receipt",
      paymentHeader: X402_PAYMENT_HEADER,
    };
    return Response.json(response, { status: 402 });
  }

  try {
    const feed = await fetchPriceFeed();
    const payload = {
      prices: feed.prices,
      timestamp: feed.timestamp,
      provider: "Pulse Price Feed Agent" as const,
    };
    const response: X402UnlockedResponse = {
      service: "Pulse Price Feed API",
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
    return Response.json({ error: "price_feed_unavailable" }, { status: 502 });
  }
}
