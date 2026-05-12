# note有料記事 下書き: Ocdex Lite 自力セットアップ完全ガイド

## タイトル案

iPhone/iPadからMacのCodexを軽く操作する: Ocdex Lite自力セットアップ完全ガイド

## 販売価格

500円

低価格の買い切り手順書として販売します。個別サポートや導入代行は含めません。

## 冒頭

Ocdex Liteは、Mac上で動かしているCodexを、iPhoneやiPadのブラウザから軽く操作するためのローカル優先PWAです。

このガイドでは、公開リポジトリを使って、自分のMacにOcdex Liteをセットアップし、iPhone/iPadから使える状態にするところまでを説明します。

## 先に大事なこと

この有料記事に含まれるもの:

- Ocdex Liteのセットアップ手順
- Macでの起動方法
- iPhone/iPadからアクセスする方法
- LaunchAgentで自動起動する方法
- Tailscaleを使った外出先アクセスの考え方
- よくあるトラブルの確認ポイント

この有料記事に含まれないもの:

- 個別サポート
- 導入代行
- 読者の環境ごとの動作保証
- セキュリティ設定の個別診断
- OpenAIやCodex本体の公式サポート

Mac、ネットワーク、Codex、Node.js、GitHub、Tailscaleなどの状態によって動き方は変わります。この記事は「自力で試す人向け」の手順書です。

## 対象読者

- MacでCodexを使っている
- iPhone/iPadからCodexに短い指示を出したい
- 重いリモートデスクトップではなく、軽いチャット画面がほしい
- LAN内またはTailscale経由で使いたい
- 多少のターミナル操作はできる、または試す気がある

## できるようになること

- iPhone/iPadのSafariからOcdex Liteを開く
- Mac上のCodexにメッセージを送る
- 既存のチャット履歴を軽く見る
- iPhone/iPad側で始めたチャットをMac側でも確認する
- 画像を添付して送る
- URLリンクをタップして開く
- Mac起動時にOcdex Liteを自動起動する

## 必要なもの

- macOS
- Codex
- Node.js 20以上
- Git
- 同じWi-FiにあるiPhone/iPad
- 外出先から使う場合はTailscale

## 1. リポジトリを取得する

```sh
git clone https://github.com/pastorstephan-prog/ocdex-lite.git
cd ocdex-lite
npm install
```

## 2. 動作確認する

```sh
npm run check
npm test
```

どちらも成功すれば、基本的なファイルとスクリプトは正常です。

## 3. トークンを作る

```sh
npm run token:reset
```

`.phone-token` が作られます。このファイルは外に出さないでください。

## 4. Ocdex Liteを起動する

```sh
npm run phone
```

表示されたURLをiPhone/iPadで開きます。同じWi-Fiにいる場合は、Macのローカル名またはIPアドレスでアクセスします。

## 5. iPhone/iPadでホーム画面に追加する

SafariでOcdex Liteを開いたら、共有メニューから「ホーム画面に追加」を選びます。

これでアプリ風に開けます。

## 6. Mac起動時に自動起動する

```sh
npm run launchagent:install
```

インストール後、MacにログインするとOcdex Liteが起動します。

## 7. 外出先から使う場合

インターネットへ直接公開するのは推奨しません。

外から使う場合はTailscaleなどのプライベートネットワークを使い、MacとiPhone/iPadを同じTailnetに入れてください。

## 8. よくあるトラブル

### iPhoneから開けない

- MacとiPhoneが同じWi-Fiにいるか確認する
- Macのファイアウォール設定を確認する
- 表示されたURLのホスト名をIPアドレスに変えて試す

### 接続が切れる

- iPhoneの画面ロックやSafariの再読み込みで切れることがあります
- 再接続ボタンを押してください
- 長い履歴や大きい画像を一度に送らないでください

### 画像で失敗する

- 大きすぎる画像は圧縮してから送ってください
- Ocdex LiteはHTTPアップロードを使いますが、上限はあります

### 履歴が重い

- 履歴は必要な時だけ開く設計です
- 大量の古いチャットを一度に読む用途には向いていません

## セキュリティ注意

Ocdex Liteは、あなたのMac上のCodexに指示を送るための入口です。

- tokenを公開しない
- `.phone-token` をGitHubに上げない
- 公開インターネットに直接出さない
- 共有Wi-Fiでは使わない
- 外出先アクセスはTailscaleを使う

## 公式ではありません

Ocdex LiteはOpenAI公式製品ではありません。Codex、OpenAI、GitHubとは非提携の個人プロジェクトです。

## リンク

- GitHub: https://github.com/pastorstephan-prog/ocdex-lite
- 公開ページ: https://pastorstephan-prog.github.io/ocdex-lite/
- Release: https://github.com/pastorstephan-prog/ocdex-lite/releases/tag/v1.0.0

## 末尾の注意書き

この記事は、Ocdex Liteを自分でセットアップするための手順書です。個別サポート、導入代行、購入者環境ごとの動作保証は含まれません。内容は必要に応じて更新します。
