import { isDurableKvConfigured } from "@/lib/kv-rest";

export const dynamic = "force-dynamic";

function envPresent(name: string) {
  return Boolean(process.env[name]?.trim());
}

function publicConfigPresent(name: string) {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  const checks = {
    appUrl: publicConfigPresent("NEXT_PUBLIC_APP_URL"),
    chainId: publicConfigPresent("NEXT_PUBLIC_CHAIN_ID"),
    usdcAddress: publicConfigPresent("NEXT_PUBLIC_USDC_ADDRESS"),
    streamPaymentAddress: publicConfigPresent("NEXT_PUBLIC_STREAM_PAYMENT_ADDRESS"),
    agentRegistryAddress: publicConfigPresent("NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS"),
    durableKv: isDurableKvConfigured,
    agentRunToken: envPresent("ARCSTREAM_AGENT_RUN_TOKEN"),
    adminToken: envPresent("ARCSTREAM_ADMIN_TOKEN"),
    circleAgentWallet: envPresent("CIRCLE_AGENT_WALLET_ADDRESS"),
  };

  const requiredForPublicLaunch = [
    checks.appUrl,
    checks.chainId,
    checks.usdcAddress,
    checks.streamPaymentAddress,
    checks.agentRegistryAddress,
    checks.durableKv,
    checks.agentRunToken,
  ];

  const ready = requiredForPublicLaunch.every(Boolean);

  return Response.json(
    {
      status: ready ? "ok" : "not_ready",
      ready,
      environment: process.env.NODE_ENV ?? "unknown",
      checks,
      notes: {
        adminToken: checks.adminToken
          ? "configured"
          : "required before enabling deployer-backed wallet policy registration",
        circleAgentWallet: checks.circleAgentWallet
          ? "configured"
          : "required only for paid Circle agent wallet execution",
      },
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
