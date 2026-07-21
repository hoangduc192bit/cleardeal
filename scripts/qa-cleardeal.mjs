import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 10_000 + Math.floor(Math.random() * 20_000);
const outputDir = path.resolve("artifacts/qa");
const profileDir = await mkdtemp(path.join(tmpdir(), "cleardeal-qa-"));
const baseUrl = (process.env.CLEARDEAL_QA_BASE_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "");
const clearingCycleId = process.env.CLEARDEAL_QA_CYCLE_ID;
const clearingInviteWallet = process.env.CLEARDEAL_QA_INVITE_WALLET;
const issues = [];

await mkdir(outputDir, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "about:blank",
], { stdio: "ignore" });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pollJson(url, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await delay(125);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const targets = await pollJson(`http://127.0.0.1:${port}/json/list`);
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("Chrome did not expose a page target.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") {
    issues.push(message.params.exceptionDetails.text);
  }
  if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params.entry.level)) {
    issues.push(message.params.entry.text);
  }
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});

function send(method, params = {}) {
  sequence += 1;
  return new Promise((resolve, reject) => {
    pending.set(sequence, { resolve, reject });
    socket.send(JSON.stringify({ id: sequence, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function pollEvaluate(expression, attempts = 30, intervalMs = 500) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = await evaluate(expression);
    if (value) return true;
    await delay(intervalMs);
  }
  return false;
}

async function navigate(url, width, height) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send("Page.navigate", { url });
  await delay(1800);
}

async function clickByText(text) {
  const expression = `(() => {
      const element = [...document.querySelectorAll('button, a')].find((item) => {
        const rect = item.getBoundingClientRect();
        return item.textContent?.trim().includes(${JSON.stringify(text)}) && rect.width > 0 && rect.height > 0;
      });
      if (!element) return false;
      element.click();
      return true;
    })()`;
  const clicked = await pollEvaluate(expression, 40, 250);
  if (!clicked) {
    const diagnostic = await evaluate(`({
      url: location.href,
      title: document.title,
      body: document.body.innerText.slice(0, 500),
      interactive: [...document.querySelectorAll('button, a')].map((item) => item.textContent?.trim()).filter(Boolean).slice(0, 30)
    })`);
    throw new Error(`Could not find interactive element containing: ${text}. Page: ${JSON.stringify(diagnostic)}`);
  }
  await delay(250);
}

async function fillByPlaceholder(placeholder, value, index = 0) {
  const rect = await evaluate(`(() => {
    const element = [...document.querySelectorAll('input')].filter((item) => item.placeholder === ${JSON.stringify(placeholder)})[${index}];
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  if (!rect) throw new Error(`Could not find input placeholder: ${placeholder}`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await send("Input.insertText", { text: value });
  await delay(100);
}

async function screenshot(filename) {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(path.join(outputDir, filename), Buffer.from(result.data, "base64"));
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");

  await navigate(`${baseUrl}/dashboard`, 1440, 1000);
  const desktopInitial = await evaluate(`({
    readyState: document.readyState,
    heading: document.querySelector('h1')?.textContent,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    loadingFallback: document.body.innerText.includes('Loading clearing workspace'),
    containsSampleData: document.body.innerText.includes('Sample data'),
    containsLocalDraft: document.body.innerText.includes('Local draft')
  })`);

  await clickByText("Connect Wallet");
  await delay(800);
  let walletMenu = await evaluate(`({
    hasWalletConnect: document.body.innerText.includes('WalletConnect'),
    explainsMobileWallet: document.body.innerText.includes('mobile wallet'),
    hasWalletMenu: document.body.innerText.includes('Connect payment wallet'),
    usesSettlementCopy: document.body.innerText.includes('settlement room') && !document.body.innerText.includes('milestone deals')
  })`);
  if (!walletMenu.hasWalletMenu) {
    await delay(1_000);
    await clickByText("Connect Wallet");
    await delay(800);
    walletMenu = await evaluate(`({
      hasWalletConnect: document.body.innerText.includes('WalletConnect'),
      explainsMobileWallet: document.body.innerText.includes('mobile wallet'),
      hasWalletMenu: document.body.innerText.includes('Connect payment wallet'),
      usesSettlementCopy: document.body.innerText.includes('settlement room') && !document.body.innerText.includes('milestone deals')
    })`);
  }
  if (!walletMenu.hasWalletConnect) throw new Error(`WalletConnect was not available in the wallet menu (menu open: ${walletMenu.hasWalletMenu}).`);
  if (!walletMenu.usesSettlementCopy) throw new Error("Wallet menu still contains legacy deal copy.");
  await clickByText("Connect Wallet");

  await clickByText("New settlement room");
  const modalOpened = await evaluate("document.querySelectorAll('[role=dialog]').length === 1");
  if (!modalOpened) throw new Error("Create deal modal did not open.");
  const deploymentGate = await evaluate(`({
    wizardVisible: document.body.innerText.toUpperCase().includes('START FROM A REAL SCENARIO') && document.body.innerText.includes('Agency & contractors'),
    showsTestnetWarning: document.body.innerText.includes('Arc Testnet only'),
    showsPlainLanguageCopy: document.body.innerText.includes('Set up who pays whom')
  })`);
  await screenshot("deals-desktop.png");
  await clickByText("Continue");
  const wizardPeopleStep = await evaluate(`({
    showsParticipants: document.body.innerText.includes('Payment participants'),
    showsReviewers: document.body.innerText.includes('Independent reviewers'),
    showsResolver: document.body.innerText.toUpperCase().includes('INDEPENDENT DISPUTE RESOLVER')
  })`);

  await navigate(`${baseUrl}/`, 390, 844);
  const landingMobile = await evaluate(`({
    heading: document.querySelector('h1')?.textContent,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth
  })`);
  await screenshot("landing-mobile.png");

  await navigate(`${baseUrl}/dashboard`, 390, 844);
  const dashboardMobile = await evaluate(`({
    heading: document.querySelector('h1')?.textContent,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    mobileMenuVisible: Boolean(document.querySelector('[aria-label="Open workspace navigation"]')),
    loadingFallback: document.body.innerText.includes('Loading clearing workspace')
  })`);
  await screenshot("deals-mobile.png");

  let directCycle;
  let roleInvite;
  if (clearingCycleId && /^\d+$/.test(clearingCycleId)) {
    await navigate(`${baseUrl}/dashboard?cycle=${clearingCycleId}`, 1440, 1000);
    await pollEvaluate("Boolean(document.querySelector('main h2')) || document.body.innerText.includes('Could not read cycles')");
    directCycle = await evaluate(`({
      showsClearingRoom: document.body.innerText.includes('Clearing Room #${clearingCycleId}'),
      showsCycleDetail: Boolean(document.querySelector('main h2')),
      showsRoomLink: document.body.innerText.includes('Copy room link'),
      readFailed: document.body.innerText.includes('Could not read cycles')
    })`);
    if (!directCycle.showsClearingRoom || !directCycle.showsCycleDetail || !directCycle.showsRoomLink || directCycle.readFailed) {
      throw new Error(`Clearing Room deep link failed: ${JSON.stringify(directCycle)}`);
    }
    if (clearingInviteWallet && /^0x[0-9a-fA-F]{40}$/.test(clearingInviteWallet)) {
      await navigate(`${baseUrl}/dashboard?cycle=${clearingCycleId}&role=verifier&wallet=${clearingInviteWallet}`, 1440, 1000);
      await pollEvaluate("Boolean(document.querySelector('main h2')) || document.body.innerText.includes('Could not read cycles')");
      roleInvite = await evaluate(`({
        showsVerifierRole: document.body.innerText.includes('Invited as verifier'),
        showsCycleDetail: Boolean(document.querySelector('main h2')),
        readFailed: document.body.innerText.includes('Could not read cycles')
      })`);
      if (!roleInvite.showsVerifierRole || !roleInvite.showsCycleDetail || roleInvite.readFailed) {
        throw new Error(`Role invite deep link failed: ${JSON.stringify(roleInvite)}`);
      }
    }
  }

  console.log(JSON.stringify({ desktopInitial, walletMenu, modalOpened, deploymentGate, wizardPeopleStep, landingMobile, dashboardMobile, directCycle, roleInvite, issues }, null, 2));
} finally {
  socket.close();
  chrome.kill();
  await delay(250);
  await rm(profileDir, { recursive: true, force: true }).catch(() => undefined);
}
