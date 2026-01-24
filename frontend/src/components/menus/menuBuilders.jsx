import Symbol from '../common/Symbol';

const TIMEOUT_OPTIONS = [
    [60, '60秒'], [300, '5分'], [600, '10分'], [3600, '1時間'], [86400, '1日'], [604800, '1週間'],
];

const CHANNEL_MUTE_OPTIONS = [
    [900, '15分'],
    [3600, '1時間'],
    [10800, '3時間'],
    [28800, '8時間'],
    [86400, '24時間'],
    [true, '元に戻すまで'],
];

/**
 * ユーザー右クリックメニューの ActionMenu ペイロードを構築
 */
export const buildUserContextMenu = (event, {
    user,
    targetUser,
    member = null,
    relationship = null,
    guildId,
    hasChannel,
    canTimeout,
    canKick,
    canBan,
    openUserPopout,
    socket,
    navigate,
}) => {
    event.preventDefault();
    event.stopPropagation();
    const isSelf = targetUser.id === user?.id;
    const insertMention = () => window.dispatchEvent(new CustomEvent('insert-emoji', { detail: `<@${targetUser.id}> ` }));

    return {
        x: event.clientX,
        y: event.clientY,
        width: 224,
        items: [
            { id: 'profile', label: 'プロフィール', icon: <Symbol size={18}>account_circle</Symbol>, onClick: (e) => openUserPopout(e, targetUser) },
            ...(!isSelf ? [
                { id: 'dm', label: 'メッセージ', icon: <Symbol size={18}>chat</Symbol>, onClick: () => {
                    socket.timeout(15000).emit('createDM', { userId: targetUser.id }, (err, result) => {
                        if (!err && result?.ok && result.channel?.id) navigate(`/@me/${result.channel.id}`);
                    });
                } },
            ] : []),
            ...(hasChannel ? [
                { id: 'mention', label: 'メンション', icon: <Symbol size={18}>alternate_email</Symbol>, onClick: () => insertMention() },
            ] : []),
            { type: 'divider' },
            ...(!isSelf && !targetUser.bot ? [
                { id: 'friend', label: 'フレンド申請', icon: <Symbol size={18}>person_add_alt</Symbol>, onClick: () => socket.timeout(15000).emit('sendFriendRequest', { userId: targetUser.id }) },
            ] : []),
            ...(!isSelf && relationship === 'pending_incoming' ? [
                { id: 'accept-friend', label: 'フレンド申請を承認', icon: <Symbol size={18}>check</Symbol>, onClick: () => socket.timeout(15000).emit('sendFriendRequest', { userId: targetUser.id }) },
                { id: 'reject-friend', label: 'フレンド申請を拒否', icon: <Symbol size={18}>close</Symbol>, onClick: () => socket.timeout(15000).emit('removeRelationship', { userId: targetUser.id }) },
            ] : []),
            ...(!isSelf && relationship === 'pending_outgoing' ? [
                { id: 'cancel-friend', label: 'フレンド申請を取り消し', icon: <Symbol size={18}>undo</Symbol>, onClick: () => socket.timeout(15000).emit('removeRelationship', { userId: targetUser.id }) },
            ] : []),
            ...(!isSelf && relationship === 'friend' ? [
                { id: 'remove-friend', label: 'フレンドを解除', icon: <Symbol size={18}>person_remove</Symbol>, danger: true, onClick: () => socket.timeout(15000).emit('removeRelationship', { userId: targetUser.id }) },
            ] : []),
            ...(!isSelf ? [
                relationship === 'blocked'
                    ? { id: 'unblock', label: 'ブロック解除', icon: <Symbol size={18}>block</Symbol>, onClick: () => socket.timeout(15000).emit('unblockUser', { userId: targetUser.id }) }
                    : { id: 'block', label: 'ブロック', icon: <Symbol size={18}>block</Symbol>, danger: true, onClick: () => socket.timeout(15000).emit('blockUser', { userId: targetUser.id }) },
            ] : []),
            ...(!isSelf && member && (canTimeout || canKick || canBan) ? [{ type: 'divider' }] : []),
            ...(!isSelf && member && canTimeout ? [
                {
                    id: 'timeout',
                    label: 'タイムアウト',
                    icon: <Symbol size={18}>timer</Symbol>,
                    danger: true,
                    items: TIMEOUT_OPTIONS.map(([seconds, label]) => ({
                        id: `timeout-${seconds}`,
                        label,
                        onClick: () => socket.timeout(15000).emit('updateMember', { guildId, userId: targetUser.id, timeout: seconds }),
                    })),
                },
            ] : []),
            ...(!isSelf && member && canKick ? [
                { id: 'kick', label: 'サーバーからキック', icon: <Symbol size={18}>person_remove</Symbol>, danger: true, onClick: () => {
                    if (!window.confirm(`${targetUser.displayName || targetUser.username} をサーバーからキックしますか?`)) return;
                    socket.timeout(15000).emit('kickMember', { guildId, userId: targetUser.id });
                } },
            ] : []),
            ...(!isSelf && member && canBan ? [
                { id: 'ban', label: 'サーバーからBAN', icon: <Symbol size={18}>do_not_disturb_on</Symbol>, danger: true, onClick: () => {
                    if (!window.confirm(`${targetUser.displayName || targetUser.username} をサーバーからBANしますか?`)) return;
                    socket.timeout(15000).emit('banMember', { guildId, userId: targetUser.id });
                } },
            ] : []),
            { type: 'divider' },
            { id: 'copy-id', label: 'ユーザーIDをコピー', icon: <Symbol size={18}>badge</Symbol>, onClick: () => navigator.clipboard?.writeText(targetUser.id) },
        ],
    };
};

/**
 * レール下部の自分アバタークリックメニュー
 */
export const buildSelfMenu = (event, { user, openUserPopout, socket, onOpenSettings }) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const statusDot = (color) => (
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block' }} />
    );

    return {
        x: rect.right + 8,
        y: rect.top,
        width: 224,
        items: [
            { id: 'profile', label: `${user?.displayName || user?.username || 'ユーザー'}`, icon: user?.avatar ? <img src={user.avatar} alt="" width={18} height={18} style={{ borderRadius: '50%', objectFit: 'cover' }} /> : undefined, onClick: (e) => openUserPopout(e, user) },
            { type: 'divider' },
            { id: 'presence-online', label: 'オンライン', icon: statusDot('#23a55a'), onClick: () => socket.emit('setPresence', { status: 'online' }) },
            { id: 'presence-idle', label: '退席中', icon: statusDot('#f0b232'), onClick: () => socket.emit('setPresence', { status: 'idle' }) },
            { id: 'presence-dnd', label: '取り込み中', icon: statusDot('#f23f43'), onClick: () => socket.emit('setPresence', { status: 'dnd' }) },
            { id: 'presence-invisible', label: 'オフライン', icon: statusDot('#80848e'), onClick: () => socket.emit('setPresence', { status: 'invisible' }) },
            { type: 'divider' },
            { id: 'custom-status', label: 'ステータス文言を設定', icon: <Symbol size={18}>edit_note</Symbol>, onClick: () => {
                const text = window.prompt('ステータス文言', user?.customStatus || '');
                if (text !== null) socket.timeout(15000).emit('setCustomStatus', { text: text.trim() });
            } },
            { id: 'user-settings', label: 'ユーザー設定を開く', icon: <Symbol size={18}>settings</Symbol>, onClick: () => onOpenSettings() },
            { id: 'copy-id', label: 'ユーザーIDをコピー', icon: <Symbol size={18}>badge</Symbol>, onClick: () => navigator.clipboard?.writeText(user?.id || '') },
        ],
    };
};

/**
 * チャンネルメニュー (サイドバー/ヘッダー共通)
 */
export const buildChannelContextMenu = (event, channel, {
    guildId,
    socket,
    canCreateInvite,
    canManageChannels,
    openInviteForChannel,
    openUserContextMenu,
    loadGuildSelfSettings,
    guildSelfSettings,
    saveChannelSelfSettings,
    setChannelModal,
    setChannelDeleteTarget,
    onOpenChannelSettings,
}) => {
    event.preventDefault();
    // DM はユーザーメニュー、グループDM はチャンネルメニュー
    if (guildId === '@me' && (channel.type === 'DM' || channel.type === 1)) {
        openUserContextMenu(event, { id: channel.recipientId, displayName: channel.name, username: channel.name }, null);
        return null;
    }
    const isThread = [10, 11, 12].includes(channel.type);
    if (guildId !== '@me') loadGuildSelfSettings(guildId);
    const override = guildSelfSettings[guildId]?.channelOverrides?.[channel.id];
    const channelMuted = Boolean(override?.muted);
    const channelNotify = override?.messageNotifications ?? null;
    const setChannelMute = (mute) => saveChannelSelfSettings(guildId, channel.id, { mute });
    const setChannelNotify = (value) => saveChannelSelfSettings(guildId, channel.id, { messageNotifications: value });

    return {
        x: event.clientX,
        y: event.clientY,
        width: 224,
        items: [
            { id: 'ack', label: '既読にする', icon: <Symbol size={18}>mark_chat_read</Symbol>, onClick: () => socket.emit('ackChannel', { channelId: channel.id }) },
            ...(guildId === '@me' && (channel.type === 'GROUP_DM' || channel.type === 3) ? [
                { type: 'divider' },
                { id: 'leave-group', label: 'グループから退出', icon: <Symbol size={18}>logout</Symbol>, danger: true, onClick: () => socket.emit('leaveGroupDM', { channelId: channel.id }) },
            ] : []),
            ...(canCreateInvite && !isThread ? [
                { id: 'invite', label: '招待を作成', icon: <Symbol size={18}>group_add</Symbol>, onClick: () => openInviteForChannel(channel) },
            ] : []),
            { type: 'divider' },
            ...(guildId !== '@me' ? [
                ...(channelMuted ? [
                    { id: 'unmute-channel', label: 'チャンネルのミュートを解除', icon: <Symbol size={18}>do_not_disturb_off</Symbol>, onClick: () => setChannelMute(false) },
                ] : [
                    {
                        id: 'mute-channel',
                        label: 'チャンネルのミュート',
                        icon: <Symbol size={18}>do_not_disturb_on</Symbol>,
                        items: CHANNEL_MUTE_OPTIONS.map(([value, label]) => ({
                            id: `mute-${value}`,
                            label,
                            onClick: () => setChannelMute(value),
                        })),
                    },
                ]),
                {
                    id: 'channel-notify',
                    label: '通知',
                    icon: <Symbol size={18}>notification_settings</Symbol>,
                    items: [
                        { id: 'notify-default', label: 'サーバーの既定', radio: true, selected: channelNotify === null, onClick: () => setChannelNotify(null) },
                        { id: 'notify-all', label: 'すべてのメッセージ', icon: <Symbol size={18}>notifications_active</Symbol>, radio: true, selected: channelNotify === 1, onClick: () => setChannelNotify(1) },
                        { id: 'notify-mention', label: 'メンションのみ', icon: <Symbol size={18}>alternate_email</Symbol>, radio: true, selected: channelNotify === 0, onClick: () => setChannelNotify(0) },
                        { id: 'notify-none', label: '何も通知しない', icon: <Symbol size={18}>notifications_off</Symbol>, radio: true, selected: channelNotify === 2, onClick: () => setChannelNotify(2) },
                    ],
                },
                { type: 'divider' },
            ] : []),
            ...(canManageChannels ? [
                { id: 'create-channel', label: 'チャンネルを作成', icon: <Symbol size={18}>library_add</Symbol>, onClick: () => setChannelModal({ mode: 'create', defaultParentId: channel.parentId || null }) },
                { id: 'create-category', label: 'カテゴリを作成', icon: <Symbol size={18}>library_add</Symbol>, onClick: () => setChannelModal({ mode: 'create', type: 'category' }) },
                { id: 'settings', label: 'チャンネル設定を開く', icon: <Symbol size={18}>settings</Symbol>, onClick: () => onOpenChannelSettings(channel) },
                { id: 'delete', label: 'チャンネルを削除', icon: <Symbol size={18}>delete</Symbol>, danger: true, onClick: () => setChannelDeleteTarget(channel) },
                { type: 'divider' },
            ] : []),
            { id: 'copy-link', label: 'リンクをコピー', icon: <Symbol size={18}>share</Symbol>, onClick: () => navigator.clipboard?.writeText(`https://discord.com/channels/${guildId === '@me' ? '@me' : guildId}/${channel.id}`) },
            { id: 'copy-id', label: 'チャンネルIDをコピー', icon: <Symbol size={18}>badge</Symbol>, onClick: () => navigator.clipboard?.writeText(channel.id) },
        ],
    };
};
