import { expect } from "chai";

import { createRpcReadQueue, isTransientRpcError, mapWithConcurrency, withRpcRetry } from "../lib/arc-rpc.ts";

describe("Arc RPC reliability", function () {
  it("retries a rate-limited read and preserves the result", async function () {
    let calls = 0;
    const delays: number[] = [];
    const result = await withRpcRetry(async () => {
      calls += 1;
      if (calls < 3) throw new Error("RPC request limit reached");
      return "clearing-state";
    }, { baseDelayMs: 10, sleep: async (delay) => { delays.push(delay); } });

    expect(result).to.equal("clearing-state");
    expect(calls).to.equal(3);
    expect(delays).to.deep.equal([10, 20]);
  });

  it("does not retry deterministic contract failures", async function () {
    let calls = 0;
    try {
      await withRpcRetry(async () => {
        calls += 1;
        throw new Error("execution reverted: Unauthorized");
      }, { sleep: async () => undefined });
      expect.fail("Expected the contract failure to be returned.");
    } catch (cause) {
      expect((cause as Error).message).to.include("Unauthorized");
    }
    expect(calls).to.equal(1);
  });

  it("bounds concurrent reads without changing result order", async function () {
    let active = 0;
    let peak = 0;
    const values = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return value * 10;
    });

    expect(values).to.deep.equal([10, 20, 30, 40, 50]);
    expect(peak).to.equal(2);
  });

  it("recognizes the transient failures seen on Arc public RPC", function () {
    expect(isTransientRpcError(new Error("request limit reached"))).to.equal(true);
    expect(isTransientRpcError(new Error("HTTP 429 Too Many Requests"))).to.equal(true);
    expect(isTransientRpcError(new Error("execution reverted"))).to.equal(false);
  });

  it("serializes reads through one rate-aware queue", async function () {
    let active = 0;
    let peak = 0;
    const queuedRead = createRpcReadQueue({ minIntervalMs: 0 });
    const values = await Promise.all([1, 2, 3].map((value) => queuedRead(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return value;
    })));
    expect(values).to.deep.equal([1, 2, 3]);
    expect(peak).to.equal(1);
  });
});
