# 運用とメンテナンス

## デザイントークンの再生成

```bash
bun run tokens
```

`scripts/generate-discord-tokens.mjs` が Discord 公式クライアントの公開 CSS から
色・形状・タイポグラフィ(4テーマ分)を抽出し、`frontend/src/styles/discord-tokens.css` を生成します。
出力は自動生成物のため手動編集しないでください(再生成時に上書きされます)。

## 依存の更新

1. 依存を更新したら `bun.lock`(ルートと `frontend/`)を更新
2. `bun run check`(lint + セキュリティテスト)と `bun run build` で確認

## セキュリティ

- トークンは HttpOnly Cookie にのみ保存され、バックエンドの DB やファイルには残りません
- 本番の Cookie は `SameSite=None; Secure` (Pages と Workers プロキシがクロスサイトのため)。
  CSRF 対策は `ALLOWED_ORIGINS` によるオリジン検証で行う
- `ALLOWED_ORIGINS` は本番で必ず設定してください(未設定の場合オリジンを持つリクエストはすべて拒否されます)
- 画像プロキシは `IMAGE_PROXY_HOSTS` に列挙したホスト以外を中継しません
- ソケット・HTTP ともにレート制限があります(詳細は [architecture.md](../development/architecture.md))

## トラブルシュート

| 症状 | 原因と対処 |
|---|---|
| ログインで `Token vault request failed (500)` | backend が起動していない。開発時は Next.js の rewrite 先(`:8000`)が不在だと 500 になる |
| ログインで 403 `Origin not allowed` | アクセス元オリジンが backend の `ALLOWED_ORIGINS` にない(本番は `https://ycord.pages.dev` が必要) |
| `Rate limited` / 429 | ソケット・HTTP のレート制限に達した。しばらく待ってから再試行 |
| ログイン後に画面が真っ暗 / エラー | ブラウザーコンソールを確認。拡張機能による hydration 警告は無害な場合がある |
| Pages / Worker が 500 (error 1101) | `wrangler pages deployment tail` でランタイム例外を確認 |
