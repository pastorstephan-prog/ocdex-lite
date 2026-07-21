# Ocdex Lite

![Ocdex Lite hero](docs/assets/ocdex-lite-hero.png)

iPhone/iPadを、Mac上で動くCodexの軽量リモコンにするPWAです。

Ocdex Liteは、CodexをMac上で動かしたまま、スマホやタブレットから軽く指示したい人のためのローカル優先UIです。Codex app-serverは`127.0.0.1`に閉じ、LANに出すのはtoken付きの小さなbridgeだけです。モバイル向け画面は`/lite.html`で開きます。

> 状態: 初期公開MVP。OpenAI公式/提携プロダクトではありません。

## はじめての方へ

Git、Node.js、Codex CLIに慣れている方は、このREADMEだけで試せます。

「ターミナルは苦手だけど、iPhone/iPadからCodexを動かしてみたい」という方向けに、500円の日本語セットアップガイドを用意しています。

**[iPhone/iPadからMacのCodex CLIを軽く操作する: Ocdex Liteやさしい自力セットアップガイド](https://note.com/ocdex_lite/n/nd69e05ae6f3c)**

自力セットアップ、iPhone/iPadからの開き方、Macログイン時の自動起動、Tailscaleを使う場合の考え方、よくある確認ポイントをまとめています。個別サポート、導入代行、環境別の動作保証は含みません。

## プロジェクトを支援する

Ocdex Liteは無料のオープンソースです。役に立った場合は、[GitHub Sponsors](https://github.com/sponsors/pastorstephan-prog)から互換性確認、ドキュメント整備、リリース保守を支援できます。

スポンサーは任意です。個別セットアップ、コンサルティング、機能の優先実装、応答時間の保証は含みません。問い合わせ前に[SUPPORT.md](SUPPORT.md)も確認してください。

## 始める前に

Ocdex Liteは、クラウドサービスでも、ワンタップで入るiPhoneアプリでもありません。実際にCodexを動かすのはMacで、iPhone/iPadは軽い操作画面になります。

必要なもの:

- Codexを動かしておけるMac
- そのMacにインストール済みでログイン済みのCodex CLI
- そのMacに入っているGitとNode.js/npm
- 同じWi-Fi/LAN上のiPhone/iPad、またはTailscale/VPNなどの信頼できるprivate経路

Ocdex Liteは、OpenAIアカウント、Codex CLI本体の導入、公開クラウド中継を提供しません。安全のため、public internetへ直接公開しないでください。

## なぜ作るか

CodexはMac上では強い一方、iPhone/iPadからの操作はまだ重くなりがちです。デスクトップ風UIをそのまま持ち込むと、モバイルSafariで切断、横はみ出し、画像payload過大が起きやすくなります。Ocdex Liteは、最小限の実用ループに絞ります。

- iPhone/iPadからCodexへ頼む
- 過去チャットを続ける
- スクリーンショットを軽く渡す
- 返信内リンクをタップする
- モバイルSafariの切断から戻る
- 危険なapp-server境界はlocalhostに残す

## 機能

- **Lite PWA**: Safariの「ホーム画面に追加」でアプリ風に使える
- **ローカル優先bridge**: phone browser -> LAN bridge -> localhost Codex app-server
- **履歴パネル**: 必要な時だけ最近のチャットを読む
- **過去チャット継続**: threadを選んでそのまま続けられる
- **HTTP画像アップロード**: 画像を圧縮して先にMacへ保存し、Codexにはlocal fileとして渡す
- **リンク対応**: `https://...` とMarkdownリンクをタップ可能にする
- **再接続ガード**: 意図的な接続差し替えで再接続ループしにくい
- **安全側の既定**: token URL、localhost app-server、LAN/VPN/Tailscale前提

## スクリーンショット

<p>
  <img src="docs/assets/ocdex-lite-iphone.png" alt="Ocdex Lite iPhone chat" width="260">
  <img src="docs/assets/ocdex-lite-iphone-history.png" alt="Ocdex Lite iPhone history" width="260">
  <img src="docs/assets/ocdex-lite-ipad.png" alt="Ocdex Lite iPad" width="360">
</p>

## Quick Start

```bash
git clone https://github.com/pastorstephan-prog/ocdex-lite.git
cd ocdex-lite
git checkout v1.1.0
npm ci
npm run phone
```

同じネットワーク上のiPhone/iPadで、表示されたURLを開きます。

```text
http://YOUR-MAC.local:45214/lite.html?token=...
```

デスクトップ風の通常UIも残っています。

```text
http://YOUR-MAC.local:45214/?token=...
```

## 推奨フロー

1. Macでbridgeを起動する
2. iPhone/iPadから`/lite.html?token=...`を開く
3. ホーム画面に追加する
4. 過去チャットを見たい時だけ**履歴**を押す
5. 外出先から使う場合はTailscale、SSH forwarding、private VPNを使う

## 環境変数

```bash
PHONE_UI_PORT=45214 npm run phone
PHONE_TOKEN=choose-your-own-token npm run phone
CODEX_WORKDIR=/path/to/project npm run phone
CODEX_MODEL=gpt-5.4 npm run phone
CODEX_HISTORY_SYNC=0 npm run phone # 任意: Codex Desktop側の履歴同期を切る
CODEX_THREAD_LIST_LIMIT=8 npm run phone
CODEX_HISTORY_LIMIT=30 npm run phone
CODEX_WS_MAX_PAYLOAD_MB=64 npm run phone
CODEX_UPLOAD_MAX_MB=12 npm run phone
```

## 補助スクリプト

```bash
npm run token:reset
npm run launchagent:install -- --workdir "/path/to/project"
npm run simulator:smoke
```

`token:reset`は`.phone-token`を再生成します。古いスマホURLは使えなくなります。

`launchagent:install`はmacOSのLaunchAgentを作り、ログイン時にOcdex Liteを起動し、落ちた時に再起動するようにします。

`simulator:smoke`はXcode SimulatorのiPhone/iPadで`/lite.html`を開き、スクリーンショット保存とbridge接続状態を確認します。実機Wi-Fi、Tailscale、画面ロック復帰の代替にはなりませんが、公開前の軽い回帰確認に使えます。

## 構成

```text
iPhone/iPad Safari
  -> http://Mac-LAN-IP:45214/lite.html?token=...
  -> Node bridge
  -> ws://127.0.0.1:45213
  -> Codex app-server
```

Codex app-serverはlocalhostに閉じるのが前提です。LANやpublic internetへ直接公開しないでください。

## セキュリティ

- `?token=...`付きURLはローカルアクセスキーとして扱う
- token入りURLをスクリーンショット、issue、チャット、配信に載せない
- 認証なしpublic tunnelやraw port forwardで公開しない
- LAN、Tailscale、SSH forwarding、private VPNを使う
- デモや共有ネットワーク利用後は`.phone-token`をローテーションする

詳細は[SECURITY.md](SECURITY.md)。

## 日本語セットアップガイド

このリポジトリは、アプリ本体を無料公開する方針です。

有料noteは、GitHubのREADMEだけでは不安な方向けに、手順をやさしく並べ直した自力セットアップ用ガイドです。

- 有料ガイド: [Ocdex Liteやさしい自力セットアップガイド](https://note.com/ocdex_lite/n/nd69e05ae6f3c)
- 価格: 500円
- 向いている人: MacとCodex CLIは使いたいが、GitHubのREADMEだけでは不安な人
- 含まないもの: 個別サポート、導入代行、環境別トラブル対応の保証

## 商用Goal

最初の商用Goalは、App StoreでもGitHub Marketplaceでもありません。

- PWA版をGitHub公開
- [note有料記事](https://note.com/ocdex_lite/n/nd69e05ae6f3c)で、自力セットアップ用ガイドを販売
- 個別サポート、導入代行、環境別トラブル対応は初期商品に含めない
- 安定したmobile Codex remoteが欲しい人向けに、500円の買い切り手順書を用意する
- OSSの継続保守は[GitHub Sponsors](https://github.com/sponsors/pastorstephan-prog)による任意支援も受け付ける

詳細は[docs/ocdex-lite-goal.ja.md](docs/ocdex-lite-goal.ja.md)と[docs/ocdex-lite-commercial-plan.ja.md](docs/ocdex-lite-commercial-plan.ja.md)。

## Attribution

Ocdex LiteはSunwood AI LabsのCodex Remote Control Labをベースにしています。

Original project:

- https://github.com/Sunwood-ai-labs/codex-remote-control-lab

元プロジェクトはISC Licenseです。再配布時は元のcopyright noticeとlicense textを残してください。

## License

ISC. See [LICENSE](LICENSE).
