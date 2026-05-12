function compactWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripTitleNoise(value) {
  const cleaned = compactWhitespace(value)
    .replace(/^[-*#>\s]+/, "")
    .replace(/^reply exactly:\s*/i, "")
    .replace(/^旧チャットが重すぎて.*?自動引き継ぎします。?/i, "")
    .replace(/^軽量引き継ぎ[:：]\s*/i, "")
    .replace(/^軽量版[:：]\s*/i, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "")
    .replace(/\.(png|jpe?g|gif|webp|heic)\b/gi, "")
    .trim();
  return compactWhitespace(cleaned);
}

function titleExcerpt(value, maxLength = 30) {
  const firstLine = String(value || "")
    .split("\n")
    .map(stripTitleNoise)
    .find(Boolean);
  const cleaned = compactWhitespace(firstLine || "");
  if (/^<[^>]+>$/.test(cleaned) || /^<\/?[a-z][^>]*>/i.test(cleaned)) return "";
  if (/^AGENTS\.md instructions\b/i.test(cleaned)) return "";
  if (/^#\s*Instructions\b/i.test(cleaned)) return "";
  if (/^旧thread[:：]/i.test(cleaned) || /^理由[:：]/i.test(cleaned)) return "";
  if (!cleaned) return "";
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
}

function shortThreadId(threadId) {
  const id = String(threadId || "").trim();
  if (!id) return "";
  return id.replace(/^thread-/, "").slice(0, 8);
}

function titleFromRecentMessages(messages = [], fallback = "このプロジェクト") {
  const candidates = [...messages]
    .reverse()
    .filter((message) => message && message.role === "user")
    .map((message) => titleExcerpt(message.text, 32))
    .filter(Boolean)
    .filter((title) => !/^旧thread[:：]/i.test(title) && !/^理由[:：]/i.test(title));
  return candidates[0] || titleExcerpt(fallback, 32) || "軽量チャット";
}

function lightweightHandoffTitle({ messages = [], sourceTitle = "", fallback = "このプロジェクト" } = {}) {
  const topic = titleExcerpt(sourceTitle, 42) || titleFromRecentMessages(messages, fallback);
  return `軽量版: ${topic}`;
}

function threadLabelFromHistory(history = [], fallback = "共有チャット") {
  const firstUser = history.find((entry) => entry.type === "user" && entry.text)?.text || "";
  if (/^軽量(引き継ぎ|版)[:：]/.test(firstUser)) {
    const firstLine = compactWhitespace(String(firstUser).split("\n").find(Boolean) || "");
    return firstLine.length > 54 ? `${firstLine.slice(0, 54)}...` : firstLine || fallback;
  }
  const label = history
    .filter((entry) => entry.type === "user" && entry.text)
    .map((entry) => titleExcerpt(entry.text, 54))
    .find(Boolean);
  return label || titleExcerpt(fallback, 54) || fallback;
}

module.exports = {
  lightweightHandoffTitle,
  shortThreadId,
  threadLabelFromHistory,
  titleExcerpt,
};
