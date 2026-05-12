function bridgeKeyForRequest(threadId, connectionId) {
  if (threadId) return threadId;
  return "new:shared";
}

function shouldDisposeIdleBridge({ clientCount, activeTurnId, pendingTurnStart, queuedTurns }) {
  return clientCount === 0 && !activeTurnId && !pendingTurnStart && !queuedTurns;
}

function shouldPromoteBridgeKey({ bridgeKey, threadId }) {
  return Boolean(threadId && bridgeKey && bridgeKey !== threadId);
}

module.exports = {
  bridgeKeyForRequest,
  shouldDisposeIdleBridge,
  shouldPromoteBridgeKey,
};
