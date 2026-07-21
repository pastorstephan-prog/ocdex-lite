---
layout: home
hero:
  name: Ocdex Lite
  text: Mac上のCodexをiPhone/iPadから軽く操作
  tagline: Codexはローカルに残し、スマホには軽量PWAだけを出す。モバイルSafariで落ちにくい操作面を目指します。
  image:
    src: /logo.svg
    alt: Ocdex Lite icon
  actions:
    - theme: brand
      text: Ocdex Liteを始める
      link: /ja/guide/phone-bridge
    - theme: alt
      text: 公式Codex Remote
      link: https://openai.com/index/work-with-codex-from-anywhere/
    - theme: alt
      text: 安全設計
      link: /ja/guide/security
    - theme: alt
      text: 継続保守を支援
      link: https://github.com/sponsors/pastorstephan-prog
features:
  - title: モバイル優先
    details: /lite.html のPWAは、iPhone/iPadで使うために画面を絞っています。
  - title: ローカル優先
    details: Codex app-serverは127.0.0.1に残し、LANに出すのはtoken付きbridgeだけです。
  - title: チャット継続
    details: 必要な時だけ履歴を開き、過去threadを選んで続けられます。
  - title: 画像に強い
    details: 画像はHTTPで先にMacへ保存し、巨大WebSocket payloadを避けます。
---

<p align="center">
  <img src="../assets/ocdex-lite-iphone-history.png" alt="Ocdex Lite iPhone history" width="320">
</p>

> **まず公式Remoteを使ってください:** ChatGPTモバイルアプリの公式Codex Remoteが、現在の安全でサポートされた第一選択です。Ocdex Liteは、自前のLAN/VPN UIを明確に必要とする人向けの保守限定実験です。

## Quick Start

```bash
git clone https://github.com/pastorstephan-prog/ocdex-lite.git
cd ocdex-lite
git checkout v1.1.1
npm ci
npm run phone
```

Mac に表示された URL を、同じ Wi-Fi/LAN 上のスマホや別ブラウザで開きます。スマホからデスクトップの Codex セッションを操作でき、別ブラウザでも同じ bridge-managed thread を resume できます。

Macには、Git、Node.js/npm、ログイン済みのCodex CLIが必要です。Ocdex Liteはローカルbridgeであり、公開クラウド中継ではありません。

モバイルではLite PWAのURLを使います。

```text
http://YOUR-MAC.local:45214/lite.html?token=...
```

protocol だけを確認する場合は、別 terminal で app-server と probe を動かします。

```bash
npm run server:ws
npm run probe:ws
```

## 継続保守を支援する

Ocdex Liteは無料のオープンソースです。[GitHub Sponsors](https://github.com/sponsors/pastorstephan-prog)から互換性確認、ドキュメント、リリース保守を支援できます。スポンサーに個別セットアップや応答時間保証は含まれません。
