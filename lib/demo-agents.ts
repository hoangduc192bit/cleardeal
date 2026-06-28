import type { Agent } from "@/components/AgentCard";
import { streamCatalog } from "./stream-catalog";

export const demoAgents: Agent[] = streamCatalog.map((stream, i) => ({
  id: i,
  wallet: stream.providerWallet as `0x${string}`,
  name: stream.name,
  streamType: stream.id.toUpperCase(),
  description: stream.description,
  pricePerSecond: stream.ratePerSecond,
  isActive: true,
}));
