# Ocdex Lite 販売プラン草案

## 結論

GitHub Marketplaceでいきなり売るより、まずは次の形が現実的。

1. GitHubに公開リポジトリを作る
2. Ocdex Liteを「CodexをiPhone/iPadから軽く操作するPWA」として見せる
3. GitHub Sponsorsまたは外部決済で有料サポート/セットアップを売る
4. 需要が見えたら、Hosted版やGitHub App版を検討する

この方針を正式な初期Goalとする。詳細は `docs/ocdex-lite-goal.ja.md`。

## 商品名

第一候補: Ocdex Lite

一言説明:

> A local-first mobile remote for Codex. Use your iPhone or iPad as a lightweight Codex control surface.

日本語:

> iPhone/iPadからMac上のCodexを軽く操作する、ローカル優先のリモートPWA。

## 最初に売るもの

コードそのものをロックして売るより、以下を売るほうが早い。

- 個人向けセットアップ手順
- LaunchAgent自動起動テンプレート
- iPhone/iPad向けLite UI
- Tailscale前提の外出先アクセス手順
- 有料サポート
- 導入代行

## 推奨価格

- Free: OSS本体
- Supporter: $5-10/month
- Pro setup guide: $19-49 one-time
- Done-with-you setup: $99-199
- Team/agency setup: $299+

## GitHubでの出し方

### まずやる

- 公開リポジトリを作る
- READMEをOcdex Lite中心に書き直す
- スクリーンショットを載せる
- SECURITY.mdを強く書く
- FUNDING.ymlを置く
- Releasesでzipを配る

### GitHub Sponsors

向いている用途:

- 継続支援
- サポート枠
- 早期アクセス
- セットアップ相談

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
7. GitHub Sponsors / 外部決済リンクを決める
