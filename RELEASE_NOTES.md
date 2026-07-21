# Ocdex Lite v1.1.1

## v1.1.1

Project-positioning correction after the official Codex mobile Remote became available.

- Recommend OpenAI's official Codex Remote first for most mobile users
- Reclassify Ocdex Lite as a maintenance-only local-first experiment
- Retire the paid setup-guide and active commercial-product positioning
- Preserve the self-hosted LAN/VPN UI as an app-server reference implementation

## v1.1.0

Sponsor-ready maintenance release.

- Add the GitHub Sponsors funding link and clear support boundaries
- Align the English and Japanese commercial plans with voluntary OSS sponsorship
- Add monthly grouped dependency update checks
- Run CI on the `develop` integration branch as well as pull requests and `main`
- Refresh Codex, Playwright, and WebSocket development dependencies
- Keep individual setup help, consulting, feature priority, and response-time guarantees outside sponsorship

## v1.0.7

Codex Desktop history visibility update.

- Keep LaunchAgent history sync enabled by default so Ocdex-started threads are warmed for Codex Desktop history
- Trigger history warming as soon as a thread becomes ready, not only after a completed turn
- Clarify that `CODEX_HISTORY_SYNC=0` is an optional opt-out for Desktop history warming

## v1.0.6

Thread rename update.

- Add a title edit button beside the current thread name on mobile and desktop-style UIs
- Store manual thread names locally so they survive Ocdex Lite restarts
- Apply renamed titles consistently in the opened chat, recent-chat list, and connected clients
- Keep manual titles ahead of Codex/session-file fallback names

## v1.0.5

Thread title consistency update.

- Use the Mac/Codex `thread.name` as the source of truth for normal chats
- Keep the opened-chat title aligned with the recent-chat list on mobile and desktop
- Name lightweight fallback chats as `軽量版: <元のMacスレッド名>`
- Keep old thread ids out of the visible title and preserve them in preview/handoff context

## v1.0.4

History title fix.

- Use session-file metadata to fill missing `name`, `preview`, and `cwd` fields returned by Codex `thread/list`
- Prevent old chats with `name: null` from falling back to indistinguishable shared-chat labels

## v1.0.3

History visibility fix.

- Add session-file fallback entries to the recent chat list when Codex `thread/list` omits old chats
- Build labels, previews, cwd, and timestamps from `~/.codex/sessions/**/*.jsonl`
- Skip control/instruction noise such as heartbeat and AGENTS messages when choosing chat titles
- Give untitled old sessions distinguishable fallback names with date and short thread id

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
