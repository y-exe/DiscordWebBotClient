# アーキテクチャ

```
Browser
   │  HTTP / WebSocket
   ▼
ycord.pages.dev (Cloudflare Pages / Next.js)
   │  /api/*  /socket.io/*
   ▼
materialcord.yexe.workers.dev (Workers プロキシ: backend を隠蔽)
   │
   ▼
dapi.yexe.xyz (VPS nginx → k3s materialcord / Hono :8000)
   │  REST / Gateway (discord.js-selfbot / discord.js)
   ▼
Discord API
```

開発時は Pages / プロキシを経由せず、frontend (`:5173`) が Next.js の rewrite で
直接 backend (`:8000`) に接続します。

## バックエンド (`backend/`)

| ファイル / ディレクトリ | 責務 |
|---|---|
| `server.js` | Hono アプリの起動。secureHeaders、CORS、Socket.IO の接続 |
| `src/config.js` | ポート、許可オリジン、Cookie 名(5 スロット + pending)、各種上限値 |
| `src/routes/auth.js` | トークンボルト。トークンを HttpOnly Cookie に保存(pending → commit の 2 段階) |
| `src/routes/proxy.js` | 画像プロキシ(`IMAGE_PROXY_HOSTS` のみ中継) |
| `src/socket/index.js` | 接続ミドルウェア(接続回数 / イベントごとのレート制限)、login、セッション管理 |
| `src/socket/baseHandlers.js` | 主要イベント(getGuilds、getMessages、sendMessage、リアクション、スラッシュコマンド、interaction) |
| `src/socket/handlers/` | 機能別ハンドラ(channels / guilds / guildMembers / guildInvites / guildRoles / guildExpressions / messages / users) |
| `src/socket/discordEvents.js` | Discord Gateway イベント → Socket.IO への中継(messageCreate / typingStart / roleUpdate など) |
| `src/services/session.js` | ログイン中の Discord クライアント(Bot / セルフボット)の保持と破棄 |
| `src/services/formatter.js` | Discord API のデータをフロントエンド用に整形 |
| `src/services/discord.js` | DM / フレンド / チャンネル一覧の取得ヘルパー |

### ログインの流れ

1. ブラウザーが `POST /api/auth/pending` でトークンを送信 → pending Cookie に保存
2. Socket.IO で `login` イベント → クライアントが Discord Gateway に接続
3. ready になると `login-success` を返し、pending Cookie をアカウントスロットに commit
4. 切断時は `destroySession` でクライアントを破棄

## フロントエンド (`frontend/`)

| ディレクトリ | 責務 |
|---|---|
| `src/app/` | ルート(`/login`、`/@me`、`/[guildId]/[channelId]`) |
| `src/components/DiscordClient.jsx` | 中央ハブ。state と socket イベントハンドラを集約 |
| `src/components/chat/` | メッセージ表示、入力、ピッカー、コンテキストメニュー |
| `src/components/overlays/` | モーダル / メニュー / ポップアウトの集約(DiscordOverlays) |
| `src/components/menus/` | 右クリックメニューの items 構築 |
| `src/components/settings/` | 設定画面。`ui.jsx` に共通プリミティド(CategoryButton など) |
| `src/utils/tokenVault.js` | トークンボルト API クライアント、アカウント履歴 |
| `src/styles/discord-tokens.css` | Discord 公開 CSS から生成したデザイントークン(自動生成) |

UI は for-web(Stoat)のデザインに準拠しつつ、機能は Discord のもののみを実装しています。
Material You のトーナルパレットでテーマ / アクセントを生成しています。
