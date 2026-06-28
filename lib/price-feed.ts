export interface PriceFeedData {
  timestamp: number;
  prices: { btc: number; eth: number; sol: number };
  change24h: { btc: number; eth: number; sol: number };
  analysis: string;
}
