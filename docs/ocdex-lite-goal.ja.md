# Ocdex Lite Goal

## Goal

Ocdex Liteを、まずはPWA版として公開する。

Mac上で動くCodexを、iPhone/iPadから軽く操作できるローカル優先のリモートUIとして整え、GitHubで公開し、GitHub Sponsorsまたは外部決済の有料ガイド/セットアップサポートで需要を見る。

## 今はやらない

- App Store版をいきなり作らない
- GitHub Marketplace有料アプリをいきなり作らない
- hosted relayやチーム管理画面を最初から作らない
- Codex Desktop全機能の再現を目指さない

## 最初の販売形態

- OSS本体: GitHub公開
- 収益化: GitHub Sponsors / Gumroad / BOOTH / note有料記事など
- 有料内容: セットアップガイド、LaunchAgent自動起動、Tailscale外出先アクセス、導入サポート

## MVPの価値

- iPhone/iPadで軽く使える
- 画像添付で落ちにくい
- 履歴を必要な時だけ読める
- 過去チャットを続けられる
- リンクをタップできる
- Mac側は固定起動できる

## 公開前の完了条件

- READMEをOcdex Lite中心に刷新
- スクリーンショットを掲載
- tokenやローカル秘密情報が混ざっていない
- `.phone-token`, `.uploads`, logs, local pathsがGitに入らない
- iPhone SE幅で横スクロールが出ない
- SECURITY.mdでLAN/Tailscale推奨と危険な公開方法を明記
- 元プロジェクトのISCライセンス表記を保持
- OpenAI/Codex公式ではないことを明記

## 次の実装タスク

1. READMEをPWA製品ページ風に整理する
2. `scripts/install-launchagent.js` またはテンプレートを作る
3. `scripts/reset-token.js` を作る
4. iPhone/iPadスクリーンショットを撮る
5. GitHub公開用のリポジトリ名・説明・初回Release文を作る
