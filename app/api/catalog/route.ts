import { toolCatalog, queryTools } from "@/lib/tool-catalog";
import { PLATFORM_FEE_BPS } from "@/lib/tool-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const capability = searchParams.get("capability") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const maxPrice = searchParams.get("maxPrice") ?? undefined;
  const isNativeParam = searchParams.get("isNative");
  const isNative = isNativeParam === "true" ? true : isNativeParam === "false" ? false : undefined;

  const tools = queryTools({ capability, category, maxPrice, isNative });

  return Response.json({
    tools: tools.map((t) => ({
      id: t.id,
      name: t.name,
      providerName: t.providerName,
      providerWallet: t.providerWallet,
      category: t.category,
      description: t.description,
      capabilities: t.capabilities,
      pricePerCall: t.pricePerCall,
      estimatedLatencyMs: t.estimatedLatencyMs,
      trustScore: t.trustScore,
      status: t.status,
      isNative: t.isNative,
      endpoint: t.endpoint,
      inputSchema: t.inputSchema,
      outputDescription: t.outputDescription,
      usageExample: t.usageExample,
    })),
    total: tools.length,
    network: "Arc Testnet",
    protocol: "x402",
    currency: "USDC",
    meta: {
      platformFeeBps: Number(PLATFORM_FEE_BPS),
      platformFeePercent: "10%",
      allTools: toolCatalog.length,
      filteredTools: tools.length,
    },
  });
}
