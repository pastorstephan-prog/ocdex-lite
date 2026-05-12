# GitHub公開手順

Ocdex Liteのローカル公開準備は完了しています。GitHub側のリポジトリを作成したあと、次の手順で公開します。

## 1. リポジトリを作る

GitHubで新しいリポジトリを作成します。

- Repository name: `ocdex-lite`
- Visibility: Public
- README / .gitignore / license: 追加しない

## 2. pushする

このローカルリポジトリでは設定済みです。再設定する場合は次を実行します。

```sh
git remote add origin https://github.com/pastorstephan-prog/ocdex-lite.git
git push -u origin main
```

## 3. GitHub Pagesを有効化する

GitHubのリポジトリ設定で Pages を有効化します。

- Source: GitHub Actions または `main` branch
- 公開URL: `https://pastorstephan-prog.github.io/ocdex-lite/`

公開URLは設定済みです。

## 4. 販売導線

最初はGitHub上で無理に決済を組み込まず、次の軽い導線で始めます。

- GitHub Sponsors
- note / Gumroad / Stripe Payment Links で有料セットアップガイド
- GitHub Releases に `ocdex-lite-v1.0.0.tar.gz` を添付

ローカルの配布アーカイブ:

```txt
/Users/stephan/.codex/ocdex/releases/ocdex-lite-v1.0.0.tar.gz
```
