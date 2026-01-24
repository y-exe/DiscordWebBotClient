/**
 * Discord 権限カタログ(カテゴリ別、Stoatエディタと同じ row 形式)。
 * ビット値は 2^53 を超えるため BigInt で扱う。
 */

export const PERMISSION_CATEGORIES = [
    {
        key: 'general',
        title: '一般のチャンネル権限',
        items: [
            { key: 'VIEW_CHANNEL', label: 'チャンネルを見る', description: 'チャンネルを読むことができます', bit: 1n << 10n },
            { key: 'MANAGE_CHANNELS', label: 'チャンネルを管理', description: 'チャンネルの作成・編集・削除ができます', bit: 1n << 4n },
            { key: 'MANAGE_ROLES', label: '役職を管理', description: '役職を作成・編集・削除できます', bit: 1n << 28n },
            { key: 'MANAGE_WEBHOOKS', label: 'ウェブフックを管理', description: 'ウェブフックを作成・編集・削除できます', bit: 1n << 29n },
            { key: 'MANAGE_EXPRESSIONS', label: '絵文字とスタンプを管理', description: '絵文字とスタンプを編集・削除できます', bit: 1n << 30n },
            { key: 'VIEW_AUDIT_LOG', label: '監査ログを表示', description: 'サーバーの監査ログを閲覧できます', bit: 1n << 7n },
        ],
    },
    {
        key: 'membership',
        title: 'メンバーシップ権限',
        items: [
            { key: 'CREATE_INVITE', label: '招待を作成', description: 'サーバーへの招待を作成できます', bit: 1n << 0n },
            { key: 'KICK_MEMBERS', label: 'メンバーをキック', description: 'メンバーをサーバーからキックできます', bit: 1n << 1n },
            { key: 'BAN_MEMBERS', label: 'メンバーをBAN', description: 'メンバーをサーバーからBANできます', bit: 1n << 2n },
            { key: 'MODERATE_MEMBERS', label: 'メンバーをタイムアウト', description: 'メンバーが操作できないよう一時的に制限できます', bit: 1n << 40n },
            { key: 'CHANGE_NICKNAME', label: 'ニックネームの変更', description: '自分のニックネームを変更できます', bit: 1n << 26n },
            { key: 'MANAGE_NICKNAMES', label: 'ニックネームの管理', description: '他のメンバーのニックネームを変更できます', bit: 1n << 27n },
        ],
    },
    {
        key: 'text',
        title: 'テキストチャンネルの権限',
        items: [
            { key: 'SEND_MESSAGES', label: 'メッセージを送信', description: 'チャンネルにメッセージを送信できます', bit: 1n << 11n },
            { key: 'SEND_MESSAGES_IN_THREADS', label: 'スレッドでメッセージを送信', description: 'スレッド内にメッセージを送信できます', bit: 1n << 38n },
            { key: 'CREATE_PUBLIC_THREADS', label: '公開スレッドを作成', description: '公開スレッドを作成できます', bit: 1n << 35n },
            { key: 'CREATE_PRIVATE_THREADS', label: '非公開スレッドを作成', description: '非公開スレッドを作成できます', bit: 1n << 36n },
            { key: 'MANAGE_THREADS', label: 'スレッドを管理', description: 'スレッドを削除・管理できます', bit: 1n << 34n },
            { key: 'EMBED_LINKS', label: 'リンクを埋め込む', description: '送信したリンクを埋め込みます', bit: 1n << 14n },
            { key: 'ATTACH_FILES', label: 'ファイルを添付', description: 'メッセージにファイルを添付できます', bit: 1n << 15n },
            { key: 'ADD_REACTIONS', label: 'リアクションを追加', description: 'メッセージに新しいリアクションを追加できます', bit: 1n << 6n },
            { key: 'USE_EXTERNAL_EMOJIS', label: '外部の絵文字の使用', description: '別サーバーの絵文字を使用できます', bit: 1n << 18n },
            { key: 'USE_EXTERNAL_STICKERS', label: '外部のスタンプの使用', description: '別サーバーのスタンプを使用できます', bit: 1n << 37n },
            { key: 'MENTION_EVERYONE', label: 'メンション全員', description: '@everyone、@here、全ての役職をメンションできます', bit: 1n << 17n },
            { key: 'MANAGE_MESSAGES', label: 'メッセージの管理', description: '他のユーザーのメッセージを削除・ピン留めできます', bit: 1n << 13n },
            { key: 'READ_MESSAGE_HISTORY', label: 'メッセージ履歴の閲覧', description: '過去のメッセージを読むことができます', bit: 1n << 16n },
            { key: 'SEND_TTS_MESSAGES', label: 'TTSメッセージの送信', description: '音声読み上げされるメッセージを送信できます', bit: 1n << 12n },
            { key: 'USE_APPLICATION_COMMANDS', label: 'アプリコマンドの使用', description: 'スラッシュコマンドを使用できます', bit: 1n << 31n },
            { key: 'CREATE_POLLS', label: '投票の作成', description: '投票を作成できます', bit: 1n << 49n },
        ],
    },
    {
        key: 'voice',
        title: 'ボイスチャンネルの権限',
        items: [
            { key: 'CONNECT', label: '接続', description: 'ボイスチャンネルに接続できます', bit: 1n << 20n },
            { key: 'SPEAK', label: '発言', description: 'ボイスチャンネルで話すことができます', bit: 1n << 21n },
            { key: 'STREAM', label: '映像', description: 'カメラや画面共有を配信できます', bit: 1n << 9n },
            { key: 'MUTE_MEMBERS', label: 'メンバーのミュート', description: 'ボイスチャンネルでメンバーをミュートできます', bit: 1n << 22n },
            { key: 'DEAFEN_MEMBERS', label: 'メンバーのスピーカーミュート', description: 'メンバーの聞き取りを無効化できます', bit: 1n << 23n },
            { key: 'MOVE_MEMBERS', label: 'メンバーの移動', description: 'メンバーを別のボイスチャンネルへ移動できます', bit: 1n << 24n },
            { key: 'USE_VAD', label: '音声検出の使用', description: '音声検出を使用して発言できます', bit: 1n << 25n },
            { key: 'PRIORITY_SPEAKER', label: '優先スピーカー', description: '他の人の声より優先して再生されます', bit: 1n << 8n },
            { key: 'USE_SOUNDBOARD', label: 'サウンドボードの使用', description: 'ボイスチャンネルでサウンドを再生できます', bit: 1n << 42n },
            { key: 'USE_EXTERNAL_SOUNDS', label: '外部のサウンドの使用', description: '別サーバーのサウンドを使用できます', bit: 1n << 45n },
        ],
    },
];

/** 全権限フラットリスト */
export const ALL_PERMISSIONS = PERMISSION_CATEGORIES.flatMap((category) =>
    category.items.map((item) => ({ ...item, category: category.title })),
);

/** ビット値からラベルを引く(BigInt) */
const BIT_TO_LABEL = new Map(ALL_PERMISSIONS.map((item) => [item.bit, item.label]));

export const permissionLabel = (bit) => BIT_TO_LABEL.get(bit) ?? `権限 ${bit}`;
