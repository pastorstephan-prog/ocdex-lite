const test = require("node:test");
const assert = require("node:assert/strict");

const { lightweightHandoffTitle, threadLabelFromHistory, titleExcerpt } = require("./thread-title");

test("lightweight handoff titles follow the source Mac thread name", () => {
  const title = lightweightHandoffTitle({
    sourceTitle: "Codexのリモート操作を確認",
    messages: [
      { role: "user", text: "古い依頼" },
      { role: "assistant", text: "了解しました" },
      { role: "user", text: "noteのほうもよろしく。" },
    ],
  });

  assert.equal(title, "軽量版: Codexのリモート操作を確認");
});

test("thread labels keep lightweight handoff chats recognizable", () => {
  const label = threadLabelFromHistory(
    [
      {
        type: "user",
        text: [
          "軽量版: Codexのリモート操作を確認",
          "",
          "旧チャットが重すぎてモバイルで安全に再開できなかったため、新しい軽量チャットへ自動引き継ぎします。",
        ].join("\n"),
      },
    ],
    "共有チャット",
  );

  assert.equal(label, "軽量版: Codexのリモート操作を確認");
});

test("title excerpts remove noisy urls and code fragments", () => {
  assert.equal(titleExcerpt("`npm run phone` を見て https://example.com/foo を確認して", 24), "を見て を確認して");
});

test("title excerpts ignore xml-like control blocks", () => {
  assert.equal(titleExcerpt("<heartbeat>"), "");
});

test("thread labels skip instruction noise and use the first real user request", () => {
  assert.equal(
    threadLabelFromHistory(
      [
        { type: "user", text: "AGENTS.md instructions for /Users/demo" },
        { type: "user", text: "旧thread: 019e0ef9-c891-75f0-ad7d-95b720880c07" },
        { type: "user", text: "古いチャットを見えるようにして" },
      ],
      "共有チャット",
    ),
    "古いチャットを見えるようにして",
  );
});
