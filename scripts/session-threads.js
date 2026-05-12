const fs = require("fs");
const path = require("path");
const { threadLabelFromHistory } = require("./thread-title");

function stripUiDirectives(text) {
  return String(text || "")
    .replace(/(?:^|\n)::[a-z0-9-]+\{[^\n]*\}(?=\n|$)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function findSessionFiles(dir, depth = 0, maxDepth = 5) {
  if (!dir || depth > maxDepth || !fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      files.push(target);
      continue;
    }
    if (entry.isDirectory()) files.push(...findSessionFiles(target, depth + 1, maxDepth));
  }
  return files;
}

function pushHistory(history, entry) {
  if (!entry.text) return;
  const previous = history[history.length - 1];
  if (previous && previous.type === entry.type && previous.text === entry.text) return;
  history.push(entry);
}

function sessionFallbackName(id, createdAt) {
  const date = Number.isFinite(createdAt) ? new Date(createdAt).toISOString().slice(0, 10) : "";
  const shortId = String(id || "").slice(0, 8);
  return ["過去のチャット", date, shortId ? `(${shortId})` : ""].filter(Boolean).join(" ");
}

function parseSessionThreadFile(filePath, { fallbackCwd = "", fallbackName = "過去のチャット", historyLimit = 20 } = {}) {
  let meta = {};
  const history = [];
  for (const line of readSessionTail(filePath)) {
    if (!line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const payload = row.payload || {};
    if (row.type === "session_meta" && payload.id) meta = { ...payload };
    if (row.type === "response_item" && payload.type === "message") {
      if (payload.role !== "user" && payload.role !== "assistant") continue;
      const text = stripUiDirectives(textFromResponseContent(payload.content));
      pushHistory(history, { type: payload.role === "assistant" ? "assistant" : "user", text });
    }
    if (row.type === "event_msg" && payload.type === "user_message") {
      const text = stripUiDirectives(payload.message || payload.text || "");
      pushHistory(history, { type: "user", text });
    }
    if (row.type === "event_msg" && payload.type === "agent_message") {
      const text = stripUiDirectives(payload.message || payload.text || "");
      pushHistory(history, { type: "assistant", text });
    }
  }
  const idFromName = path.basename(filePath).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1] || "";
  const stat = fs.statSync(filePath);
  const id = meta.id || idFromName;
  if (!id) return null;
  const createdAt = meta.timestamp ? Date.parse(meta.timestamp) : stat.birthtimeMs || stat.mtimeMs;
  const updatedAt = stat.mtimeMs || createdAt;
  const cappedHistory = history.slice(-historyLimit);
  const lastEntry = [...cappedHistory].reverse().find((entry) => entry.text)?.text || "";
  const fallbackLabel = sessionFallbackName(id, createdAt) || fallbackName;
  return {
    id,
    name: threadLabelFromHistory(cappedHistory, fallbackLabel),
    preview: String(lastEntry).split("\n").find(Boolean) || "session file chat",
    cwd: meta.cwd || fallbackCwd,
    updatedAt,
    createdAt,
    source: "session-file",
  };
}

function listSessionThreads({ sessionsDir, limit = 80, fallbackCwd = "", fallbackName = "過去のチャット" } = {}) {
  const files = findSessionFiles(sessionsDir)
    .map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  const threads = [];
  for (const { filePath } of files) {
    if (threads.length >= limit) break;
    try {
      const thread = parseSessionThreadFile(filePath, { fallbackCwd, fallbackName });
      if (thread) threads.push(thread);
    } catch {
      continue;
    }
  }
  return threads;
}

module.exports = {
  findSessionFiles,
  listSessionThreads,
  parseSessionThreadFile,
  readSessionTail,
  stripUiDirectives,
  textFromResponseContent,
};
