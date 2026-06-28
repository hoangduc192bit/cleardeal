export type X402DemoState =
  | "idle"
  | "requesting"
  | "payment_required"
  | "payment_authorized_onchain"
  | "verifying"
  | "unlocked"
  | "failed";

export interface X402PaymentRequired {
  error: "payment_required";
  price: string;
  currency: "USDC";
  network: "Arc Testnet";
  service: string;
  instructions: string;
  demoMode: false;
  verification: "onchain_transfer_receipt";
  paymentHeader: "x-arcstream-payment-tx";
}

export interface X402UnlockedResponse {
  service: string;
  provider: string;
  timestamp: number;
  dataHash: string;
  receipt: string;
  txHash: `0x${string}`;
  verification: "onchain_verified";
  settlement: "settled_onchain";
  payload: unknown;
}
