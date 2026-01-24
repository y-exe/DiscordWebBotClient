// チャット表示用の共通定数/ユーティリティ

export const isReadableChannel = (channel) => !['GUILD_VOICE', 'GUILD_STAGE_VOICE', 2, 13].includes(channel.type);

export const lastChannelKey = (guildId) => `discord-last-channel:${guildId}`;

const DATE_LABEL_FORMAT = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
export const formatDateDivider = (timestamp) => DATE_LABEL_FORMAT.format(timestamp);

export const SYSTEM_MESSAGE_ICONS = {
    1: { icon: 'add', color: 'primary' },
    2: { icon: 'remove', color: 'error' },
    3: { icon: 'call', color: 'primary' },
    4: { icon: 'sell', color: 'primary' },
    5: { icon: 'image', color: 'primary' },
    6: { icon: 'keep', color: 'primary' },
    7: { icon: 'arrow_right_alt', color: 'primary' },
    8: { icon: 'rocket_launch', color: 'primary' },
    9: { icon: 'rocket_launch', color: 'primary' },
    10: { icon: 'rocket_launch', color: 'primary' },
    11: { icon: 'rocket_launch', color: 'primary' },
    12: { icon: 'rss_feed', color: 'primary' },
    18: { icon: 'forum', color: 'primary' },
    21: { icon: 'forum', color: 'primary' },
    24: { icon: 'shield', color: 'error' },
};

export const systemMessageText = (m) => {
    const authorName = m.author?.displayName || m.author?.username || '不明なユーザー';
    const mentionName = m.mentions?.mentionUsers?.[0]?.name || 'メンバー';
    switch (m.type) {
        case 1: return `${authorName} が ${mentionName} を追加しました`;
        case 2: return `${authorName} が ${mentionName} を削除しました`;
        case 3: return `${authorName} が通話を開始しました`;
        case 4: return `${authorName} がチャンネル名を ${m.content} に変更しました`;
        case 5: return `${authorName} がチャンネルアイコンを変更しました`;
        case 6: return `${authorName} がメッセージをピン留めしました`;
        case 7: return `${authorName} がサーバーに参加しました`;
        case 8: return `${authorName} がサーバーをブーストしました`;
        case 9: return `${authorName} がサーバーをブーストしました(レベル1に到達)`;
        case 10: return `${authorName} がサーバーをブーストしました(レベル2に到達)`;
        case 11: return `${authorName} がサーバーをブーストしました(レベル3に到達)`;
        case 12: return `${authorName} がこのチャンネルをフォローしました`;
        case 18: return `${authorName} がスレッドを開始しました: ${m.content}`;
        case 21: return 'スレッドの開始メッセージ';
        case 24: return `${authorName} のメッセージが自動モデレーションによってブロックされました`;
        default: return null;
    }
};
