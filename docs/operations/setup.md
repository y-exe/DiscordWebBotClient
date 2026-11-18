# セットアップ

## 前提

- Bun >= 1.3.14(バックエンド / フロントエンド共通)
- Discord トークン(ユーザー / Bot いずれか)

## インストール

```bash
bun run bootstrap
```

ルート(b backend)と `frontend/` の依存をまとめてインストールします。

## 環境変数

`backend/.env` を作成します。

| 変数 | 既定 | 説明 |
|---|---|---|
| `NODE_ENV` | — | `production` で本番モード(secure / Cookie SameSite=None) |
| `PORT` | `8000` | バックエンドの待ち受けポート |
| `ALLOWED_ORIGINS` | なし | カンマ区切りの許可オリジン。本番では `https://ycord.pages.dev` が必須 |
| `ALLOW_NO_ORIGIN` | `false` | Origin ヘッダーなしリクエストを許可するか |
| `IMAGE_PROXY_HOSTS` | Discord CDN 各種 | 画像プロキシが中継できるホスト |

フロントエンドは `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` で接続先を指定できます。
未設定の場合、開発時は同一オリジン + Next.js の rewrite(`:5173` → `:8000`)、本番は
`https://materialcord.yexe.workers.dev`(Workers プロキシ)を使用します。

## 起動

```bash
bun run dev          # backend (:8000) と frontend (:5173) を同時起動
```

個別に起動する場合:

| コマンド | 内容 |
|---|---|
| `bun run --cwd backend dev` | backend のみ(`bun --watch server.js`) |
| `bun run frontend:dev` | frontend のみ(`next dev --port 5173`) |

起動後、`http://localhost:5173` を開き `/login` からトークンでログインします。

## デプロイ構成

| コンポーネント | 実行環境 | URL | 自動デプロイ |
|---|---|---|---|
| フロントエンド | Cloudflare Pages (`ycord`) | `https://ycord.pages.dev` | Cloudflare Git 連携 |
| 通信プロキシ | Cloudflare Workers (`materialcord`) | `https://materialcord.yexe.workers.dev` | Cloudflare Git 連携 |
| バックエンド | k3s (`yexeserver`, GHCR イメージ) | `https://dapi.yexe.xyz` | GitHub Actions |

- フロントエンド: `frontend/` で `bun run pages:build`(OpenNext ビルド + Pages 梱包)→ `bun run pages:deploy`。
  Git 連携のビルドコマンドも同じ(ルートディレクトリ `frontend`、出力 `dist`)。
- プロキシ: `workers/proxy/` の Worker。`npx wrangler deploy` でデプロイ。設定は同ディレクトリの `wrangler.toml`。
- バックエンド: `main` への push で GitHub Actions が GHCR にイメージを push する。
  `VPS_GITOPS_TOKEN` シークレットを設定すると、GitOps リポジトリ (`y-exe/vps`) の
  `restartedAt` 更新まで自動で行い Argo がロールアウトする。

依存を変更した場合は `bun.lock`(ルート / frontend)の両方を更新してください。
