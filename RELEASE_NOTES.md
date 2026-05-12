# Ocdex Lite v1.0.0

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
