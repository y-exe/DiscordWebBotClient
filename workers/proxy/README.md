# materialcord proxy (Cloudflare Workers)

`materialcord.yexe.workers.dev` で動作し、backend (`papi.yexe.xyz`) を隠蔽するリバースプロキシ。

- 対象ルート: `/api/*`、`/socket.io/*` (WebSocket 含む)、`/healthz`
- CORS: `ALLOWED_ORIGIN` (本番 `https://ycord.pages.dev`) と
  `ALLOWED_ORIGIN_PATTERN` (Pages プレビュー用の `ycord.pages.dev` 末尾一致) に許可されたオリジンのみ
- クッキーは Set-Cookie をそのまま透過するため、ブラウザーにはこの Worker のオリジンで保存される

## 手動デプロイ

```bash
cd workers/proxy
npx wrangler deploy
```

## 自動デプロイ

Cloudflare の Git 連携 (Workers Builds) でこのリポジトリの `workers/proxy` を
ビルドコマンドなし (`npx wrangler deploy`) で接続する。
