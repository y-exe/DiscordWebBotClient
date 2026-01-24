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
| `NODE_ENV` | — | `production` で本番モード(secure / Cookie 属性が厳格化) |
| `PORT` | `8000` | バックエンドの待ち受けポート |
| `ALLOWED_ORIGINS` | なし | カンマ区切りの許可オリジン。本番では必須 |
| `ALLOW_NO_ORIGIN` | `false` | Origin ヘッダーなしリクエストを許可するか |
| `IMAGE_PROXY_HOSTS` | Discord CDN 各種 | 画像プロキシが中継できるホスト |

フロントエンドは `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` で接続先を指定できます。
未設定の場合、開発時は同一オリジン + Next.js の rewrite(`:5173` → `:8000`)、本番は `https://<デプロイ先ドメイン>` を使用します。

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

## ビルド / デプロイ

```bash
bun run build        # Next.js の本番ビルド
```

Cloudflare 向け:

```bash
cd frontend
bun run deploy       # opennextjs-cloudflare build + deploy
```

依存を変更した場合は `bun.lock`(ルート / frontend)の両方を更新してください。
