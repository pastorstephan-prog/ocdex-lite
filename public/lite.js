const params = new URLSearchParams(location.search);
const token = params.get("token") || localStorage.getItem("codexPhoneToken") || "";
if (token) localStorage.setItem("codexPhoneToken", token);

const log = document.querySelector("#log");
const meta = document.querySelector("#meta");
const state = document.querySelector("#state");
const stateLabel = document.querySelector("#stateLabel");
const composer = document.querySelector("#composer");
const promptInput = document.querySelector("#prompt");
const sendButton = document.querySelector("#send");
const reconnectButton = document.querySelector("#reconnect");
const newThreadButton = document.querySelector("#newThread");
const threadsButton = document.querySelector("#threadsButton");
const threadsPanel = document.querySelector("#threadsPanel");
const closeThreadsButton = document.querySelector("#closeThreads");
const threadsList = document.querySelector("#threadsList");
const fileInput = document.querySelector("#fileInput");
const attachButton = document.querySelector("#attach");
const attachmentsEl = document.querySelector("#attachments");
const accessSelect = document.querySelector("#access");
const modelSelect = document.querySelector("#model");
const voiceButton = document.querySelector("#voice");
const approval = document.querySelector("#approval");
const approvalText = document.querySelector("#approvalText");
const approveButton = document.querySelector("#approve");
const declineButton = document.querySelector("#decline");

let ws = null;
let threadId = params.get("thread") || "";
let reconnectTimer = null;
let assistantBubble = null;
let pendingApproval = null;
let pendingFiles = [];
let lastError = "";
let reconnects = 0;
let threadsLoaded = false;
let connectionSeq = 0;

const maxImageEdge = 1280;
const imageQuality = 0.72;
const maxUploadBytes = 2 * 1024 * 1024;

function setState(next, label) {
  state.dataset.state = next;
  stateLabel.textContent = label || next;
}

function scrollBottom() {
  log.scrollTop = log.scrollHeight;
}

function appendTextWithLinks(parent, text) {
  const source = String(text || "");
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>"')]+)/g;
  let index = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > index) parent.appendChild(document.createTextNode(source.slice(index, match.index)));
    const href = match[2] || match[3];
    const label = match[1] || href;
    try {
      const url = new URL(href);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
      const anchor = document.createElement("a");
      anchor.href = url.href;
      anchor.textContent = label;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      parent.appendChild(anchor);
    } catch {
      parent.appendChild(document.createTextNode(match[0]));
    }
    index = match.index + match[0].length;
  }
  if (index < source.length) parent.appendChild(document.createTextNode(source.slice(index)));
}

function setBubbleText(bubble, text) {
  bubble.rawText = String(text || "");
  bubble.replaceChildren();
  appendTextWithLinks(bubble, bubble.rawText);
}

function addEntry(kind, text, images = []) {
  const normalized = String(text || "").trim();
  if (kind === "error" && normalized === lastError) return null;
  lastError = kind === "error" ? normalized : "";

  const entry = document.createElement("article");
  entry.className = `entry ${kind}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  setBubbleText(bubble, text || "");
  if (images.length) {
    const thumbs = document.createElement("div");
    thumbs.className = "thumbs";
    for (const image of images) {
      const img = document.createElement("img");
      img.src = image.localPreview || image.urlWithToken || withToken(image.url);
      img.alt = image.name || "添付画像";
      thumbs.appendChild(img);
    }
    bubble.appendChild(thumbs);
  }
  entry.appendChild(bubble);
  log.appendChild(entry);
  while (log.children.length > 80) log.firstElementChild.remove();
  scrollBottom();
  return bubble;
}

function addStatus(text) {
  addEntry("status", text);
}

function withToken(path) {
  if (!path) return "";
  const url = new URL(path, location.href);
  url.searchParams.set("token", token);
  return url.pathname + url.search;
}

function setReady(ready) {
  sendButton.disabled = !ready;
  promptInput.disabled = !ready;
}

function titleForThread(thread) {
  const raw = thread.name || thread.preview || thread.cwd || thread.id || "チャット";
  const firstLine = String(raw).split("\n").find(Boolean) || thread.id || "チャット";
  return firstLine.length > 52 ? `${firstLine.slice(0, 52)}...` : firstLine;
}

function projectForThread(thread) {
  const cwd = String(thread.cwd || "").replace(/\/+$/, "");
  if (!cwd) return "No project";
  return cwd.split("/").filter(Boolean).pop() || cwd;
}

function relativeTime(timestamp) {
  if (!timestamp) return "";
  const ms = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(seconds / 86400);
  if (seconds < 3600) return "今";
  if (hours < 24) return `${hours}時間前`;
  return `${days}日前`;
}

async function apiGet(path) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${path}${separator}token=${encodeURIComponent(token)}`, { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `${response.status} ${response.statusText}`);
  return result;
}

function renderThreads(threads = []) {
  threadsList.replaceChildren();
  if (!threads.length) {
    const empty = document.createElement("div");
    empty.className = "thread-choice";
    empty.textContent = "最近のチャットはありません";
    threadsList.appendChild(empty);
    return;
  }
  for (const thread of threads) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thread-choice";
    const title = document.createElement("strong");
    title.textContent = titleForThread(thread);
    const detail = document.createElement("span");
    detail.textContent = `${projectForThread(thread)} / ${relativeTime(thread.updatedAt || thread.createdAt)}`;
    button.append(title, detail);
    button.addEventListener("click", () => openThread(thread.id));
    threadsList.appendChild(button);
  }
}

async function loadThreads() {
  threadsList.textContent = "読み込み中...";
  const result = await apiGet("/api/threads?limit=8");
  renderThreads(result.data || []);
  threadsLoaded = true;
}

async function toggleThreads() {
  const opening = threadsPanel.classList.contains("hidden");
  threadsPanel.classList.toggle("hidden", !opening);
  if (opening) {
    try {
      await loadThreads();
    } catch (error) {
      addEntry("error", `履歴を読めませんでした: ${error.message}`);
    }
  }
}

async function openThread(nextThreadId) {
  if (!nextThreadId) return;
  threadId = nextThreadId;
  threadsPanel.classList.add("hidden");
  setState("connecting", "履歴を読み込み中");
  try {
    const result = await apiGet(`/api/thread?thread=${encodeURIComponent(threadId)}&limit=12`);
    renderHistory(result.history || []);
  } catch (error) {
    addEntry("error", `チャットを読めませんでした: ${error.message}`);
  }
  connect();
}

function renderHistory(history = []) {
  log.replaceChildren();
  for (const entry of history.slice(-12)) addEntry(entry.type, entry.text, entry.attachments || []);
}

function connect() {
  if (!token) {
    setState("error", "tokenがありません");
    addEntry("error", "Mac側のURLをそのまま開いてください。");
    return;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const previous = ws;
  if (previous && previous.readyState !== WebSocket.CLOSED) {
    previous.ocdexIntentionalClose = true;
    previous.close();
  }
  setReady(false);
  setState("connecting", "Codexに接続中");
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const threadParam = threadId ? `&thread=${encodeURIComponent(threadId)}` : "";
  const socket = new WebSocket(`${proto}//${location.host}/bridge?token=${encodeURIComponent(token)}${threadParam}`);
  const seq = ++connectionSeq;
  ws = socket;

  socket.addEventListener("open", () => {
    if (socket !== ws || seq !== connectionSeq) return;
    reconnects = 0;
    meta.textContent = "Macにつながりました";
  });

  socket.addEventListener("message", (event) => {
    if (socket !== ws || seq !== connectionSeq) return;
    const msg = JSON.parse(event.data);
    if (msg.type === "ready") {
      const previousThreadId = threadId;
      threadId = msg.threadId || threadId;
      if (threadId && threadId !== previousThreadId) threadsLoaded = false;
      history.replaceState(null, "", `?token=${encodeURIComponent(token)}${threadId ? `&thread=${encodeURIComponent(threadId)}` : ""}`);
      renderHistory(msg.history || []);
      setReady(true);
      setState("ready", "待機中");
      meta.textContent = `${msg.clients || 1}端末 / ${msg.workdir || ""}`;
      addStatus("共有チャットに接続しました。");
      return;
    }
    if (msg.type === "user") {
      assistantBubble = null;
      setState("running", "処理中");
      addEntry("user", msg.text, msg.attachments || []);
      return;
    }
    if (msg.type === "assistantDelta") {
      setState("streaming", "回答中");
      if (!assistantBubble) assistantBubble = addEntry("assistant", "");
      assistantBubble.rawText = `${assistantBubble.rawText || ""}${msg.text || ""}`;
      assistantBubble.textContent = assistantBubble.rawText;
      scrollBottom();
      return;
    }
    if (msg.type === "turn" && msg.status === "completed") {
      if (assistantBubble) setBubbleText(assistantBubble, assistantBubble.rawText || assistantBubble.textContent || "");
      assistantBubble = null;
      setState("ready", "完了");
      threadsLoaded = false;
      if (!threadsPanel.classList.contains("hidden")) loadThreads().catch(() => {});
      return;
    }
    if (msg.type === "approval") {
      pendingApproval = msg.request;
      approvalText.textContent = JSON.stringify(msg.request.params, null, 2);
      approval.classList.remove("hidden");
      setState("running", "承認待ち");
      return;
    }
    if (msg.type === "status") {
      addStatus(msg.text);
      return;
    }
    if (msg.type === "error") {
      const friendly = /Max payload size exceeded/i.test(msg.text || "")
        ? "送信が大きすぎました。画像を1枚だけにして再読み込みしてください。"
        : msg.text;
      setState("error", "エラー");
      addEntry("error", friendly);
    }
  });

  socket.addEventListener("close", () => {
    if (socket.ocdexIntentionalClose || socket !== ws || seq !== connectionSeq) return;
    setReady(false);
    setState("disconnected", "切断・再接続待ち");
    const delay = Math.min(20_000, 2500 + reconnects * 2500);
    reconnects += 1;
    if (!document.hidden) reconnectTimer = setTimeout(connect, delay);
  });
}

function estimateDataUrlBytes(dataUrl) {
  const base64 = String(dataUrl || "").split(",", 2)[1] || "";
  return Math.round((base64.length * 3) / 4);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした"));
    };
    image.src = url;
  });
}

async function compressImage(file) {
  const image = await loadImage(file);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  let edge = maxImageEdge;
  let quality = imageQuality;
  let dataUrl = "";

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const scale = Math.min(1, edge / Math.max(naturalWidth, naturalHeight));
    canvas.width = Math.max(1, Math.round(naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(naturalHeight * scale));
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (estimateDataUrlBytes(dataUrl) <= maxUploadBytes) break;
    edge = Math.max(640, Math.round(edge * 0.75));
    quality = Math.max(0.45, quality - 0.08);
  }

  const size = estimateDataUrlBytes(dataUrl);
  if (size > maxUploadBytes) throw new Error(`${file.name} が大きすぎます。少しトリミングしてから送ってください。`);
  return {
    name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
    dataUrl,
    size,
  };
}

async function uploadImage(file) {
  const compressed = await compressImage(file);
  const response = await fetch(`/api/upload?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(compressed),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `${response.status} ${response.statusText}`);
  return {
    name: result.name,
    uploadedName: result.uploadedName,
    url: result.url,
    localPreview: compressed.dataUrl,
  };
}

function renderAttachments() {
  attachmentsEl.replaceChildren();
  for (const file of pendingFiles) {
    const item = document.createElement("div");
    item.className = "attachment";
    const img = document.createElement("img");
    img.src = file.localPreview || withToken(file.url);
    img.alt = file.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      pendingFiles = pendingFiles.filter((candidate) => candidate !== file);
      renderAttachments();
    });
    item.append(img, remove);
    attachmentsEl.appendChild(item);
  }
}

function sendPrompt() {
  const text = promptInput.value.trim();
  if ((!text && !pendingFiles.length) || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(
    JSON.stringify({
      type: "prompt",
      token,
      text: text || "添付画像を確認してください。",
      attachments: pendingFiles.map(({ name, uploadedName, url }) => ({ name, uploadedName, url })),
      options: {
        model: modelSelect.value || undefined,
        approvalPolicy: accessSelect.value === "danger-full-access" ? "never" : "on-request",
        sandboxMode: accessSelect.value,
      },
    }),
  );
  promptInput.value = "";
  pendingFiles = [];
  renderAttachments();
}

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  sendPrompt();
});

attachButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files || []).filter((file) => file.type.startsWith("image/")).slice(0, 3);
  if (!files.length) return;
  try {
    setState("running", "画像を軽量化中");
    for (const file of files) {
      const uploaded = await uploadImage(file);
      pendingFiles.push(uploaded);
      renderAttachments();
    }
    setState("ready", "画像を添付しました");
  } catch (error) {
    setState("error", "添付に失敗");
    addEntry("error", error.message);
  } finally {
    fileInput.value = "";
  }
});

approveButton.addEventListener("click", () => {
  if (!pendingApproval || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "approval", token, decision: "accept", request: pendingApproval }));
  pendingApproval = null;
  approval.classList.add("hidden");
  setState("running", "承認済み");
});

declineButton.addEventListener("click", () => {
  if (!pendingApproval || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "approval", token, decision: "decline", request: pendingApproval }));
  pendingApproval = null;
  approval.classList.add("hidden");
  setState("running", "拒否しました");
});

newThreadButton.addEventListener("click", () => {
  threadId = "";
  threadsLoaded = false;
  history.replaceState(null, "", `?token=${encodeURIComponent(token)}`);
  log.replaceChildren();
  threadsPanel.classList.add("hidden");
  connect();
});

reconnectButton.addEventListener("click", connect);
threadsButton.addEventListener("click", toggleThreads);
closeThreadsButton.addEventListener("click", () => threadsPanel.classList.add("hidden"));

voiceButton.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addEntry("error", "このブラウザでは音声入力を使えません。iPadのキーボード音声入力を使ってください。");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.interimResults = false;
  recognition.onstart = () => setState("running", "音声入力中");
  recognition.onerror = (event) => addEntry("error", `音声入力に失敗しました: ${event.error}`);
  recognition.onresult = (event) => {
    const text = Array.from(event.results)
      .map((result) => result[0]?.transcript || "")
      .join("");
    promptInput.value = `${promptInput.value}${promptInput.value ? "\n" : ""}${text}`.trim();
    setState("ready", "音声入力完了");
  };
  recognition.start();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && (!ws || ws.readyState !== WebSocket.OPEN)) connect();
});
window.addEventListener("online", () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) connect();
});

setReady(false);
connect();
