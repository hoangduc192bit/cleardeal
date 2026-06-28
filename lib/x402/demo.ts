export const X402_DEMO_HEADER = "x-arcstream-demo-payment";
export const X402_DEMO_AUTHORIZATION = "authorized-demo-call";
export const X402_DEMO_PRICE = "0.0001";

export function verifyDemoPaymentHeader(value: string | null) {
  return value === X402_DEMO_AUTHORIZATION;
}

export function createDemoReceipt(timestamp: number) {
  return `demo-x402-${timestamp}`;
}
