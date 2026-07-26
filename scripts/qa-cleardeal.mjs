import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const chromePath =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 10_000 + Math.floor(Math.random() * 20_000);
const outputDir = path.resolve("artifacts/qa");
const profileDir = await mkdtemp(path.join(tmpdir(), "cleardeal-qa-"));
const baseUrl = (
  process.env.CLEARDEAL_QA_BASE_URL ?? "http://127.0.0.1:3001"
).replace(/\/$/, "");
const localQa = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(baseUrl);
const issues = [];

await mkdir(outputDir, { recursive: true });

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ],
  { stdio: "ignore" },
);

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
  if (
    message.method === "Log.entryAdded" &&
    message.params.entry.level === "error"
  ) {
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
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function pollEvaluate(expression, attempts = 40, intervalMs = 250) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(expression)) return true;
    await delay(intervalMs);
  }
  return false;
}

async function navigate(url, width, height) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
  await send("Page.navigate", { url });
  const ready = await pollEvaluate(
    "document.readyState === 'complete' && Boolean(document.querySelector('main'))",
  );
  if (!ready) throw new Error(`Page did not become ready: ${url}`);
}

async function clickByText(text) {
  const clicked = await pollEvaluate(`(() => {
    const element = [...document.querySelectorAll('button, a')].find((item) => {
      const rect = item.getBoundingClientRect();
      return item.textContent?.trim().includes(${JSON.stringify(text)}) &&
        rect.width > 0 && rect.height > 0;
    });
    if (!element) return false;
    element.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Could not find interactive text: ${text}`);
}

async function screenshot(filename) {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(
    path.join(outputDir, filename),
    Buffer.from(result.data, "base64"),
  );
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");

  await navigate(`${baseUrl}/dashboard`, 1440, 1000);
  assert(
    await pollEvaluate(
      "document.querySelector('h1')?.textContent?.trim() === 'Vietnam website launch'",
    ),
    "The dashboard sample did not finish rendering.",
  );
  assert(
    await pollEvaluate(
      "document.body.innerText.toLowerCase().includes('read-only demo')",
    ),
    "The dashboard sample details did not finish rendering.",
  );
  const dashboardDesktop = await evaluate(`({
    heading: document.querySelector('h1')?.textContent?.trim(),
    horizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
    readOnlyDemo: document.body.innerText.toLowerCase().includes('read-only demo'),
    directTransferExplanation:
      document.body.innerText.includes('A direct transfer only sends money'),
    demoStory: document.body.innerText.toLowerCase().includes('three-step demo story'),
    arcReason:
      document.body.innerText.includes('USDC pays both the project and network fee'),
    legacyClearingHeadline:
      document.body.innerText.includes('Settle what everyone actually owes')
  })`);
  assert(
    dashboardDesktop.heading === "Vietnam website launch",
    "The sample project did not load.",
  );
  assert(!dashboardDesktop.horizontalOverflow, "Desktop dashboard overflows.");
  assert(dashboardDesktop.readOnlyDemo, "The sample is not labeled read-only.");
  assert(
    dashboardDesktop.directTransferExplanation,
    "The direct-transfer explanation is missing.",
  );
  assert(dashboardDesktop.demoStory, "The three-step demo story is missing.");
  assert(dashboardDesktop.arcReason, "The Arc-specific reason is missing.");
  assert(
    !dashboardDesktop.legacyClearingHeadline,
    "Legacy clearing copy leaked into the primary dashboard.",
  );
  await screenshot("dashboard-production-desktop.png");

  await clickByText("Sign in");
  const walletMenu = await evaluate(`({
    heading: document.body.innerText.includes('Sign in to ClearDeal'),
    passkey: document.body.innerText.includes('Create passkey account'),
    recovery: document.body.innerText.includes('Lost your passkey?'),
    browserWallet: document.body.innerText.includes('Browser Wallet'),
    walletConnect: document.body.innerText.includes('WalletConnect')
  })`);
  assert(walletMenu.heading, "The wallet menu did not open.");
  if (localQa) {
    assert(
      walletMenu.passkey || walletMenu.walletConnect || walletMenu.browserWallet,
      "No wallet sign-in option is available.",
    );
  } else {
    assert(walletMenu.passkey, "Passkey sign-in is missing.");
    assert(walletMenu.recovery, "Passkey recovery is missing.");
    assert(walletMenu.walletConnect, "WalletConnect is missing.");
  }

  if (walletMenu.recovery) {
    await clickByText("Lost your passkey?");
    assert(
      await pollEvaluate(
        "document.body.innerText.includes('Recover your ClearDeal wallet')",
      ),
      "The passkey recovery modal did not open.",
    );
    const recoveryModal = await evaluate(`({
      arcOnly: document.body.innerText.includes('Arc Testnet'),
      noServerStorage:
        document.body.innerText.includes('never sent to the ClearDeal server'),
      lostPasskeyWarning:
        document.body.innerText.includes('works only if these words were registered')
    })`);
    assert(recoveryModal.arcOnly, "The recovery network boundary is missing.");
    assert(
      recoveryModal.noServerStorage,
      "The recovery storage boundary is missing.",
    );
    assert(
      recoveryModal.lostPasskeyWarning,
      "The recovery prerequisite warning is missing.",
    );
    await screenshot("passkey-recovery-production.png");
    await evaluate(
      "document.querySelector('[aria-label=\"Close recovery\"]')?.click()",
    );
  } else {
    await clickByText("Sign in");
  }
  await clickByText("Preview crosschain funding");
  const crosschainModal = await evaluate(`({
    open: document.body.innerText.includes('Bring testnet USDC to Arc'),
    base: document.body.innerText.includes('Base Sepolia'),
    ethereum: document.body.innerText.includes('Ethereum Sepolia'),
    destination: document.body.innerText.includes('Arc Testnet'),
    bridgeOnly: document.body.innerText.includes('Bridge USDC')
  })`);
  assert(crosschainModal.open, "The crosschain funding modal did not open.");
  assert(
    crosschainModal.base && crosschainModal.ethereum && crosschainModal.destination,
    "A supported bridge network is missing.",
  );
  await screenshot("crosschain-funding-production.png");

  await navigate(`${baseUrl}/`, 390, 844);
  const landingMobile = await evaluate(`({
    heading: document.querySelector('h1')?.textContent,
    horizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth
  })`);
  assert(!landingMobile.horizontalOverflow, "Mobile landing page overflows.");
  await screenshot("landing-production-mobile.png");

  if (walletMenu.recovery) {
    await navigate(`${baseUrl}/docs`, 390, 844);
    await evaluate(
      "document.querySelector('[aria-label=\"Open menu\"]')?.click()",
    );
    await clickByText("Sign in");
    await clickByText("Lost your passkey?");
    assert(
      await pollEvaluate(
        "document.body.innerText.includes('Recover your ClearDeal wallet')",
      ),
      "The mobile recovery modal did not open.",
    );
    const recoveryMobile = await evaluate(`({
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      dialogFits:
        (() => {
          const dialog = document.querySelector('[aria-label="Recover passkey wallet"] > div');
          if (!dialog) return false;
          const rect = dialog.getBoundingClientRect();
          return rect.left >= 0 && rect.right <= window.innerWidth;
        })()
    })`);
    assert(
      !recoveryMobile.horizontalOverflow && recoveryMobile.dialogFits,
      "The mobile recovery modal does not fit the viewport.",
    );
    await screenshot("passkey-recovery-production-mobile.png");
    await evaluate(
      "document.querySelector('[aria-label=\"Close recovery\"]')?.click()",
    );
  }

  await navigate(`${baseUrl}/dashboard`, 390, 844);
  assert(
    await pollEvaluate(
      "document.querySelector('h1')?.textContent?.trim() === 'Vietnam website launch'",
    ),
    "The mobile dashboard sample did not finish rendering.",
  );
  const dashboardMobile = await evaluate(`({
    heading: document.querySelector('h1')?.textContent?.trim(),
    horizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
    menu: Boolean(document.querySelector('[aria-label="Open navigation"]'))
  })`);
  assert(
    dashboardMobile.heading === "Vietnam website launch",
    "Mobile dashboard did not load the sample project.",
  );
  assert(!dashboardMobile.horizontalOverflow, "Mobile dashboard overflows.");
  assert(dashboardMobile.menu, "Mobile project navigation is missing.");
  await screenshot("dashboard-production-mobile.png");

  await navigate(`${baseUrl}/how-it-works`, 1280, 900);
  const howItWorks = await evaluate(`({
    heading: document.querySelector('h1')?.textContent?.trim(),
    hasFiveSteps:
      document.body.innerText.includes('Agree on the delivery steps') &&
      document.body.innerText.includes('Approve and release payment'),
    hasArcReason:
      document.body.innerText.includes('project payment and network fee both use USDC')
  })`);
  assert(howItWorks.hasFiveSteps, "The complete project workflow is missing.");
  assert(howItWorks.hasArcReason, "The Arc reason is missing from the workflow.");

  const healthResponse = await fetch(`${baseUrl}/api/health`);
  const health = await healthResponse.json();
  if (localQa) {
    assert(
      health.product === "ClearDeal" &&
        health.network?.chainId === 5_042_002 &&
        health.checks?.canonicalUsdc === true &&
        health.checks?.escrowBytecode === true &&
        health.checks?.escrowUsdc === true,
      `Local health check could not verify Arc and escrow: ${JSON.stringify(health.checks ?? health)}`,
    );
  } else {
    assert(
      healthResponse.ok && health.ready === true,
      `Production health check is not ready: ${JSON.stringify(health.checks ?? health)}`,
    );
  }

  if (issues.length) {
    throw new Error(`Browser errors detected: ${issues.join(" | ")}`);
  }

  console.log(
    JSON.stringify(
      {
        baseUrl,
        dashboardDesktop,
        walletMenu,
        crosschainModal,
        landingMobile,
        dashboardMobile,
        howItWorks,
        health,
        screenshots: outputDir,
      },
      null,
      2,
    ),
  );
} finally {
  socket.close();
  chrome.kill();
  await delay(250);
  await rm(profileDir, { recursive: true, force: true }).catch(() => undefined);
}
