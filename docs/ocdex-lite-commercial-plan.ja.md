# Ocdex Lite 販売プラン草案

> **終了済み（2026-07-21）:** OpenAI公式Codex Remoteが主要用途を安全かつ簡単に満たすため、この販売プランは実行しません。有料ガイドの新規販売訴求を停止し、Ocdex Liteは保守限定の実験OSSとして残します。以下は意思決定履歴です。

## 結論

GitHub Marketplaceでいきなり売るより、まずは次の形が現実的。

1. GitHubに公開リポジトリを作る
2. Ocdex Liteを「CodexをiPhone/iPadから軽く操作するPWA」として見せる
3. note有料記事で、自力セットアップガイドを売る
4. 需要が見えたら、Hosted版やGitHub App版を検討する

この方針を正式な初期Goalとする。詳細は `docs/ocdex-lite-goal.ja.md`。

## 商品名

第一候補: Ocdex Lite

一言説明:

> A local-first mobile remote for Codex. Use your iPhone or iPad as a lightweight Codex control surface.

日本語:

> iPhone/iPadからMac上のCodexを軽く操作する、ローカル優先のリモートPWA。

## 最初に売るもの

コードそのものをロックして売るより、以下をまとめた手順書を売るほうが早い。

- 個人向けセットアップ手順
- LaunchAgent自動起動テンプレート
- iPhone/iPad向けLite UI
- Tailscale前提の外出先アクセス手順
- トラブルシュート集
- 個別サポートなしの免責文

## 推奨価格

- Free: OSS本体
- Paid setup guide: 500円
- Individual support: 売らない
- Done-with-you setup: 売らない
- Team/agency setup: 初期では売らない

## GitHubでの出し方

### まずやる

- 公開リポジトリを作る
- READMEをOcdex Lite中心に書き直す
- スクリーンショットを載せる
- SECURITY.mdを強く書く
- Releasesでzipを配る
- 500円note有料記事への導線を置く

### note有料記事

向いている用途:

- 低価格の単発販売
- 日本語の手順書販売
- 購入者に「自己責任・質問対応なし」を明記しやすい
- 更新履歴を追記しやすい

初期販売の中心はnote有料ガイドとする。GitHub SponsorsはOSSの互換性確認、ドキュメント整備、リリース保守への任意支援として併用する。スポンサー特典として個別サポート、機能の優先実装、応答時間保証は付けない。

### GitHub Marketplace

今すぐは重い。MarketplaceはGitHub App/SaaSとして購入・プラン変更などの連携が必要になりやすい。Ocdex Liteの最初の売り方には過剰。

将来向いている形:

- Hosted relay
- Team admin dashboard
- Device pairing
- Encrypted sync
- Paid GitHub App

## ライセンス注意

元プロジェクトはISC License。商用利用・改変・配布は可能だが、元の著作権表示と許諾文を残す必要がある。

販売時は次を明記する。

- Based on Codex Remote Control Lab by Sunwood AI Labs
- Licensed under ISC
- Ocdex Lite additions and product packaging by Stephan

## MVP公開前チェック

- tokenがREADMEやスクリーンショットに出ていない
- `.phone-token`, `.uploads`, logs, local pathsをGitに入れない
- iPhone/SE幅で横スクロールなし
- 画像はHTTP uploadでWebSocketに載せない
- LAN限定をデフォルトにする
- 外出先利用はTailscale推奨にする
- OpenAI非公式/非提携であることを明記する

## READMEの売り文句

> Ocdex Lite is for people who want to keep Codex running on a Mac, but steer it from an iPhone or iPad without the heavy desktop UI. It is local-first, token-protected, and designed for unstable mobile Safari sessions.

日本語:

> Ocdex Liteは、Mac上のCodexを動かしたまま、iPhone/iPadから軽く指示したい人のためのリモート操作PWAです。重い履歴同期や巨大画像送信を避け、モバイルSafariでも落ちにくいことを優先しています。

## 次に作るべきもの

1. READMEをOcdex Lite中心に刷新
2. install scriptを追加
3. LaunchAgentテンプレートを一般化
4. token再生成コマンドを追加
5. iPhone/iPadスクリーンショットを撮る
6. GitHub公開用に秘密ファイル除外を再確認
7. note有料記事の本文と販売ページを作る
