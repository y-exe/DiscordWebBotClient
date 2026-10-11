<div align="center">
<h1>
  Discord Web Token Client
  
  [![discord.js-selfbot](https://img.shields.io/badge/discord.js--selfbot-5865F2?style=flat-square&logo=discord&logoColor=white)](https://github.com/youtsuhodev/discord.js-selfbot-youtsuho-v13)
  [![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![Hono](https://img.shields.io/badge/Hono-ff6000?style=flat-square&logo=hono&logoColor=white)](https://hono.dev/)
  [![Licence GPL v3](https://img.shields.io/badge/Licence-GPL%20v3-green.svg?style=flat-square)](LICENSE)
</h1>
Socket.io と discord.js-selfbot を使用した、WEB 上のオリジナル Discord クライアント!<br>
Bot トークンおよびユーザー個人トークンにも一応対応しています。<br>
<br>

<table>
  <tr>
    <td align="center" width="50%">
      <img src="public/1.png" alt="ログイン画面">
      <br>
      <sub>ログイン画面</sub>
    </td>
    <td align="center" width="50%">
      <img src="public/2.png" alt="アプリ画面(Web)">
      <br>
      <sub>アプリ画面(Web)</sub>
    </td>
  </tr>
</table>
</div>
<br/>

## なんのためにつくった...?

フィルタリング回避が主な目的ではあるが、  
ついでに超重いWeb版Discordをどうにかしたかったのと、Web版でBotClientを使えるようにしたかった等...  
基本使う必要ないサイトだと思います。自分用。


## 特徴など...

- **高速・軽量**: Socket.io によるリアルタイム通信
- **マルチデバイス**: PC およびスマホ表示対応
- **多機能対応**: DM/グループDM/フォーラム/スレッド 等にも対応
- **メッセージ操作**: 返信、リアクションなどに対応

- **非対応**: VC/コマンド等は今後対応予定... 私用サイトですがよければPullください


## ディレクトリ構造

```
/frontend  Next.js + Tailwind CSS (ほぼMaterial3Expressive)
/backend   Node.js + Hono + Socket.io
```

## 免責事項

このプロジェクトにはセルフボットを利用しております。
> [!WARNING]
> 本プロジェクトでユーザー名義のトークンを使用することは、Discord 公式のサービス利用規約に違反する可能性があります。
> 本サービスの利用によりアカウントが停止、削除、または制限された場合でも、開発者は一切の責任を負いません。
> すべて自己責任において利用してください。

## ライセンス

[GPL-3.0](LICENSE)  

---
© 2026 yexe.xyz

## 開発ツール

`bun install --frozen-lockfile` をリポジトリのルートで実行します。ルートのBunワークスペースとTurborepoで各パッケージのタスクを実行します。ルートの `bun.lock` は開発・CI用、子ディレクトリのロックファイルは独立したDocker/Cloudflareビルド用です。依存変更時は両方を更新してください。

- `bun run lint`: Biomeで構文と初期導入の正確性ルールを検査。
- `bun run format`: Biomeで整形。
- `bun run format:check`: 整形差分を確認。既存コードの一括整形は行わず、編集時に適用します。
- `bun run check`: Biome・バックエンドのセキュリティテスト。型付きコードのないプロジェクトなので型検査タスクは用意しません。
- `bun run build`: Next.jsビルド。
- `bun run dev`: 各devスクリプトを同時実行。常駐処理はキャッシュしません。

Biomeは既存ESLintのReact専用ルールと併用します。初期ルールは実行上の誤りを対象とし、推奨ルール全体への拡張は別途行います。生成物・公開アセット・結果スナップショットは対象外です。CIではlintを必須とし、既存の整形差分はブロックしません。

Next.jsはビルド時の環境変数や外部APIに依存するため、初期導入ではビルドキャッシュを無効にしています。Cloudflareのbuild/preview/deploy、DBマイグレーション、Botのbackfillはルートタスクに含めません。既存の子ディレクトリから明示的に実行してください。


Next.jsのdev/build/startは `bun --bun next` でBunランタイムを明示します。OpenNext/Wranglerは従来の実行方式を維持します。Cloudflare上の実行環境はWorkersです。Bun 1.3.14を開発・CIで固定し、Node.jsもOpenNext/Wrangler互換用に用意します。速度改善率は環境依存のため、導入だけで数値を保証しません。

Cloudflareなどで子ディレクトリを独立してnpmインストールする場合は、そのディレクトリで `npm ci --workspaces=false` を使います。リポジトリ全体の開発・CIではルートのBunワークスペースを使います。
