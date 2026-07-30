import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createPublicClient,
  formatUnits,
  http,
  type Address,
  type Hash,
  type Hex,
} from "viem";

import { arcTestnet } from "@/config/chain";
import {
  finalizeMilestoneWithCircle,
  isClearDealAutomationWalletConfigured,
} from "@/lib/cleardeal-automation";
import {
  clearDealDeploymentBlock,
  clearDealEscrowAbi,
  clearDealEscrowAddress,
} from "@/lib/cleardeal-contract";
import {
  isClearDealEmailConfigured,
  sendClearDealEmail,
} from "@/lib/cleardeal-email";
import { getNotificationContacts } from "@/lib/cleardeal-notifications";
import { isDurableKvConfigured, redisCommand } from "@/lib/kv-rest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const LOCK_KEY = "cleardeal:automation:lock";
const CURSOR_KEY = "cleardeal:automation:event-cursor";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ??
  "https://cleardeal-app.vercel.app";

interface ContractEvent {
  eventName: string;
  args: Record<string, unknown>;
  blockNumber: bigint;
  transactionHash: Hash;
  logIndex: number;
}

function authorized(request: Request) {
  const supplied = request.headers.get("authorization") ?? "";
  const accepted = [
    process.env.CRON_SECRET,
    process.env.CLEARDEAL_AUTOMATION_TRIGGER_SECRET,
  ].filter(Boolean).map((value) => `Bearer ${value}`);
  return accepted.some((candidate) => {
    const left = Buffer.from(supplied);
    const right = Buffer.from(candidate);
    return left.length === right.length && timingSafeEqual(left, right);
  });
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isDurableKvConfigured) {
    return NextResponse.json(
      { error: "automation_store_not_configured" },
      { status: 503 },
    );
  }
  const lock = await redisCommand<string | null>([
    "SET",
    LOCK_KEY,
    crypto.randomUUID(),
    "NX",
    "EX",
    55,
  ]);
  if (lock !== "OK") {
    return NextResponse.json({ status: "already_running" });
  }

  try {
    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(arcTestnet.rpcUrls.default.http[0]),
    });
    const [latestBlock, nextDealId] = await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.readContract({
        address: clearDealEscrowAddress,
        abi: clearDealEscrowAbi,
        functionName: "nextDealId",
      }),
    ]);
    const now = Math.floor(Date.now() / 1_000);
    const releases: Array<Record<string, unknown>> = [];
    const warnings: Array<Record<string, unknown>> = [];

    for (let dealId = 0n; dealId < nextDealId && dealId < 100n; dealId += 1n) {
      const deal = await publicClient.readContract({
        address: clearDealEscrowAddress,
        abi: clearDealEscrowAbi,
        functionName: "deals",
        args: [dealId],
      });
      const metadataHash = deal[6];
      const milestoneCount = deal[10];
      if (deal[12] !== 1) continue;
      const contacts = await getNotificationContacts(metadataHash);

      for (let milestoneId = 0n; milestoneId < milestoneCount; milestoneId += 1n) {
        const milestone = await publicClient.readContract({
          address: clearDealEscrowAddress,
          abi: clearDealEscrowAbi,
          functionName: "milestones",
          args: [dealId, milestoneId],
        });
        const reviewDeadline = Number(milestone[4]);
        if (milestone[7] !== 1 || reviewDeadline === 0) continue;
        const secondsLeft = reviewDeadline - now;

        if (secondsLeft > 0 && secondsLeft <= 86_400 && contacts.clientEmail) {
          const warningKey = `cleardeal:email:warning:${dealId}:${milestoneId}:${reviewDeadline}`;
          const claimed = await redisCommand<string | null>([
            "SET",
            warningKey,
            "1",
            "NX",
            "EX",
            604_800,
          ]);
          if (claimed === "OK") {
            try {
              const result = await sendClearDealEmail({
                to: contacts.clientEmail,
                subject: `ClearDeal review due in ${Math.max(1, Math.ceil(secondsLeft / 3_600))} hours`,
                text: `Milestone #${milestoneId + 1n} in project #${dealId} is waiting for your review. Approve, request changes, or open a dispute before the deadline. ${APP_URL}/dashboard`,
                html: emailShell(
                  "Review deadline approaching",
                  `Milestone #${milestoneId + 1n} in project #${dealId} will become eligible for automatic USDC release when the review window ends.`,
                ),
                idempotencyKey: `warning-${dealId}-${milestoneId}-${reviewDeadline}`,
              });
              warnings.push({ dealId: dealId.toString(), milestoneId: milestoneId.toString(), ...result });
            } catch (cause) {
              await redisCommand(["DEL", warningKey]);
              warnings.push({
                dealId: dealId.toString(),
                milestoneId: milestoneId.toString(),
                error: cause instanceof Error ? cause.message : "email_failed",
              });
            }
          }
        }

        if (secondsLeft <= 0 && isClearDealAutomationWalletConfigured) {
          const finalizeKey = `cleardeal:automation:finalize:${dealId}:${milestoneId}:${reviewDeadline}`;
          const claimed = await redisCommand<string | null>([
            "SET",
            finalizeKey,
            "1",
            "NX",
            "EX",
            86_400,
          ]);
          if (claimed !== "OK") continue;
          try {
            const result = await finalizeMilestoneWithCircle({
              dealId,
              milestoneId,
              idempotencyKey: crypto.randomUUID(),
            });
            releases.push({
              dealId: dealId.toString(),
              milestoneId: milestoneId.toString(),
              amount: formatUnits(milestone[1], 6),
              ...result,
            });
          } catch (cause) {
            await redisCommand(["DEL", finalizeKey]);
            releases.push({
              dealId: dealId.toString(),
              milestoneId: milestoneId.toString(),
              error: cause instanceof Error ? cause.message : "finalize_failed",
            });
          }
        }
      }
    }

    const notifications = isClearDealEmailConfigured
      ? await sendEventNotifications(publicClient, latestBlock)
      : { sent: 0, skipped: "email_not_configured" };

    return NextResponse.json({
      status: "ok",
      network: "Arc Testnet",
      latestBlock: latestBlock.toString(),
      dealsChecked: nextDealId.toString(),
      automationWallet: isClearDealAutomationWalletConfigured,
      email: isClearDealEmailConfigured,
      releases,
      warnings,
      notifications,
    });
  } catch (cause) {
    return NextResponse.json(
      {
        error:
          cause instanceof Error ? cause.message : "automation_run_failed",
      },
      { status: 502 },
    );
  } finally {
    await redisCommand(["DEL", LOCK_KEY]).catch(() => undefined);
  }
}

async function sendEventNotifications(
  publicClient: ReturnType<typeof createPublicClient>,
  latestBlock: bigint,
) {
  const storedCursor = await redisCommand<string>(["GET", CURSOR_KEY]);
  const fallback = latestBlock > 2_000n ? latestBlock - 2_000n : 0n;
  const fromBlock = storedCursor && /^\d+$/.test(storedCursor)
    ? BigInt(storedCursor) + 1n
    : clearDealDeploymentBlock > fallback
      ? clearDealDeploymentBlock
      : fallback;
  if (fromBlock > latestBlock) return { sent: 0, fromBlock: fromBlock.toString() };

  const events = await publicClient.getContractEvents({
    address: clearDealEscrowAddress,
    abi: clearDealEscrowAbi,
    fromBlock,
    toBlock: latestBlock,
  }) as ContractEvent[];
  let sent = 0;

  for (const event of events) {
    if (
      !["MilestoneSubmitted", "ChangesRequested", "MilestoneDisputed", "MilestoneReleased"].includes(
        event.eventName,
      )
    ) continue;
    const dealId = event.args.dealId as bigint;
    const milestoneId = event.args.milestoneId as bigint;
    const deal = await publicClient.readContract({
      address: clearDealEscrowAddress,
      abi: clearDealEscrowAbi,
      functionName: "deals",
      args: [dealId],
    });
    const contacts = await getNotificationContacts(deal[6]);
    const recipients =
      event.eventName === "MilestoneSubmitted"
        ? [contacts.clientEmail]
        : event.eventName === "ChangesRequested"
          ? [contacts.teamEmail]
          : [contacts.clientEmail, contacts.teamEmail];
    const to = [...new Set(recipients.filter(Boolean) as string[])];
    if (!to.length) continue;

    const eventKey = `cleardeal:email:event:${event.transactionHash}:${event.logIndex}`;
    const claimed = await redisCommand<string | null>([
      "SET",
      eventKey,
      "1",
      "NX",
      "EX",
      7_776_000,
    ]);
    if (claimed !== "OK") continue;
    const copy = eventEmailCopy(event.eventName, dealId, milestoneId, event.args);
    try {
      const result = await sendClearDealEmail({
        to,
        subject: copy.subject,
        text: `${copy.body} ${APP_URL}/dashboard`,
        html: emailShell(copy.subject, copy.body),
        idempotencyKey: `event-${event.transactionHash}-${event.logIndex}`,
      });
      if (result.sent) sent += 1;
    } catch {
      await redisCommand(["DEL", eventKey]);
      throw new Error("event_email_failed");
    }
  }
  await redisCommand(["SET", CURSOR_KEY, latestBlock.toString()]);
  return { sent, fromBlock: fromBlock.toString(), toBlock: latestBlock.toString() };
}

function eventEmailCopy(
  eventName: string,
  dealId: bigint,
  milestoneId: bigint,
  args: Record<string, unknown>,
) {
  if (eventName === "MilestoneSubmitted") {
    return {
      subject: "A ClearDeal delivery is ready for review",
      body: `Milestone #${milestoneId + 1n} in project #${dealId} was submitted. Open the protected preview, then approve, request changes, or dispute.`,
    };
  }
  if (eventName === "ChangesRequested") {
    return {
      subject: "Changes were requested in ClearDeal",
      body: `The client requested changes to milestone #${milestoneId + 1n} in project #${dealId}. Open the signed timeline to read the exact request.`,
    };
  }
  if (eventName === "MilestoneDisputed") {
    return {
      subject: "A ClearDeal milestone payment is paused",
      body: `Milestone #${milestoneId + 1n} in project #${dealId} is disputed. Automatic release is paused until the dispute helper decides.`,
    };
  }
  return {
    subject: "USDC milestone payment completed",
    body: `${formatUnits(args.amount as bigint, 6)} USDC was released for milestone #${milestoneId + 1n} in project #${dealId}. The clean delivery is now unlocked.`,
  };
}

function emailShell(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#2b2118"><p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#a66c00">ClearDeal · Arc Testnet</p><h1 style="font-size:28px;line-height:1.15">${title}</h1><p style="font-size:15px;line-height:1.7;color:#62584c">${body}</p><a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:16px;background:#d58b00;color:white;text-decoration:none;padding:12px 18px;font-weight:700">Open ClearDeal</a><p style="margin-top:28px;font-size:11px;line-height:1.6;color:#8c8070">Arc Testnet only. Test USDC has no real-world value.</p></div>`;
}
