const test = require("node:test");
const assert = require("node:assert/strict");

const { bridgeKeyForRequest, shouldDisposeIdleBridge, shouldPromoteBridgeKey } = require("./bridge-state");

test("new thread bridge requests share the startup URL bridge", () => {
  assert.equal(bridgeKeyForRequest("", "a"), "new:shared");
  assert.equal(bridgeKeyForRequest(null, "b"), "new:shared");
  assert.equal(bridgeKeyForRequest("", "a"), bridgeKeyForRequest("", "b"));
});

test("existing thread bridge requests keep the thread id as the shared key", () => {
  assert.equal(bridgeKeyForRequest("thread-123", "ignored"), "thread-123");
});

test("any idle bridge can be disposed when its last browser client leaves", () => {
  assert.equal(shouldDisposeIdleBridge({ clientCount: 0, ready: true }), true);
  assert.equal(shouldDisposeIdleBridge({ clientCount: 1, ready: true }), false);
  assert.equal(shouldDisposeIdleBridge({ clientCount: 0, ready: false }), true);
});

test("active or queued work keeps the bridge alive without browser clients", () => {
  assert.equal(shouldDisposeIdleBridge({ clientCount: 0, activeTurnId: "turn-1" }), false);
  assert.equal(shouldDisposeIdleBridge({ clientCount: 0, pendingTurnStart: true }), false);
  assert.equal(shouldDisposeIdleBridge({ clientCount: 0, queuedTurns: 2 }), false);
});

test("bridge keys promote to the real thread id once ready", () => {
  assert.equal(shouldPromoteBridgeKey({ bridgeKey: "new:a", threadId: "thread-123" }), true);
  assert.equal(shouldPromoteBridgeKey({ bridgeKey: "stale-thread", threadId: "thread-123" }), true);
  assert.equal(shouldPromoteBridgeKey({ bridgeKey: "thread-123", threadId: "thread-123" }), false);
  assert.equal(shouldPromoteBridgeKey({ bridgeKey: "new:a", threadId: "" }), false);
});
