"use client";

import { useReadContract } from "wagmi";
import type { Address } from "viem";

import { agentRegistryAbi, agentRegistryAddress } from "@/lib/contracts";

export function useAgentRegistry() {
  return useReadContract({ address: agentRegistryAddress, abi: agentRegistryAbi, functionName: "getAllAgents" });
}

export type RegistryAgent = readonly [Address, string, string, string, bigint, boolean];
