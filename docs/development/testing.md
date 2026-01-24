# テストと開発手順

## 検証コマンド

| コマンド | 内容 |
|---|---|
| `bun run lint` | Biome による lint(リポジトリ全体) |
| `bun run lint:react` | フロントエンドの ESLint(React hooks ルール含む) |
| `bun run test` | バックエンドのセキュリティテスト(`backend/tests/`、Hono ルートとレート制限) |
| `bun run check` | lint + テストの実行 |
| `bun run build` | フロントエンドの本番ビルド |
| `bun run format` | Biome による整形 |

## 開発時の確認サイクル

1. `bun run lint:react`(フロントエンド)/ `bun run test`(バックエンド)
2. `bun run build` でビルドが通ることを確認
3. `bun run dev` で実画面確認(`/login` からトークンでログイン)

バックエンドのみの変更は `node --check <file>` で構文確認後、backend を起動して
`[System] Backend listening on port 8000` が出ることを確認してください。

## 知っておくと良い注意点

- フロントエンドの ESLint 設定は `no-undef` を有効にしていても **JSX タグ名は検査しません**。
  コンポーネント分割時は import の付け忘れに注意してください
- 設定画面の `CategoryButton` は `<div role="button">` で実装されています。
  children にフォーム部品を含められますが、ネイティブ `<button>` の入れ子は不可です
- `frontend/src/styles/discord-tokens.css` は自動生成物です(再生成は `bun run tokens`)
- `Date.now()` など非純粋な呼び出しはイベントハンドラ / updater 内でのみ使用してください(React の純粋性ルール)
