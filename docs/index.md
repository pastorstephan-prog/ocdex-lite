---
layout: home
hero:
  name: Ocdex Lite
  text: A lightweight mobile remote for Codex on your Mac
  tagline: Keep Codex local, steer it from iPhone or iPad, and avoid heavy mobile browser sessions.
  image:
    src: /logo.svg
    alt: Ocdex Lite icon
  actions:
    - theme: brand
      text: Start Ocdex Lite
      link: /guide/phone-bridge
    - theme: alt
      text: Japanese Setup Guide
      link: https://note.com/ocdex_lite/n/nd69e05ae6f3c
    - theme: alt
      text: Security Model
      link: /guide/security
features:
  - title: Mobile-first
    details: The /lite.html PWA keeps the interface small enough for iPhone and iPad.
  - title: Local-first
    details: Codex app-server stays on 127.0.0.1. The LAN-facing surface is a token-protected bridge.
  - title: Thread continuity
    details: Open recent chats only when needed, pick one, and continue the same Codex thread.
  - title: Screenshot friendly
    details: Images upload over HTTP before the prompt, avoiding giant WebSocket payloads.
---

<p align="center">
  <img src="./assets/ocdex-lite-iphone-history.png" alt="Ocdex Lite iPhone history" width="320">
</p>

## Quick Start

```bash
git clone https://github.com/pastorstephan-prog/ocdex-lite.git
cd ocdex-lite
git checkout v1.0.7
npm ci
npm run phone
```

Open the printed URL from a phone or another browser on the same Wi-Fi/LAN. The phone can drive the desktop Codex session, and another browser can resume the same bridge-managed thread.

You need a Mac with Git, Node.js/npm, and Codex CLI already installed and logged in. Ocdex Lite is a local bridge, not a hosted relay.

Use the Lite PWA route for mobile:

```text
http://YOUR-MAC.local:45214/lite.html?token=...
```

For protocol-only testing, run the app-server and probe from separate terminals:

```bash
npm run server:ws
npm run probe:ws
```

## Layout

```text
phone browser -> http://Mac-LAN-IP:45214 -> Node bridge -> ws://127.0.0.1:45213 -> Codex app-server
```

The app-server remains local. The bridge requires a token on page, API, and WebSocket requests.
