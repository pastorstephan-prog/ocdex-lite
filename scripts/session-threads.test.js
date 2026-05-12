const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { listSessionThreads, parseSessionThreadFile } = require("./session-threads");

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join("\n"));
}

test("parseSessionThreadFile builds a thread entry from a Codex session file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ocdex-session-"));
  const filePath = path.join(dir, "rollout-2026-05-12T10-00-00-019e199a-fe43-77f2-96c1-054eaf5dd852.jsonl");
  writeJsonl(filePath, [
    {
      type: "session_meta",
      payload: {
        id: "019e199a-fe43-77f2-96c1-054eaf5dd852",
        timestamp: "2026-05-12T00:34:08.579Z",
        cwd: "/tmp/demo",
      },
    },
    { type: "event_msg", payload: { type: "user_message", message: "古いチャットも見えるようにして" } },
    { type: "event_msg", payload: { type: "agent_message", message: "確認します" } },
  ]);

  const thread = parseSessionThreadFile(filePath);
  assert.equal(thread.id, "019e199a-fe43-77f2-96c1-054eaf5dd852");
  assert.equal(thread.name, "古いチャットも見えるようにして");
  assert.equal(thread.preview, "確認します");
  assert.equal(thread.cwd, "/tmp/demo");
  assert.equal(thread.source, "session-file");
});

test("parseSessionThreadFile ignores developer messages when choosing the title", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ocdex-session-"));
  const filePath = path.join(dir, "rollout-2026-05-12T10-00-00-019e3333-3333-7333-8333-333333333333.jsonl");
  writeJsonl(filePath, [
    {
      type: "response_item",
      payload: {
        type: "message",
        role: "developer",
        content: [{ type: "input_text", text: "<permissions instructions>" }],
      },
    },
    { type: "event_msg", payload: { type: "user_message", message: "本当のユーザー依頼" } },
  ]);

  const thread = parseSessionThreadFile(filePath);
  assert.equal(thread.name, "本当のユーザー依頼");
});

test("listSessionThreads returns newest session-file chats first", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ocdex-sessions-"));
  const older = path.join(dir, "2026/05/11/rollout-2026-05-11T10-00-00-019e1111-1111-7111-8111-111111111111.jsonl");
  const newer = path.join(dir, "2026/05/12/rollout-2026-05-12T10-00-00-019e2222-2222-7222-8222-222222222222.jsonl");
  writeJsonl(older, [{ type: "event_msg", payload: { type: "user_message", message: "古い方" } }]);
  writeJsonl(newer, [{ type: "event_msg", payload: { type: "user_message", message: "新しい方" } }]);
  fs.utimesSync(older, new Date("2026-05-11T00:00:00Z"), new Date("2026-05-11T00:00:00Z"));
  fs.utimesSync(newer, new Date("2026-05-12T00:00:00Z"), new Date("2026-05-12T00:00:00Z"));

  const threads = listSessionThreads({ sessionsDir: dir, limit: 2 });
  assert.deepEqual(
    threads.map((thread) => thread.name),
    ["新しい方", "古い方"],
  );
});

test("parseSessionThreadFile gives untitled old sessions a distinguishable fallback", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ocdex-session-"));
  const filePath = path.join(dir, "rollout-2026-05-12T10-00-00-019e4444-4444-7444-8444-444444444444.jsonl");
  writeJsonl(filePath, [
    {
      type: "session_meta",
      payload: {
        id: "019e4444-4444-7444-8444-444444444444",
        timestamp: "2026-05-12T00:34:08.579Z",
      },
    },
    { type: "event_msg", payload: { type: "user_message", message: "<heartbeat>" } },
  ]);

  const thread = parseSessionThreadFile(filePath);
  assert.equal(thread.name, "過去のチャット 2026-05-12 (019e4444)");
});
