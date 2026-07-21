# Ocdex Lite

![Ocdex Lite hero](docs/assets/ocdex-lite-hero.png)

Use your iPhone or iPad as a lightweight remote for Codex running on your Mac.

Ocdex Lite is a local-first PWA for people who want Codex to keep working on a desktop machine, while they steer it from a phone or tablet. It keeps the Codex app-server on `127.0.0.1`, exposes a small token-protected bridge on your LAN, and serves a mobile-first chat UI at `/lite.html`.

> Status: maintenance-only experimental project. Not affiliated with OpenAI.

**日本語で読みたい方へ:** [README.ja.md](README.ja.md) に日本語版があります。

## Use the Official Remote First

OpenAI now provides an official Codex mobile remote experience in the ChatGPT mobile app. It supports active threads, approvals, diffs, terminal output, screenshots, and a secure relay without exposing a local bridge. For most people, that is the safer and easier choice: [Work with Codex from anywhere](https://openai.com/index/work-with-codex-from-anywhere/).

Use Ocdex Lite only if you specifically want a self-hosted, inspectable LAN/VPN interface or an app-server reference implementation and accept the setup and security responsibility.

## Maintainer Status

Ocdex Lite is maintained on a best-effort basis as a local-first experiment and app-server reference implementation. It is no longer positioned as the default mobile Codex remote or as an active commercial product.

Maintainer work includes:

- reviewing Codex and mobile-Safari workflow regressions
- keeping the local-first security boundary clear
- improving setup documentation for English and Japanese users
- testing release behavior on Mac, iPhone, and iPad paths
- triaging issues around token handling, image uploads, reconnect behavior, and launch-at-login setup

## Support the Project

Ocdex Lite is free and open source. If it saves you time, you can support compatibility testing, documentation, and release maintenance through [GitHub Sponsors](https://github.com/sponsors/pastorstephan-prog).

Sponsorship is voluntary. It does not include individual setup help, consulting, feature priority, or guaranteed response times. See [SUPPORT.md](SUPPORT.md) before opening a support request.

## Before You Start

Ocdex Lite is not a hosted service and not a one-tap iPhone app. Your Mac does the real work, and the phone is a lightweight control surface.

You need:

- a Mac that can keep running while you use Codex from another device
- Codex CLI installed and logged in on that Mac
- Git and Node.js/npm installed on that Mac
- an iPhone/iPad on the same Wi-Fi/LAN, or a trusted private route such as Tailscale/VPN

Ocdex Lite does not provide OpenAI account access, Codex CLI installation support, or a public cloud relay. For safety, do not expose it directly to the public internet.

## Why This Still Exists

Ocdex Lite predates the official mobile Remote experience. It remains available for local-first experimentation, self-hosted UI work, and people who deliberately want the following small loop under their own control:

- ask Codex from iPhone/iPad
- continue a previous thread
- attach screenshots without giant WebSocket payloads
- tap links in replies
- reconnect cleanly after mobile Safari drops a socket
- keep the dangerous app-server boundary local

## Features

- **Lite PWA**: installable from Safari with "Add to Home Screen"
- **Local-first bridge**: phone browser -> LAN bridge -> localhost Codex app-server
- **Thread picker**: load recent chats only when you tap History
- **Continue old chats**: pick a thread and keep sending into it
- **HTTP image upload**: images are compressed and uploaded before the prompt, then passed to Codex as local files
- **Clickable links**: raw `https://...` URLs and Markdown links are tappable
- **Mobile reconnect guard**: avoids reconnect loops from intentional socket replacement
- **Safety defaults**: token URL, localhost app-server, LAN/VPN/Tailscale-oriented access

## Screenshots

<p>
  <img src="docs/assets/ocdex-lite-iphone.png" alt="Ocdex Lite iPhone chat" width="260">
  <img src="docs/assets/ocdex-lite-iphone-history.png" alt="Ocdex Lite iPhone history" width="260">
  <img src="docs/assets/ocdex-lite-ipad.png" alt="Ocdex Lite iPad" width="360">
</p>

## Quick Start

```bash
git clone https://github.com/pastorstephan-prog/ocdex-lite.git
cd ocdex-lite
git checkout v1.1.1
npm ci
npm run phone
```

Open the printed URL from an iPhone or iPad on the same network:

```text
http://YOUR-MAC.local:45214/lite.html?token=...
```

The full desktop-style UI remains available at:

```text
http://YOUR-MAC.local:45214/?token=...
```

## Recommended Mobile Flow

1. Start the bridge on the Mac.
2. Open `/lite.html?token=...` from iPhone or iPad.
3. Add it to the Home Screen.
4. Use **History** only when you need an older thread.
5. Use Tailscale, SSH forwarding, or a private VPN for access outside your LAN.

## Environment Variables

```bash
PHONE_UI_PORT=45214 npm run phone
PHONE_TOKEN=choose-your-own-token npm run phone
CODEX_WORKDIR=/path/to/project npm run phone
CODEX_MODEL=gpt-5.4 npm run phone
CODEX_HISTORY_SYNC=0 npm run phone # optional: disable Codex Desktop history warming
CODEX_THREAD_LIST_LIMIT=8 npm run phone
CODEX_HISTORY_LIMIT=30 npm run phone
CODEX_WS_MAX_PAYLOAD_MB=64 npm run phone
CODEX_UPLOAD_MAX_MB=12 npm run phone
```

## Utility Scripts

```bash
npm run token:reset
npm run launchagent:install -- --workdir "/path/to/project"
npm run simulator:smoke
```

`token:reset` rotates `.phone-token`. Existing phone URLs stop working after rotation.

`launchagent:install` creates a macOS LaunchAgent that starts Ocdex Lite at login and restarts it if it crashes.

`simulator:smoke` opens `/lite.html` in available Xcode iPhone/iPad simulators, saves screenshots, and prints bridge readiness. It is useful for quick release checks, but it does not replace real-device Wi-Fi, Tailscale, or lock-screen testing.

## Architecture

```text
iPhone/iPad Safari
  -> http://Mac-LAN-IP:45214/lite.html?token=...
  -> Node bridge
  -> ws://127.0.0.1:45213
  -> Codex app-server
```

The Codex app-server should stay bound to localhost. Do not expose it directly to a LAN or public internet.

## Security

- Treat `?token=...` URLs like local access keys.
- Do not post tokenized URLs in screenshots, issues, chats, or streams.
- Do not expose the bridge through an unauthenticated public tunnel or raw port forward.
- Prefer LAN, Tailscale, SSH forwarding, or a private VPN.
- Rotate `.phone-token` after demos or shared-network testing.

See [SECURITY.md](SECURITY.md).

## Project Position

Ocdex Lite is not being marketed as a paid remote-control product. The previous paid-guide plan is retired because the official Codex Remote is the appropriate first recommendation for most users. The repository remains public for experimentation and best-effort maintenance.

## Attribution

Ocdex Lite is based on Codex Remote Control Lab by Sunwood AI Labs.

Original project:

- https://github.com/Sunwood-ai-labs/codex-remote-control-lab

The upstream project is licensed under ISC. Keep the original copyright notice and license text when redistributing.

## License

ISC. See [LICENSE](LICENSE).
