# Ocdex Lite v1.0.2

## v1.0.2

Small clarity update for lightweight handoff chats.

- Name automatically created lightweight handoff chats as `軽量引き継ぎ: <topic> (<old thread id>)`
- Preserve that label in the mobile and desktop thread lists while the bridge is live
- Add tests for handoff title extraction and thread list labels

## v1.0.1

Reliability update for mobile use.

- Add session-file fallback when Codex app-server closes during thread reads
- Avoid reusing stuck startup bridges
- Add startup timeouts so the UI does not stay on "connecting" forever
- Fall back from stuck old thread resume to a new lightweight thread with an automatic handoff note
- Show older chat history in small batches instead of loading everything at once
- Improve multi-device bridge state display for active turns and queued prompts

## v1.0.0

Ocdex Lite turns an iPhone or iPad into a lightweight remote for Codex running on a Mac.

## Highlights

- Mobile-first PWA at `/lite.html`
- Token-protected local bridge
- Recent thread picker
- Continue old Codex chats
- HTTP image upload to avoid giant WebSocket payloads
- Clickable links in replies
- macOS LaunchAgent installer
- Token rotation helper

## Security

- Keep Codex app-server on `127.0.0.1`
- Treat tokenized URLs as local access keys
- Use LAN, Tailscale, SSH forwarding, or private VPN
- Do not expose this through an unauthenticated public tunnel

## Attribution

Based on Codex Remote Control Lab by Sunwood AI Labs.
