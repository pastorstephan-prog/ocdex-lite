const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const WebSocket = require("ws");
const { bridgeKeyForRequest, shouldDisposeIdleBridge, shouldPromoteBridgeKey } = require("./bridge-state");
const { isHistorySyncEnabled, runHistorySync } = require("./history-sync");
const { bridgeUrls, notifyBridgeUrls } = require("./phone-notify");
const { listSessionThreads } = require("./session-threads");
const { lightweightHandoffTitle, threadLabelFromHistory } = require("./thread-title");

const root = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnvFile(path.join(root, ".env"));

const codexBin = path.join(root, "node_modules", ".bin", "codex");
const uiPort = Number(process.env.PHONE_UI_PORT || 45214);
const codexPort = Number(process.env.CODEX_APP_SERVER_PORT || 45213);
const codexSocketPath = process.env.CODEX_APP_SERVER_SOCK || "";
const codexUrl = process.env.CODEX_APP_SERVER_URL || (codexSocketPath ? "ws://codex-app-server/rpc" : `ws://127.0.0.1:${codexPort}`);
const shouldStartCodexServer = !process.env.CODEX_APP_SERVER_URL && !codexSocketPath;
const workdir = process.env.CODEX_WORKDIR || root;
const model = process.env.CODEX_MODEL || "gpt-5.4";
const historySyncEnabled = isHistorySyncEnabled(process.env);
const tokenPath = path.join(root, ".phone-token");
const uploadDir = path.join(root, ".uploads");
const sessionsDir = path.join(os.homedir(), ".codex", "sessions");
const bridges = new Map();
const threadTitleOverrides = new Map();
const historyLimit = Number(process.env.CODEX_HISTORY_LIMIT || 80);
const threadListLimit = Number(process.env.CODEX_THREAD_LIST_LIMIT || 80);
const historySyncLimit = Number(process.env.CODEX_HISTORY_SYNC_LIMIT || 10);
const wsMaxPayload = Number(process.env.CODEX_WS_MAX_PAYLOAD_MB || 256) * 1024 * 1024;
const uploadMaxBytes = Number(process.env.CODEX_UPLOAD_MAX_MB || 12) * 1024 * 1024;
const bridgeIdleDisposeMs = Number(process.env.CODEX_BRIDGE_IDLE_DISPOSE_MS || 10 * 60 * 1000);
const bridgeStartupTimeoutMs = Number(process.env.CODEX_BRIDGE_STARTUP_TIMEOUT_MS || 15 * 1000);
const imageExtensions = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
]);
const staticMimeTypes = new Map([
  [".css", "text/css"],
  [".html", "text/html"],
  [".js", "application/javascript"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json"],
]);

function getToken() {
  if (process.env.PHONE_TOKEN) return process.env.PHONE_TOKEN;
  if (fs.existsSync(tokenPath)) return fs.readFileSync(tokenPath, "utf8").trim();
  const token = crypto.randomBytes(18).toString("base64url");
  fs.writeFileSync(tokenPath, `${token}\n`, { mode: 0o600 });
  return token;
}

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

function waitForReady() {
  const url = `http://127.0.0.1:${codexPort}/readyz`;
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const retry = () => {
      if (Date.now() - started > 10_000) reject(new Error("Codex app-server did not become ready"));
      else setTimeout(tick, 250);
    };
    const tick = () => {
      http
        .get(url, (res) => {
          res.resume();
          if (res.statusCode === 200) resolve();
          else retry();
        })
        .on("error", retry);
    };
    tick();
  });
}

function createUpstreamWebSocket() {
  if (!codexSocketPath) {
    return new WebSocket(codexUrl, {
      perMessageDeflate: false,
      maxPayload: wsMaxPayload,
    });
  }
  return new WebSocket(codexUrl, {
    perMessageDeflate: false,
    maxPayload: wsMaxPayload,
    createConnection: () => net.createConnection(codexSocketPath),
  });
}

class AppServerRpcClient {
  constructor() {
    this.upstream = null;
    this.nextId = 1;
    this.pending = new Map();
    this.ready = false;
    this.connecting = null;
  }

  request(method, params) {
    return this.ensureReady().then(() => this.sendRequest(method, params));
  }

  ensureReady() {
    if (this.ready && this.upstream?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.connecting) return this.connecting;

    this.upstream = createUpstreamWebSocket();
    this.ready = false;
    this.connecting = new Promise((resolve, reject) => {
      const fail = (error) => {
        this.connecting = null;
        reject(error);
      };

      this.upstream.on("open", () => {
        this.sendRequest("initialize", {
          clientInfo: { name: "codex-phone-bridge-api", title: "Codex Phone Bridge API", version: "0.1.0" },
        })
          .then(() => {
            if (this.upstream?.readyState === WebSocket.OPEN) {
              this.upstream.send(JSON.stringify({ method: "initialized", params: {} }));
            }
            this.ready = true;
            this.connecting = null;
            resolve();
          })
          .catch(fail);
      });

      this.upstream.on("message", (data) => this.handleMessage(data));
      this.upstream.on("error", fail);
      this.upstream.on("close", () => this.reset(new Error("Codex app-server connection closed")));
    });

    return this.connecting;
  }

  sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      if (!this.upstream || this.upstream.readyState !== WebSocket.OPEN) {
        reject(new Error("Codex app-server connection is not open"));
        return;
      }
      const id = this.nextId++;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 8000);
      this.pending.set(id, { method, resolve, reject, timeout });
      this.upstream.send(JSON.stringify({ id, method, params }));
    });
  }

  handleMessage(data) {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (error) {
      this.reset(new Error(`Invalid Codex app-server message: ${error.message}`));
      return;
    }
    if (!msg.id || !this.pending.has(msg.id)) return;
    const pending = this.pending.get(msg.id);
    this.pending.delete(msg.id);
    clearTimeout(pending.timeout);
    if (msg.error) pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
    else pending.resolve(msg.result);
  }

  reset(error) {
    this.ready = false;
    this.connecting = null;
    this.upstream = null;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

const appServerClient = new AppServerRpcClient();

function startCodexServer() {
  const child = spawn(codexBin, ["app-server", "--listen", codexUrl], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${path.join(root, "node_modules", ".bin")}:${process.env.PATH || ""}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => process.stdout.write(`[codex] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[codex] ${chunk}`));
  child.on("exit", (code, signal) => {
    console.error(`[codex] exited code=${code} signal=${signal}`);
  });
  return child;
}

function appServerRequest(method, params) {
  return appServerClient.request(method, params);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function requireToken(url, phoneToken, res) {
  if (url.searchParams.get("token") === phoneToken) return true;
  sendJson(res, 401, { error: "invalid token" });
  return false;
}

function readJsonBody(req, limitBytes = uploadMaxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(new Error(`invalid json: ${error.message}`));
      }
    });
    req.on("error", reject);
  });
}

function safeRelativePath(input) {
  const raw = String(input || "");
  const target = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(root, raw.replace(/^[/\\]+/, ""));
  if (!target.startsWith(`${root}${path.sep}`) && target !== root) return null;
  return target;
}

function safeUploadPath(input) {
  const clean = String(input || "").replace(/^[/\\]+/, "");
  const target = path.resolve(uploadDir, clean);
  if (!target.startsWith(`${uploadDir}${path.sep}`) && target !== uploadDir) return null;
  return target;
}

function mimeForPath(filePath) {
  return imageExtensions.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

function isImagePath(filePath) {
  return imageExtensions.has(path.extname(filePath).toLowerCase());
}

function discoverArtifacts() {
  const files = ["README.md", "AGENTS.md"];
  const assetsDir = path.join(root, "docs", "assets");
  if (fs.existsSync(assetsDir)) {
    for (const name of fs.readdirSync(assetsDir).sort()) {
      const relative = path.join("docs", "assets", name);
      const full = path.join(root, relative);
      if (fs.statSync(full).isFile() && (isImagePath(full) || /\.md(?:own)?$/i.test(name))) files.push(relative);
    }
  }
  return files.map((file) => ({
    path: file,
    name: path.basename(file),
    kind: isImagePath(file) ? "image" : /\.md(?:own)?$/i.test(file) ? "markdown" : "file",
  }));
}

function readAutomations() {
  const home = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const automationsDir = path.join(home, "automations");
  if (!fs.existsSync(automationsDir)) return [];
  return fs
    .readdirSync(automationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const automationToml = path.join(automationsDir, entry.name, "automation.toml");
      const raw = fs.existsSync(automationToml) ? fs.readFileSync(automationToml, "utf8") : "";
      const name = raw.match(/^name\s*=\s*"([^"]+)"/m)?.[1] || entry.name;
      const status = raw.match(/^status\s*=\s*"([^"]+)"/m)?.[1] || "UNKNOWN";
      return { id: entry.name, name, status };
    });
}

function saveDataUrlAttachment(attachment) {
  const match = String(attachment.dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  if (!mime.startsWith("image/")) return null;
  fs.mkdirSync(uploadDir, { recursive: true });
  const extension = mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png";
  const safeName = String(attachment.name || "upload")
    .replace(/[^a-z0-9._-]/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeName || "image"}.${extension}`;
  const target = path.join(uploadDir, fileName);
  fs.writeFileSync(target, Buffer.from(match[2], "base64"), { mode: 0o600 });
  return {
    input: { type: "localImage", path: target },
    preview: { name: attachment.name || fileName, path: fileName, url: `/api/uploaded?name=${encodeURIComponent(fileName)}` },
  };
}

function saveUploadedDataUrl(body) {
  const saved = saveDataUrlAttachment({
    name: body.name || "upload.jpg",
    dataUrl: body.dataUrl,
  });
  if (!saved) return null;
  return {
    name: saved.preview.name,
    uploadedName: saved.preview.path,
    url: saved.preview.url,
    size: body.size || null,
  };
}

function uploadedAttachmentToInput(attachment) {
  const target = safeUploadPath(attachment.uploadedName || attachment.path);
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile() || !isImagePath(target)) return null;
  const name = attachment.name || path.basename(target);
  const fileName = path.basename(target);
  return {
    input: { type: "localImage", path: target },
    preview: { name, path: fileName, url: `/api/uploaded?name=${encodeURIComponent(fileName)}` },
  };
}

function sandboxPolicyForMode(mode) {
  if (mode === "danger-full-access") return { type: "dangerFullAccess" };
  if (mode === "read-only") return { type: "readOnly", networkAccess: true };
  return {
    type: "workspaceWrite",
    writableRoots: [workdir],
    networkAccess: true,
    excludeTmpdirEnvVar: false,
    excludeSlashTmp: false,
  };
}

function serveStatic(req, res) {
  const requestPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const file = requestPath === "/" ? "index.html" : requestPath.slice(1);
  const target = path.join(root, "public", file);
  if (!target.startsWith(path.join(root, "public")) || !fs.existsSync(target)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const type = staticMimeTypes.get(path.extname(target).toLowerCase()) || "application/octet-stream";
  res.writeHead(200, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
  fs.createReadStream(target).pipe(res);
}

function stripUiDirectives(text) {
  return String(text || "")
    .replace(/(?:^|\n)::[a-z0-9-]+\{[^\n]*\}(?=\n|$)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function excerptText(value, max = 900) {
  const text = stripUiDirectives(value).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function findSessionFileForThread(threadId, dir = sessionsDir, depth = 0) {
  if (!threadId || depth > 5 || !fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.includes(threadId) && entry.name.endsWith(".jsonl")) return target;
    if (entry.isDirectory()) {
      const found = findSessionFileForThread(threadId, target, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function textFromResponseContent(content = []) {
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => part?.text || "")
    .filter(Boolean)
    .join("\n");
}

function readSessionTail(filePath, maxBytes = 2 * 1024 * 1024) {
  const stat = fs.statSync(filePath);
  const fd = fs.openSync(filePath, "r");
  const size = Math.min(stat.size, maxBytes);
  const buffer = Buffer.alloc(size);
  fs.readSync(fd, buffer, 0, size, Math.max(0, stat.size - size));
  fs.closeSync(fd);
  return buffer.toString("utf8").split(/\r?\n/).slice(stat.size > maxBytes ? 1 : 0);
}

function sessionHistoryForThread(threadId, limit = historyLimit) {
  const filePath = findSessionFileForThread(threadId);
  if (!filePath) return [];
  const messages = [];
  const pushMessage = (entry) => {
    if (!entry.text) return;
    const previous = messages[messages.length - 1];
    if (previous && previous.type === entry.type && previous.text === entry.text) return;
    messages.push(entry);
  };
  for (const line of readSessionTail(filePath)) {
    if (!line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const payload = row.payload || {};
    if (row.type === "response_item" && payload.type === "message") {
      const text = stripUiDirectives(textFromResponseContent(payload.content));
      pushMessage({ type: payload.role === "assistant" ? "assistant" : "user", text });
    }
    if (row.type === "event_msg" && payload.type === "user_message") {
      const text = stripUiDirectives(payload.message || payload.text || "");
      pushMessage({ type: "user", text });
    }
    if (row.type === "event_msg" && payload.type === "agent_message") {
      const text = stripUiDirectives(payload.message || payload.text || "");
      pushMessage({ type: "assistant", text });
    }
  }
  return messages.slice(-limit);
}

function handoffForThread(threadId, reason) {
  const filePath = findSessionFileForThread(threadId);
  if (!filePath) return { text: "", title: "" };
  const messages = [];
  const pushMessage = (entry) => {
    if (!entry.text) return;
    const previous = messages[messages.length - 1];
    if (previous && previous.role === entry.role && previous.text === entry.text) return;
    messages.push(entry);
  };
  for (const line of readSessionTail(filePath)) {
    if (!line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const payload = row.payload || {};
    if (row.type === "response_item" && payload.type === "message") {
      const text = excerptText(textFromResponseContent(payload.content));
      pushMessage({ role: payload.role === "assistant" ? "assistant" : "user", text });
    }
    if (row.type === "event_msg" && payload.type === "user_message") {
      const text = excerptText(payload.message || payload.text || "");
      pushMessage({ role: "user", text });
    }
    if (row.type === "event_msg" && payload.type === "agent_message") {
      const text = excerptText(payload.message || payload.text || "");
      pushMessage({ role: "assistant", text });
    }
  }
  const recent = messages.filter((message) => message.text).slice(-8);
  if (!recent.length) return { text: "", title: "" };
  const title = lightweightHandoffTitle({ messages: recent, threadId, fallback: projectTitleFromWorkdir() });
  const body = recent.map((message) => `- ${message.role}: ${message.text}`).join("\n");
  const text = [
    title,
    "",
    "旧チャットが重すぎてモバイルで安全に再開できなかったため、新しい軽量チャットへ自動引き継ぎします。",
    `旧thread: ${threadId}`,
    `理由: ${reason}`,
    "",
    "旧チャット末尾から抽出した直近文脈:",
    body,
    "",
    "以後はこの文脈を前提に、ユーザーの次の依頼へ自然に続けてください。必要なら不足分だけ短く確認してください。",
  ].join("\n");
  return { text, title };
}

function summarizeItem(item) {
  if (item.type === "userMessage") {
    const textParts = [];
    const attachments = [];
    for (const part of item.content) {
      if (part.type === "text") {
        textParts.push(part.text);
        continue;
      }
      if (part.type === "localImage" && part.path) {
        const absolutePath = path.resolve(part.path);
        if (absolutePath.startsWith(`${uploadDir}${path.sep}`)) {
          attachments.push({
            name: path.basename(absolutePath),
            url: `/api/uploaded?name=${encodeURIComponent(path.basename(absolutePath))}`,
          });
        } else if (absolutePath.startsWith(`${root}${path.sep}`) && isImagePath(absolutePath)) {
          const relative = path.relative(root, absolutePath);
          attachments.push({ name: path.basename(absolutePath), url: `/api/file/raw?path=${encodeURIComponent(relative)}` });
        }
      }
    }
    return {
      type: "user",
      text: textParts.join("\n") || (attachments.length ? "添付画像" : ""),
      attachments,
    };
  }
  if (item.type === "agentMessage") return { type: "assistant", text: stripUiDirectives(item.text) };
  if (item.type === "commandExecution") return { type: "status", text: `$ ${item.command}` };
  if (item.type === "fileChange") return { type: "status", text: `file changes: ${item.status}` };
  return null;
}

function summarizeLiveItem(item, phase = "completed") {
  if (!item) return null;
  if (item.type === "commandExecution") {
    return phase === "started" ? `$ ${item.command}` : null;
  }
  if (item.type === "fileChange") {
    return `file changes: ${item.status}`;
  }
  return null;
}

function historyFromThread(thread) {
  const limit = Math.max(1, Math.min(80, Number(arguments[1] || historyLimit)));
  const history = [];
  for (const turn of thread.turns || []) {
    for (const item of turn.items || []) {
      const entry = summarizeItem(item);
      if (entry && entry.text) history.push(entry);
    }
  }
  return history.slice(-limit);
}

function capHistory(history) {
  return history.slice(-historyLimit);
}

function projectTitleFromWorkdir(targetWorkdir = workdir) {
  const cwd = String(targetWorkdir || "").replace(/\/+$/, "");
  const project = cwd.split("/").filter(Boolean).pop() || "このプロジェクト";
  return `${project} の共有チャット`;
}

function liveBridgeThreads() {
  return Array.from(bridges.values())
    .filter((bridge) => bridge.ready && bridge.threadId)
    .map((bridge) => {
      const override = threadTitleOverrides.get(bridge.threadId);
      const name = override?.name || threadLabelFromHistory(bridge.history, projectTitleFromWorkdir());
      const lastEntry = [...bridge.history].reverse().find((entry) => entry.text)?.text || "";
      return {
        id: bridge.threadId,
        name,
        preview: override?.preview || lastEntry.split("\n").find(Boolean) || "Ocdex Lite live chat",
        cwd: workdir,
        updatedAt: Date.now(),
        createdAt: Date.now(),
        live: true,
      };
    });
}

function findLiveBridgeThread(threadId) {
  return Array.from(bridges.values()).find((bridge) => bridge.ready && bridge.threadId === threadId) || null;
}

class SharedBridge {
  constructor(requestedThreadId, bridgeKey) {
    this.requestedThreadId = requestedThreadId;
    this.bridgeKey = bridgeKey;
    this.clients = new Set();
    this.nextId = 1;
    this.pending = new Map();
    this.threadId = null;
    this.activeTurnId = null;
    this.ready = false;
    this.createdAt = Date.now();
    this.history = [];
    this.turnQueue = [];
    this.pendingHandoffText = "";
    this.pendingHandoffTitle = "";
    this.idleDisposeTimer = null;
    this.upstream = null;
    this.startUpstream();
  }

  addClient(browser) {
    this.cancelIdleDispose();
    this.clients.add(browser);
    this.emitTo(browser, "status", { text: "共有Codexブリッジに参加しました。" });
    if (this.ready) {
      this.emitTo(browser, "ready", this.readyPayload());
      this.emitTo(browser, "bridgeState", this.bridgeStatePayload());
    }
    browser.on("close", () => {
      this.clients.delete(browser);
      this.emitBridgeState();
      this.maybeScheduleIdleDispose();
    });
  }

  readyPayload() {
    const override = this.threadId ? threadTitleOverrides.get(this.threadId) : null;
    return {
      threadId: this.threadId,
      threadLabel: override?.name || threadLabelFromHistory(this.history, this.threadId || "共有チャット"),
      model,
      workdir,
      shared: true,
      clients: this.clients.size,
      activeTurn: Boolean(this.activeTurnId),
      pendingTurnStart: this.hasPendingTurnStart(),
      queuedTurns: this.turnQueue.length,
      history: this.history,
    };
  }

  bridgeStatePayload() {
    return {
      threadId: this.threadId,
      clients: this.clients.size,
      activeTurn: Boolean(this.activeTurnId),
      pendingTurnStart: this.hasPendingTurnStart(),
      queuedTurns: this.turnQueue.length,
    };
  }

  emit(type, payload = {}) {
    const body = JSON.stringify({ type, ...payload });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(body);
    }
  }

  emitTo(client, type, payload = {}) {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type, ...payload }));
  }

  emitBridgeState() {
    this.emit("bridgeState", this.bridgeStatePayload());
  }

  clearPendingTimeout(id) {
    const timeout = this.pending.get(`${id}:timeout`);
    if (timeout) clearTimeout(timeout);
    this.pending.delete(`${id}:timeout`);
  }

  failStartup(message) {
    if (this.startupGuardTimer) clearTimeout(this.startupGuardTimer);
    this.startupGuardTimer = null;
    this.emit("error", { text: "Codexの起動応答が止まったため、接続を作り直します。" });
    this.emit("status", { text: message });
    bridges.delete(this.bridgeKey);
    try {
      this.upstream.terminate?.();
      this.upstream.close?.();
    } catch {}
    for (const client of this.clients) {
      try {
        client.close(1011, "Codex bridge startup timed out");
      } catch {}
    }
  }

  startStartupGuard() {
    if (this.startupGuardTimer) clearTimeout(this.startupGuardTimer);
    this.startupGuardTimer = setTimeout(() => {
      if (this.ready) return;
      if (Array.from(this.pending.values()).includes("thread/resume")) {
        this.restartAsNewThread("旧threadの再開応答が止まったため、新しい軽量共有threadを開始します。");
        return;
      }
      this.failStartup("Codex bridge startup timed out before ready");
    }, bridgeStartupTimeoutMs);
    this.startupGuardTimer.unref?.();
  }

  startUpstream() {
    this.createdAt = Date.now();
    this.startStartupGuard();
    this.upstream = createUpstreamWebSocket();
    this.bindUpstream();
  }

  restartAsNewThread(reason) {
    const oldThreadId = this.requestedThreadId;
    const handoff = handoffForThread(oldThreadId, reason);
    this.pendingHandoffText = handoff.text;
    this.pendingHandoffTitle = handoff.title;
    this.requestedThreadId = null;
    this.threadId = null;
    this.ready = false;
    this.history = [];
    this.pending.clear();
    this.emit("status", { text: reason });
    if (this.pendingHandoffText) this.emit("status", { text: "旧チャット末尾から引き継ぎメモを作成しました。" });
    try {
      this.upstream?.terminate?.();
      this.upstream?.close?.();
    } catch {}
    this.startUpstream();
  }

  request(method, params) {
    const id = this.nextId++;
    this.upstream.send(JSON.stringify({ id, method, params }));
    if (method === "thread/start" || method === "thread/resume") {
      const timeout = setTimeout(() => {
        if (this.pending.get(id) !== method) return;
        this.pending.delete(id);
        this.clearPendingTimeout(id);
        if (method === "thread/resume") {
          this.restartAsNewThread(`旧threadの再開が${Math.round(bridgeStartupTimeoutMs / 1000)}秒以内に完了しなかったため、新しい軽量共有threadを開始します。`);
          return;
        }
        this.failStartup(`Codex app-server did not answer ${method} within ${Math.round(bridgeStartupTimeoutMs / 1000)}s`);
      }, bridgeStartupTimeoutMs);
      timeout.unref?.();
      this.pending.set(`${id}:timeout`, timeout);
    }
    return id;
  }

  hasPendingTurnStart() {
    return Array.from(this.pending.values()).includes("turn/start");
  }

  cancelIdleDispose() {
    if (!this.idleDisposeTimer) return;
    clearTimeout(this.idleDisposeTimer);
    this.idleDisposeTimer = null;
  }

  maybeScheduleIdleDispose() {
    if (
      !shouldDisposeIdleBridge({
        clientCount: this.clients.size,
        activeTurnId: this.activeTurnId,
        pendingTurnStart: this.hasPendingTurnStart(),
        queuedTurns: this.turnQueue.length,
      })
    ) {
      return;
    }
    if (this.idleDisposeTimer) return;
    this.idleDisposeTimer = setTimeout(() => {
      this.idleDisposeTimer = null;
      if (
        !shouldDisposeIdleBridge({
          clientCount: this.clients.size,
          activeTurnId: this.activeTurnId,
          pendingTurnStart: this.hasPendingTurnStart(),
          queuedTurns: this.turnQueue.length,
        })
      ) {
        return;
      }
      this.upstream.close();
      bridges.delete(this.bridgeKey);
    }, bridgeIdleDisposeMs);
    this.idleDisposeTimer.unref?.();
  }

  promoteBridgeKey() {
    if (!shouldPromoteBridgeKey({ bridgeKey: this.bridgeKey, threadId: this.threadId })) return;
    const previousKey = this.bridgeKey;
    if (bridges.has(this.threadId) && bridges.get(this.threadId) !== this) return;
    if (bridges.get(previousKey) !== this) return;
    this.bridgeKey = this.threadId;
    bridges.delete(previousKey);
    bridges.set(this.bridgeKey, this);
  }

  bindUpstream() {
    this.upstream.on("open", () => {
      this.request("initialize", {
        clientInfo: { name: "codex-phone-bridge", title: "Codex Phone Bridge", version: "0.1.0" },
      });
      this.upstream.send(JSON.stringify({ method: "initialized", params: {} }));
      this.startCodexThread(this.requestedThreadId ? "thread/resume" : "thread/start");
      this.emit("status", { text: this.requestedThreadId ? "既存threadを再開中..." : "新しいthreadを開始中..." });
    });

    this.upstream.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch (error) {
        this.emit("error", { text: `Codexから壊れた通信メッセージを受信しました: ${error.message}` });
        return;
      }
      const pendingMethod = this.pending.get(msg.id);

      if (pendingMethod === "thread/start" || pendingMethod === "thread/resume") {
        this.pending.delete(msg.id);
        this.clearPendingTimeout(msg.id);
        if (msg.error) {
          const message = msg.error.message || JSON.stringify(msg.error);
          if (pendingMethod === "thread/resume" && /no rollout found|not found|Max payload size exceeded|payload/i.test(message)) {
            const reason = /payload/i.test(message)
              ? "元のthreadの履歴が大きすぎるため、新しい軽量共有threadを開始します。"
              : "元のthreadが見つからないため、新しい共有threadを開始します。";
            this.emit("status", { text: reason });
            const handoff = handoffForThread(this.requestedThreadId, reason);
            this.pendingHandoffText = handoff.text;
            this.pendingHandoffTitle = handoff.title;
            if (this.pendingHandoffText) this.emit("status", { text: "旧チャット末尾から引き継ぎメモを作成しました。" });
            this.requestedThreadId = null;
            this.history = [];
            this.startCodexThread("thread/start");
            return;
          }
          this.emit("error", { text: message });
          return;
        }
        this.threadId = msg.result.thread.id;
        if (this.pendingHandoffTitle) {
          threadTitleOverrides.set(this.threadId, {
            name: this.pendingHandoffTitle,
            preview: "旧チャットから自動引き継ぎした軽量チャット",
          });
        }
        this.promoteBridgeKey();
        this.ready = true;
        if (this.startupGuardTimer) clearTimeout(this.startupGuardTimer);
        this.startupGuardTimer = null;
        this.history = historyFromThread(msg.result.thread);
        this.emit("ready", this.readyPayload());
        this.emitBridgeState();
        if (this.requestedThreadId) this.emit("status", { text: `既存threadを再開しました: ${this.threadId}` });
        if (this.pendingHandoffText) {
          const handoff = this.pendingHandoffText;
          this.pendingHandoffText = "";
          this.pendingHandoffTitle = "";
          this.emit("status", { text: "新しい軽量チャットへ引き継ぎを送信します。" });
          this.startPrompt(handoff, [], { approvalPolicy: "on-request", sandboxMode: "workspace-write" });
        }
        return;
      }

      if (pendingMethod === "turn/start") {
        this.pending.delete(msg.id);
        if (msg.error) {
          this.emit("error", { text: msg.error.message || JSON.stringify(msg.error) });
          this.startNextQueuedTurn();
          this.emitBridgeState();
          this.maybeScheduleIdleDispose();
        } else {
          this.activeTurnId = msg.result.turn.id;
          this.emit("turn", { status: "started", turnId: this.activeTurnId });
          this.emitBridgeState();
        }
        return;
      }

      if (msg.method === "item/agentMessage/delta") {
        this.emit("assistantDelta", { text: msg.params.delta });
        return;
      }

      if (msg.method === "item/started") {
        const text = summarizeLiveItem(msg.params.item, "started");
        if (text) this.emit("status", { text });
        return;
      }

      if (msg.method === "item/completed") {
        const entry = summarizeItem(msg.params.item);
        if (entry && entry.type !== "user") this.appendHistory(entry);
        const text = summarizeLiveItem(msg.params.item, "completed");
        if (text) this.emit("status", { text });
        this.emit("event", { event: msg });
        return;
      }

      if (msg.method === "turn/completed") {
        this.activeTurnId = null;
        this.emit("turn", { status: "completed", turnId: msg.params.turnId });
        this.syncHistory("turn completed");
        this.startNextQueuedTurn();
        this.emitBridgeState();
        this.maybeScheduleIdleDispose();
        return;
      }

      if (msg.method && msg.method.endsWith("/requestApproval")) {
        this.emit("approval", { request: msg });
        return;
      }

      if (msg.method === "error") {
        this.emit("error", { text: msg.params.message || JSON.stringify(msg.params) });
        return;
      }

      this.emit("event", { event: msg });
    });

    this.upstream.on("error", (error) => this.emit("error", { text: error.message }));
    this.upstream.on("close", () => this.emit("status", { text: "Codex接続が閉じました" }));
  }

  prompt(text, attachments = [], options = {}) {
    if (!this.threadId) {
      this.emit("error", { text: "Thread is not ready yet" });
      return;
    }
    if (this.activeTurnId || this.hasPendingTurnStart()) {
      this.turnQueue.push({ text, attachments, options });
      this.emit("status", { text: `キューに追加しました（${this.turnQueue.length}件待機）` });
      this.emitBridgeState();
      return;
    }
    this.startPrompt(text, attachments, options);
  }

  startNextQueuedTurn() {
    if (!this.ready || this.activeTurnId || this.hasPendingTurnStart() || !this.turnQueue.length) return;
    const next = this.turnQueue.shift();
    this.emit("status", { text: `キューから送信中（残り${this.turnQueue.length}件）` });
    this.emitBridgeState();
    this.startPrompt(next.text, next.attachments, next.options);
  }

  syncHistory(reason) {
    if (!this.threadId || !historySyncEnabled) return;
    runHistorySync({
      threadId: this.threadId,
      workdir,
      request: appServerRequest,
      enabled: historySyncEnabled,
      limit: historySyncLimit,
    })
      .then((result) => {
        if (!result.skipped) this.emit("status", { text: `履歴同期を更新しました (${reason})` });
      })
      .catch((error) => {
        this.emit("status", { text: `履歴同期に失敗しました: ${error.message}` });
    });
  }

  startCodexThread(method) {
    const params =
      method === "thread/resume"
        ? {
            threadId: this.requestedThreadId,
            model,
            cwd: workdir,
            approvalPolicy: "on-request",
            sandbox: "workspace-write",
          }
        : {
            model,
            cwd: workdir,
            approvalPolicy: "on-request",
            sandbox: "workspace-write",
          };
    const id = this.request(method, params);
    this.pending.set(id, method);
  }

  startPrompt(text, attachments = [], options = {}) {
    const input = [{ type: "text", text, text_elements: [] }];
    const savedImages = [];
    for (const attachment of attachments || []) {
      const saved = attachment.uploadedName ? uploadedAttachmentToInput(attachment) : saveDataUrlAttachment(attachment);
      if (saved) {
        input.push(saved.input);
        savedImages.push(saved.preview);
      }
    }
    const params = {
      threadId: this.threadId,
      input,
    };
    if (options.model) params.model = options.model;
    if (options.approvalPolicy) params.approvalPolicy = options.approvalPolicy;
    if (options.sandboxMode) params.sandboxPolicy = sandboxPolicyForMode(options.sandboxMode);
    const id = this.request("turn/start", {
      ...params,
    });
    this.pending.set(id, "turn/start");
    this.emitBridgeState();
    const displayText = savedImages.length ? `${text}\n\n添付: ${savedImages.map((image) => image.name).join(", ")}` : text;
    this.appendHistory({ type: "user", text: displayText, attachments: savedImages });
    this.emit("user", { text: displayText, attachments: savedImages });
  }

  appendHistory(entry) {
    this.history.push(entry);
    this.history = capHistory(this.history);
  }

  approval(requestMsg, decision) {
    if (!requestMsg || !requestMsg.id || !requestMsg.method) return;
    const accept = decision === "accept";
    let result;
    if (requestMsg.method === "item/commandExecution/requestApproval") {
      result = { decision: accept ? "accept" : "decline" };
    } else if (requestMsg.method === "item/fileChange/requestApproval") {
      result = { decision: accept ? "accept" : "decline" };
    } else {
      result = accept ? { decision: "accept" } : { decision: "decline" };
    }
    this.upstream.send(JSON.stringify({ id: requestMsg.id, result }));
    this.emit("status", { text: accept ? "承認しました" : "拒否しました" });
  }
}

function getBridge(threadId, connectionId = crypto.randomUUID()) {
  if (!threadId) {
    const reusable = Array.from(bridges.values()).find((bridge) => !bridge.requestedThreadId && bridge.ready && bridge.threadId);
    if (reusable) return reusable;
    for (const [key, bridge] of bridges.entries()) {
      if (!bridge.requestedThreadId && !bridge.ready && Date.now() - bridge.createdAt > bridgeStartupTimeoutMs) {
        bridges.delete(key);
        try {
          bridge.upstream.terminate?.();
          bridge.upstream.close?.();
        } catch {}
      }
    }
  }
  const key = bridgeKeyForRequest(threadId, connectionId);
  if (!bridges.has(key)) bridges.set(key, new SharedBridge(threadId, key));
  return bridges.get(key);
}

function bindBrowser(browser, phoneToken, threadId) {
  const bridge = getBridge(threadId);
  bridge.addClient(browser);

  browser.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (error) {
      bridge.emitTo(browser, "error", { text: `Invalid message: ${error.message}` });
      browser.close();
      return;
    }
    if (msg.token !== phoneToken) {
      bridge.emitTo(browser, "error", { text: "Invalid token" });
      browser.close();
      return;
    }
    if (msg.type === "prompt") bridge.prompt(msg.text, msg.attachments, msg.options);
    if (msg.type === "approval") bridge.approval(msg.request, msg.decision);
  });
  browser.on("error", (error) => {
    bridge.emitTo(browser, "error", { text: error.message || "browser websocket error" });
  });
}

async function main() {
  const phoneToken = getToken();
  const codex = shouldStartCodexServer ? startCodexServer() : null;
  if (shouldStartCodexServer) {
    await waitForReady();
  } else {
    await appServerRequest("thread/loaded/list", { cursor: null, limit: 1 });
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/api/info") {
      if (!requireToken(url, phoneToken, res)) return;
      sendJson(res, 200, { model, workdir, codexUrl, codexSocketPath: codexSocketPath || null, managedCodexServer: shouldStartCodexServer, tokenRequired: true });
      return;
    }
    if (url.pathname === "/api/threads") {
      if (!requireToken(url, phoneToken, res)) return;
      try {
        const limit = Math.max(1, Math.min(80, Number(url.searchParams.get("limit") || threadListLimit)));
        const result = await appServerRequest("thread/list", {
          limit,
          sortKey: "updated_at",
          sortDirection: "desc",
          archived: false,
          useStateDbOnly: true,
        });
        const sessionThreads = listSessionThreads({
          sessionsDir,
          limit,
          fallbackCwd: workdir,
          fallbackName: projectTitleFromWorkdir(),
        });
        const sessionById = new Map(sessionThreads.map((thread) => [thread.id, thread]));
        const data = (Array.isArray(result.data) ? result.data : []).map((thread) => {
          const override = threadTitleOverrides.get(thread.id);
          if (override) return { ...thread, name: override.name, preview: override.preview || thread.preview };
          const sessionThread = sessionById.get(thread.id);
          if (!sessionThread) return thread;
          return {
            ...thread,
            name: thread.name || sessionThread.name,
            preview: thread.preview || sessionThread.preview,
            cwd: thread.cwd || sessionThread.cwd,
            source: thread.source || sessionThread.source,
          };
        });
        const seen = new Set(data.map((thread) => thread.id));
        const live = liveBridgeThreads().filter((thread) => !seen.has(thread.id));
        for (const thread of live) seen.add(thread.id);
        result.data = [...live, ...data, ...sessionThreads.filter((thread) => !seen.has(thread.id))].slice(0, limit);
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
      return;
    }
    if (url.pathname === "/api/models") {
      if (!requireToken(url, phoneToken, res)) return;
      try {
        const result = await appServerRequest("model/list", { limit: 80, includeHidden: false });
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
      return;
    }
    if (url.pathname === "/api/plugins") {
      if (!requireToken(url, phoneToken, res)) return;
      try {
        const result = await appServerRequest("plugin/list", { cwds: [workdir] });
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
      return;
    }
    if (url.pathname === "/api/config") {
      if (!requireToken(url, phoneToken, res)) return;
      try {
        const [config, auth] = await Promise.allSettled([
          appServerRequest("config/read", { includeLayers: false, cwd: workdir }),
          appServerRequest("getAuthStatus", {}),
        ]);
        sendJson(res, 200, {
          config: config.status === "fulfilled" ? config.value : null,
          auth: auth.status === "fulfilled" ? auth.value : null,
          errors: [config, auth]
            .filter((result) => result.status === "rejected")
            .map((result) => result.reason.message),
        });
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
      return;
    }
    if (url.pathname === "/api/status") {
      if (!requireToken(url, phoneToken, res)) return;
      sendJson(res, 200, {
        workdir,
        model,
        codexUrl,
        codexSocketPath: codexSocketPath || null,
        managedCodexServer: shouldStartCodexServer,
        historySyncEnabled,
        uiPort,
        codexPort,
        bridges: Array.from(bridges.values()).map((bridge) => ({
          threadId: bridge.threadId,
          clients: bridge.clients.size,
          ready: bridge.ready,
          activeTurn: Boolean(bridge.activeTurnId),
          pendingTurnStart: bridge.hasPendingTurnStart(),
          queuedTurns: bridge.turnQueue.length,
        })),
      });
      return;
    }
    if (url.pathname === "/api/upload" && req.method === "POST") {
      if (!requireToken(url, phoneToken, res)) return;
      try {
        const body = await readJsonBody(req);
        const saved = saveUploadedDataUrl(body);
        if (!saved) {
          sendJson(res, 400, { error: "valid image dataUrl is required" });
          return;
        }
        sendJson(res, 200, saved);
      } catch (error) {
        sendJson(res, /too large/i.test(error.message) ? 413 : 400, { error: error.message });
      }
      return;
    }
    if (url.pathname === "/api/history-sync") {
      if (!requireToken(url, phoneToken, res)) return;
      const threadId = url.searchParams.get("thread");
      if (!threadId) {
        sendJson(res, 400, { error: "thread is required" });
        return;
      }
      try {
        const result = await runHistorySync({
          threadId,
          workdir,
          request: appServerRequest,
          enabled: historySyncEnabled,
          limit: historySyncLimit,
        });
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
      return;
    }
    if (url.pathname === "/api/thread") {
      if (!requireToken(url, phoneToken, res)) return;
      const threadId = url.searchParams.get("thread");
      const limit = Math.max(1, Math.min(80, Number(url.searchParams.get("limit") || historyLimit)));
      if (!threadId) {
        sendJson(res, 400, { error: "thread is required" });
        return;
      }
      const liveBridge = findLiveBridgeThread(threadId);
      if (liveBridge) {
        sendJson(res, 200, {
          threadId,
          live: true,
          history: liveBridge.history.slice(-limit),
        });
        return;
      }
      try {
        let thread;
        try {
          const result = await appServerRequest("thread/read", {
            threadId,
            includeTurns: true,
          });
          thread = result.thread || result;
        } catch (readError) {
          const result = await appServerRequest("thread/resume", {
            threadId,
            model,
            cwd: workdir,
            approvalPolicy: "on-request",
            sandbox: "workspace-write",
          });
          thread = result.thread;
        }
        sendJson(res, 200, { threadId: thread.id || threadId, history: historyFromThread(thread, limit) });
      } catch (error) {
        const fallbackHistory = sessionHistoryForThread(threadId, limit);
        if (fallbackHistory.length) {
          sendJson(res, 200, {
            threadId,
            history: fallbackHistory,
            source: "session-file",
            warning: error.message,
          });
          return;
        }
        sendJson(res, 500, { error: error.message });
      }
      return;
    }
    if (url.pathname === "/api/automations") {
      if (!requireToken(url, phoneToken, res)) return;
      sendJson(res, 200, { data: readAutomations() });
      return;
    }
    if (url.pathname === "/api/artifacts") {
      if (!requireToken(url, phoneToken, res)) return;
      sendJson(res, 200, { data: discoverArtifacts() });
      return;
    }
    if (url.pathname === "/api/uploaded") {
      if (!requireToken(url, phoneToken, res)) return;
      const target = safeUploadPath(url.searchParams.get("name"));
      if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile() || !isImagePath(target)) {
        sendJson(res, 404, { error: "image not found" });
        return;
      }
      res.writeHead(200, { "content-type": mimeForPath(target), "cache-control": "no-store" });
      fs.createReadStream(target).pipe(res);
      return;
    }
    if (url.pathname === "/api/file/raw") {
      if (!requireToken(url, phoneToken, res)) return;
      const target = safeRelativePath(url.searchParams.get("path"));
      if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile() || !isImagePath(target)) {
        sendJson(res, 404, { error: "image not found" });
        return;
      }
      res.writeHead(200, { "content-type": mimeForPath(target), "cache-control": "no-store" });
      fs.createReadStream(target).pipe(res);
      return;
    }
    if (url.pathname === "/api/file") {
      if (!requireToken(url, phoneToken, res)) return;
      const target = safeRelativePath(url.searchParams.get("path"));
      if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
        sendJson(res, 404, { error: "file not found" });
        return;
      }
      if (isImagePath(target)) {
        sendJson(res, 200, {
          path: path.relative(root, target),
          kind: "image",
          mimeType: mimeForPath(target),
          imageUrl: `/api/file/raw?path=${encodeURIComponent(path.relative(root, target))}`,
        });
        return;
      }
      sendJson(res, 200, {
        path: path.relative(root, target),
        kind: /\.md(?:own)?$/i.test(target) ? "markdown" : "text",
        text: fs.readFileSync(target, "utf8").slice(0, 80_000),
      });
      return;
    }
    serveStatic(req, res);
  });

  const wss = new WebSocket.Server({ noServer: true, perMessageDeflate: false, maxPayload: wsMaxPayload });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname !== "/bridge") {
      socket.destroy();
      return;
    }
    if (url.searchParams.get("token") !== phoneToken) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    const threadId = url.searchParams.get("thread") || null;
    wss.handleUpgrade(req, socket, head, (ws) => bindBrowser(ws, phoneToken, threadId));
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`[ocdex] port ${uiPort} is already in use. Another Ocdex Lite bridge is probably already running.`);
      console.error(`[ocdex] open the existing bridge URL, stop the old process, or start with PHONE_UI_PORT=<other-port> npm run phone.`);
    } else {
      console.error(`[ocdex] server error: ${error.message}`);
    }
    if (codex) codex.kill("SIGINT");
    process.exit(1);
  });

  server.listen(uiPort, "0.0.0.0", () => {
    const urls = bridgeUrls(lanAddresses(), uiPort, phoneToken);
    console.log("");
    console.log("Codex shared browser bridge is ready.");
    for (const url of urls) console.log(`  ${url}`);
    console.log("");
    console.log(`Workdir: ${workdir}`);
    console.log(`Model:   ${model}`);
    console.log(`Codex:   ${shouldStartCodexServer ? codexUrl : codexSocketPath || codexUrl}`);
    console.log("Open the same URL from PC and phone to share one bridge thread.");
    console.log("Press Ctrl+C to stop.");

    notifyBridgeUrls(urls).then((results) => {
      for (const result of results) {
        if (result.ok) console.log(`[notify] sent via ${result.type}`);
        else console.warn(`[notify] ${result.type} failed: ${result.error}`);
      }
    });
  });

  const shutdown = () => {
    if (codex) codex.kill("SIGINT");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", () => {
    if (codex) codex.kill("SIGINT");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
