export interface RiskData {
  timestamp: number;
  wallet: string;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  flags: string[];
}

// GoPlus Security API — free, no key required for basic checks
async function fetchGoPlusRisk(address: string, chainId = "1"): Promise<{
  score: number;
  flags: string[];
}> {
  try {
    const res = await fetch(
      `https://api.gopluslabs.io/api/v1/address_security/${address}?chain_id=${chainId}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error("GoPlus unavailable");

    const json = await res.json();
    const result = json.result ?? {};

    const flags: string[] = [];
    let score = 0;

    if (result.cybercrime === "1")          { flags.push("Linked to cybercrime"); score += 40; }
    if (result.money_laundering === "1")    { flags.push("Money laundering risk"); score += 35; }
    if (result.phishing_activities === "1") { flags.push("Phishing activity"); score += 30; }
    if (result.blackmail_activities === "1"){ flags.push("Blackmail activity"); score += 35; }
    if (result.stealing_attack === "1")     { flags.push("Involved in stealing attack"); score += 30; }
    if (result.darkweb_transactions === "1"){ flags.push("Darkweb transactions"); score += 40; }
    if (result.sanctioned === "1")          { flags.push("OFAC Sanctioned address"); score += 50; }
    if (result.malicious_contract === "1")  { flags.push("Malicious contract interaction"); score += 25; }
    if (result.mixer === "1")               { flags.push("Mixer/Tornado Cash interaction"); score += 20; }
    if (result.honeypot_related_address === "1") { flags.push("Honeypot related"); score += 20; }

    if (flags.length === 0) flags.push("No threats detected — clean wallet");

    return { score: Math.min(score, 100), flags };
  } catch {
    return { score: 0, flags: ["Risk check unavailable — GoPlus API error"] };
  }
}

// Use well-known public wallets for demonstration
const DEMO_WALLETS = [
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // vitalik.eth
  "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503", // Binance cold wallet
  "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE", // Binance hot wallet
  "0x28C6c06298d514Db089934071355E5743bf21d60", // Binance 14
  "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8", // Binance 7
];

export async function fetchRiskFeed(): Promise<RiskData> {
  // Pick a random known wallet to demonstrate real GoPlus risk scanning
  const wallet = DEMO_WALLETS[Math.floor(Math.random() * DEMO_WALLETS.length)];

  const { score, flags } = await fetchGoPlusRisk(wallet);

  let riskLevel: RiskData["riskLevel"] = "Low";
  if (score > 90) riskLevel = "Critical";
  else if (score > 60) riskLevel = "High";
  else if (score > 30) riskLevel = "Medium";

  return {
    timestamp: Date.now(),
    wallet,
    riskScore: score,
    riskLevel,
    flags,
  };
}
