const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const assetsDir = path.join(root, "docs", "assets");
const token = "docs-token";

const mime = new Map([
  [".css", "text/css"],
  [".html", "text/html"],
  [".js", "application/javascript"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json"],
]);

const threads = [
  { id: "thread-remote-check", name: "Codexのリモート操作を確認", cwd: "/Users/stephan/Documents/New project 2", updatedAt: Date.now() },
  { id: "thread-wood-theme", name: "ロゴ配色と木目UIの調整", cwd: "/Users/stephan/Documents/New project 2", updatedAt: Date.now() - 1_800_000 },
  { id: "thread-history", name: "履歴同期と再接続の安定化", cwd: "/Users/stephan/Documents/New project 2", updatedAt: Date.now() - 7_200_000 },
];

const history = [
  { type: "assistant", text: "共有チャットへ接続しました。" },
  { type: "assistant", text: "Safariの切断から戻れるよう、再接続まわりを安定化しました。" },
  { type: "user", text: "今見ている画面がどのチャットか分かるようにしたい。" },
  { type: "assistant", text: "見出しは履歴一覧と同じチャット名で固定しました。リンクもそのままタップできます。\n\nGitHub: https://github.com/pastorstephan-prog/ocdex-lite" },
];

function isInsideDir(base, target) {
  const relative = path.relative(path.resolve(base), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveInsideDir(base, target) {
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(target);
  if (!isInsideDir(resolvedBase, resolvedTarget)) return null;
  return resolvedTarget;
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = resolveInsideDir(publicDir, path.resolve(publicDir, `.${pathname}`));
    if (!file) return res.writeHead(403).end("Forbidden");
    fs.readFile(file, (error, data) => {
      if (error) return res.writeHead(404).end("Not found");
      res.writeHead(200, { "content-type": mime.get(path.extname(file)) || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}

async function launchBrowser() {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (fs.existsSync(chromePath)) return chromium.launch({ executablePath: chromePath });
  return chromium.launch();
}

async function mockApi(page, origin) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || !url.pathname.startsWith("/api/")) return route.continue();

    if (url.pathname === "/api/threads") {
      return route.fulfill({ json: { data: threads } });
    }
    if (url.pathname === "/api/thread") {
      const requested = url.searchParams.get("id") || "thread-remote-check";
      return route.fulfill({
        json: {
          threadId: requested,
          history,
          name: threads.find((thread) => thread.id === requested)?.name || threads[0].name,
        },
      });
    }
    if (url.pathname === "/api/artifacts") {
      return route.fulfill({ json: { data: [] } });
    }
    if (url.pathname === "/api/config") {
      return route.fulfill({
        json: { auth: { authMethod: "token" }, config: { config: { model: "gpt-5.5", cwd: threads[0].cwd } }, errors: [] },
      });
    }
    if (url.pathname === "/api/models") {
      return route.fulfill({
        json: {
          data: [
            { model: "gpt-5.5", displayName: "GPT-5.5", defaultReasoningEffort: "medium" },
            { model: "gpt-5.4", displayName: "GPT-5.4", defaultReasoningEffort: "medium" },
          ],
        },
      });
    }
    if (url.pathname === "/api/status") {
      return route.fulfill({
        json: {
          uiPort: 45214,
          codexUrl: "ws://127.0.0.1:45213",
          historySyncEnabled: true,
          workdir: threads[0].cwd,
          bridges: [{ threadId: "thread-remote-check", clients: 2, ready: true }],
        },
      });
    }
    return route.fulfill({ status: 404, json: { error: "mock route not found" } });
  });
}

async function mockWebSocket(page) {
  await page.addInitScript((payload) => {
    class MockWebSocket extends EventTarget {
      constructor() {
        super();
        this.readyState = MockWebSocket.CONNECTING;
        setTimeout(() => {
          this.readyState = MockWebSocket.OPEN;
          this.dispatchEvent(new Event("open"));
          this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(payload) }));
        }, 80);
      }
      send() {}
      close() {
        this.readyState = MockWebSocket.CLOSED;
        this.dispatchEvent(new CloseEvent("close"));
      }
    }
    MockWebSocket.CONNECTING = 0;
    MockWebSocket.OPEN = 1;
    MockWebSocket.CLOSING = 2;
    MockWebSocket.CLOSED = 3;
    window.WebSocket = MockWebSocket;
  }, {
    type: "ready",
    threadId: "thread-remote-check",
    threadLabel: "Codexのリモート操作を確認",
    history,
    model: "gpt-5.5",
    clients: 2,
    workdir: threads[0].cwd,
  });
}

async function newPage(browser, origin, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  await mockWebSocket(page);
  await mockApi(page, origin);
  await page.goto(`${origin}/lite.html?token=${token}`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-state="ready"], [data-state="done"]');
  await page.waitForTimeout(250);
  return page;
}

async function capture(page, file) {
  await page.screenshot({ path: path.join(assetsDir, file), fullPage: false });
}

async function run() {
  fs.mkdirSync(assetsDir, { recursive: true });
  const { server, origin } = await startServer();
  let browser;
  try {
    browser = await launchBrowser();

    let page = await newPage(browser, origin, { width: 430, height: 932 });
    await capture(page, "ocdex-lite-iphone.png");
    await page.getByRole("button", { name: "履歴" }).click();
    await page.waitForTimeout(250);
    await capture(page, "ocdex-lite-iphone-history.png");
    await page.close();

    page = await newPage(browser, origin, { width: 1024, height: 768 });
    await capture(page, "ocdex-lite-ipad.png");
    await page.close();

    console.log("Captured product screenshots in docs/assets");
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
