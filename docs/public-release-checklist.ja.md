# Ocdex Lite Public Release Checklist

## 必須

- [x] GitHub repo名を決める
- [x] READMEの`YOUR_ORG`を実リポジトリに差し替える
- [x] 初期販売導線をnote有料記事に決める
- [x] GitHub Sponsors/FUNDINGを初期導線から外す
- [x] token入りURLがスクリーンショットにないことを確認する
- [x] `.phone-token`, `.uploads`, `.codex-home*`, `tmp`, logsをGitに入れない
- [x] `npm run check`
- [x] `npm test`
- [x] `npm run docs:build`
- [x] 初回release noteを書く

## 初回Release文案

Title:

```text
Ocdex Lite v1.0.0 - mobile-first Codex remote PWA
```

Body:

```text
Ocdex Lite turns an iPhone or iPad into a lightweight remote for Codex running on a Mac.

Highlights:
- mobile-first PWA at /lite.html
- token-protected local bridge
- recent thread picker
- continue old Codex chats
- HTTP image upload to avoid giant WebSocket payloads
- clickable links in replies
- macOS LaunchAgent installer
- token rotation helper

Security:
- keep Codex app-server on 127.0.0.1
- treat tokenized URLs as local access keys
- use LAN, Tailscale, SSH forwarding, or private VPN
- do not expose this through an unauthenticated public tunnel
```

## 有料導線案

- Free: OSS本体
- Setup guide: note有料記事
- 個別導入支援: 初期では売らない
