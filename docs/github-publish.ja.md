# GitHub公開手順

Ocdex Liteのローカル公開準備は完了しています。GitHub側のリポジトリを作成したあと、次の手順で公開します。

## 1. リポジトリを作る

GitHubで新しいリポジトリを作成します。

- Repository name: `ocdex-lite`
- Visibility: Public
- README / .gitignore / license: 追加しない

## 2. pushする

このローカルリポジトリで実行します。

```sh
git remote add origin https://github.com/<owner>/ocdex-lite.git
git push -u origin main
```

`<owner>` はGitHubのユーザー名またはOrganization名に差し替えます。

## 3. GitHub Pagesを有効化する

GitHubのリポジトリ設定で Pages を有効化します。

- Source: GitHub Actions または `main` branch
- 公開URL: `https://<owner>.github.io/ocdex-lite/`

公開URLが決まったら、次を差し替えます。

- `README.md` の `YOUR_ORG`
- `README.ja.md` の `YOUR_ORG`
- `docs/.vitepress/config.mjs` の `YOUR_ORG`

## 4. 販売導線

最初はGitHub上で無理に決済を組み込まず、次の軽い導線で始めます。

- GitHub Sponsors
- note / Gumroad / Stripe Payment Links で有料セットアップガイド
- GitHub Releases に `ocdex-lite-v1.0.0.tar.gz` を添付

ローカルの配布アーカイブ:

```txt
/Users/stephan/.codex/ocdex/releases/ocdex-lite-v1.0.0.tar.gz
```
